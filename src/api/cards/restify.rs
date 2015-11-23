extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate rustc_serialize;

use iron::status;
use iron::prelude::*;
use router::Router;
use urlencoded::{UrlEncodedQuery, QueryMap, UrlDecodingError};
use rustc_serialize::json;

use std::sync::Arc;
use std::ops::Deref;
use std::error::Error;

use ::api::{GrokDB, ErrorResponse};
use ::api::cards::{CreateCard, UpdateCard, CardResponse, CardsPageRequest, SortBy, SortOrder};
use ::api::decks::restify::deck_exists;
use ::api::stashes::restify::stash_exists;
use ::database::QueryError;


// attach cards REST endpoints to given router
pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);

    router.get("/cards/:card_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            // fetch and parse requested card id

            let card_id = req.extensions.get::<Router>().unwrap().find("card_id").unwrap();

            let card_id: i64 = match card_id.parse::<u64>() {
                Ok(card_id) => card_id as i64,
                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            return get_card_by_id(grokdb.clone(), card_id);
        }
    });

    router.delete("/cards/:card_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            // fetch and parse requested card id

            let card_id = req.extensions.get::<Router>().unwrap().find("card_id").unwrap();

            let card_id: i64 = match card_id.parse::<u64>() {
                Ok(card_id) => card_id as i64,
                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            // delete card

            match grokdb.cards.delete(card_id) {
                Err(why) => {
                    // why: QueryError
                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },
                _ => {/* card sucessfully deleted */},
            };

            return Ok(Response::with((status::Ok)));
        }
    });

    router.post("/cards", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            // parse json

            let create_card_request = req.get::<bodyparser::Struct<CreateCard>>();

            let create_card_request: CreateCard = match create_card_request {

                Ok(Some(create_card_request)) => {

                    let create_card_request: CreateCard = create_card_request;

                    // ensure deck exists; otherwise bail early
                    match deck_exists(grokdb, create_card_request.deck) {
                        Err(response) => {
                            return response;
                        },
                        _ => {/* noop; continue */}
                    }
                    create_card_request
                },

                Ok(None) => {

                    let reason = "no JSON given";
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: reason,
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },

                Err(err) => {

                    let ref reason = format!("{:?}", err);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: err.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            // ensure card title is non-empty string
            let mut create_card_request = create_card_request;
            create_card_request.title = create_card_request.title.trim().to_string();

            if create_card_request.title.len() <= 0 {
                let ref reason = format!("card title should be non-empty string");
                let res_code = status::BadRequest;

                let err_response = ErrorResponse {
                    status: res_code,
                    developerMessage: reason,
                    userMessage: reason,
                }.to_json();

                return Ok(Response::with((res_code, err_response)));
            }

            let create_card_request = create_card_request;

            // create card

            let card_id: i64 = match grokdb.cards.create(&create_card_request) {
                Err(why) => {
                    // why: QueryError
                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },
                Ok(card_id) => {
                    // card_id: i64
                    /* card sucessfully created */
                    card_id
                },
            };

            return get_card_by_id(grokdb.clone(), card_id);
        }
    });

    router.patch("/cards/:card_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            let update_card_request = req.get::<bodyparser::Struct<UpdateCard>>();

            // fetch and parse requested card id

            let card_id: &str = req.extensions.get::<Router>().unwrap().find("card_id").unwrap();

            let card_id: i64 = match card_id.parse::<u64>() {
                Ok(card_id) => card_id as i64,
                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            // parse card patch request

            let ref update_card_request: UpdateCard = match update_card_request {

                Ok(Some(update_card_request)) => {
                    let update_card_request: UpdateCard = update_card_request;
                    update_card_request
                },

                Ok(None) => {

                    let reason = "no JSON given";
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: reason,
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },

                Err(err) => {

                    let ref reason = format!("{:?}", err);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: err.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            // ensure there is at least one attribute to update
            if !update_card_request.should_update() {

                let ref reason = format!("Invalid card update request.");
                let res_code = status::BadRequest;

                let err_response = ErrorResponse {
                    status: res_code,
                    developerMessage: reason,
                    userMessage: reason,
                }.to_json();

                return Ok(Response::with((res_code, err_response)));
            }

            // ensure card to be updated exists
            match card_exists(grokdb, card_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* updating card exists; continue */}
            }

            // if card is to be moved to a new deck, check if deck exists
            match update_card_request.deck {
                Some(new_deck_id) => {

                    match deck_exists(grokdb, new_deck_id) {
                        Err(response) => {
                            return response;
                        },
                        _ => {/* noop */}
                    }
                },
                _ => {/* noop; continue */}
            }

            // update card
            match grokdb.cards.update(card_id, update_card_request) {
                Err(why) => {
                    // why: QueryError

                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },
                _ => {/* card updated */}
            }

            return get_card_by_id(grokdb.clone(), card_id);
        }
    });

    router.get("/decks/:deck_id/cards", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            let page_query: CardsPageRequest = match req.get_ref::<UrlEncodedQuery>() {
                Ok(ref hashmap) => {
                    let hashmap: &QueryMap = hashmap;

                    let page: i64 = match hashmap.contains_key("page") {
                        true => {
                            let maybe_page: &Vec<String> = hashmap.get("page").unwrap();

                            if maybe_page.len() <= 0 {
                                1
                            } else {

                                let ref page: String = maybe_page[0];

                                match page.parse::<i64>() {
                                    Ok(page) => {
                                        let page: i64 = page;

                                        if page <= 0 {
                                            let ref reason = format!("page query should be at least 1");
                                            let res_code = status::BadRequest;

                                            let err_response = ErrorResponse {
                                                status: res_code,
                                                developerMessage: reason,
                                                userMessage: reason,
                                            }.to_json();

                                            return Ok(Response::with((res_code, err_response)));
                                        }

                                        page
                                    },
                                    Err(why) => {
                                        let ref reason = format!("invalid page query");
                                        let res_code = status::BadRequest;

                                        let err_response = ErrorResponse {
                                            status: res_code,
                                            developerMessage: why.description(),
                                            userMessage: reason,
                                        }.to_json();

                                        return Ok(Response::with((res_code, err_response)));
                                    }
                                }
                            }
                        },
                        _ => 1
                    };

                    let per_page: i64 = match hashmap.contains_key("per_page") {
                        true => {
                            let maybe_per_page: &Vec<String> = hashmap.get("per_page").unwrap();

                            if maybe_per_page.len() <= 0 {
                                25
                            } else {

                                let ref per_page: String = maybe_per_page[0];

                                match per_page.parse::<i64>() {
                                    Ok(per_page) => {
                                        let per_page: i64 = per_page;

                                        if per_page <= 0 {
                                            let ref reason = format!("per_page query should be at least 1");
                                            let res_code = status::BadRequest;

                                            let err_response = ErrorResponse {
                                                status: res_code,
                                                developerMessage: reason,
                                                userMessage: reason,
                                            }.to_json();

                                            return Ok(Response::with((res_code, err_response)));
                                        }

                                        per_page
                                    },
                                    Err(why) => {
                                        let ref reason = format!("invalid per_page query");
                                        let res_code = status::BadRequest;

                                        let err_response = ErrorResponse {
                                            status: res_code,
                                            developerMessage: why.description(),
                                            userMessage: reason,
                                        }.to_json();

                                        return Ok(Response::with((res_code, err_response)));
                                    }
                                }
                            }
                        },
                        _ => 25
                    };

                    let sort_by: SortBy = match hashmap.contains_key("sort_by") {
                        true => {
                            let maybe_sort_by: &Vec<String> = hashmap.get("sort_by").unwrap();

                            if maybe_sort_by.len() <= 0 {
                                SortBy::UpdatedAt
                            } else {

                                let ref sort_by: String = maybe_sort_by[0];

                                match sort_by.to_lowercase().as_ref() {
                                    "created_at" => SortBy::CreatedAt,
                                    "updated_at" => SortBy::UpdatedAt,
                                    "title" => SortBy::Title,
                                    "reviewed_date" => SortBy::ReviewedDate,
                                    "times_reviewed" => SortBy::TimesReviewed,
                                    // "raw_score" => SortBy::RawScore,
                                    _ => SortBy::UpdatedAt
                                }
                            }
                        },
                        _ => SortBy::UpdatedAt
                    };

                    let order: SortOrder = match hashmap.contains_key("ordery_by") {
                        true => {
                            let maybe_order_by: &Vec<String> = hashmap.get("order_by").unwrap();

                            if maybe_order_by.len() <= 0 {
                                SortOrder::Descending
                            } else {

                                let ref order_by: String = maybe_order_by[0];

                                match order_by.to_lowercase().as_ref() {
                                    "desc" => SortOrder::Descending,
                                    "descending" => SortOrder::Descending,
                                    "asc" => SortOrder::Ascending,
                                    "ascending" => SortOrder::Ascending,
                                    _ => SortOrder::Descending
                                }
                            }
                        },
                        _ => SortOrder::Descending
                    };

                    let offset: i64 = (page - 1) * per_page;

                    CardsPageRequest {
                        offset: offset,
                        per_page: per_page,
                        sort_by: sort_by,
                        order: order
                    }
                },

                Err(UrlDecodingError::EmptyQuery) => {
                    CardsPageRequest {
                        offset: 0,
                        per_page: 25,
                        sort_by: SortBy::UpdatedAt,
                        order: SortOrder::Descending
                    }
                },

                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            // fetch and parse requested deck id

            let deck_id = req.extensions.get::<Router>().unwrap().find("deck_id").unwrap();

            let deck_id: i64 = match deck_id.parse::<u64>() {
                Ok(deck_id) => deck_id as i64,
                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            // ensure deck exists; otherwise bail early
            match deck_exists(grokdb, deck_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* noop; continue */}
            }

            match grokdb.cards.count_by_deck(deck_id) {
                Err(why) => {
                    // why: QueryError

                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },

                Ok(count) => {

                    if count <= 0 {
                        let ref v: Vec<CardResponse> = vec![];
                        let response: String = json::encode(v).unwrap();
                        return Ok(Response::with((status::Ok, response)));
                    }

                    if page_query.offset >= count {
                        let ref reason = format!("page out of bounds");
                        let res_code = status::BadRequest;

                        let err_response = ErrorResponse {
                            status: res_code,
                            developerMessage: reason,
                            userMessage: reason,
                        }.to_json();

                        return Ok(Response::with((res_code, err_response)));
                    }
                }
            }

            let response: String = match grokdb.cards.get_by_deck(deck_id, page_query) {
                Err(why) => {
                    // why: QueryError

                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },

                Ok(list) => {

                    let mut collected_list: Vec<CardResponse> = vec![];

                    for card_id in &list {

                        let card_id: i64 = *card_id;

                        let maybe_card: Result<CardResponse, QueryError> = grokdb.cards.get_response(grokdb, card_id);

                        let card: CardResponse = match maybe_card {

                            Err(why) => {
                                // why: QueryError

                                let ref reason = format!("{:?}", why);
                                let res_code = status::NotFound;

                                let err_response = ErrorResponse {
                                    status: res_code,
                                    developerMessage: reason,
                                    userMessage: why.description(),
                                }.to_json();

                                return Ok(Response::with((res_code, err_response)));
                            },

                            Ok(card) => card,
                        };

                        collected_list.push(card);
                    }

                    let ref collected_list = collected_list;

                    json::encode(collected_list).unwrap()
                }
            };

            return Ok(Response::with((status::Ok, response)));
        }
    });

    // get list of cards in a stash
    router.get("/stashes/:stash_id/cards", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            let page_query: CardsPageRequest = match req.get_ref::<UrlEncodedQuery>() {
                Ok(ref hashmap) => {
                    let hashmap: &QueryMap = hashmap;

                    let page: i64 = match hashmap.contains_key("page") {
                        true => {
                            let maybe_page: &Vec<String> = hashmap.get("page").unwrap();

                            if maybe_page.len() <= 0 {
                                1
                            } else {

                                let ref page: String = maybe_page[0];

                                match page.parse::<i64>() {
                                    Ok(page) => {
                                        let page: i64 = page;

                                        if page <= 0 {
                                            let ref reason = format!("page query should be at least 1");
                                            let res_code = status::BadRequest;

                                            let err_response = ErrorResponse {
                                                status: res_code,
                                                developerMessage: reason,
                                                userMessage: reason,
                                            }.to_json();

                                            return Ok(Response::with((res_code, err_response)));
                                        }

                                        page
                                    },
                                    Err(why) => {
                                        let ref reason = format!("invalid page query");
                                        let res_code = status::BadRequest;

                                        let err_response = ErrorResponse {
                                            status: res_code,
                                            developerMessage: why.description(),
                                            userMessage: reason,
                                        }.to_json();

                                        return Ok(Response::with((res_code, err_response)));
                                    }
                                }
                            }
                        },
                        _ => 1
                    };

                    let per_page: i64 = match hashmap.contains_key("per_page") {
                        true => {
                            let maybe_per_page: &Vec<String> = hashmap.get("per_page").unwrap();

                            if maybe_per_page.len() <= 0 {
                                25
                            } else {

                                let ref per_page: String = maybe_per_page[0];

                                match per_page.parse::<i64>() {
                                    Ok(per_page) => {
                                        let per_page: i64 = per_page;

                                        if per_page <= 0 {
                                            let ref reason = format!("per_page query should be at least 1");
                                            let res_code = status::BadRequest;

                                            let err_response = ErrorResponse {
                                                status: res_code,
                                                developerMessage: reason,
                                                userMessage: reason,
                                            }.to_json();

                                            return Ok(Response::with((res_code, err_response)));
                                        }

                                        per_page
                                    },
                                    Err(why) => {
                                        let ref reason = format!("invalid per_page query");
                                        let res_code = status::BadRequest;

                                        let err_response = ErrorResponse {
                                            status: res_code,
                                            developerMessage: why.description(),
                                            userMessage: reason,
                                        }.to_json();

                                        return Ok(Response::with((res_code, err_response)));
                                    }
                                }
                            }
                        },
                        _ => 25
                    };

                    let sort_by: SortBy = match hashmap.contains_key("sort_by") {
                        true => {
                            let maybe_sort_by: &Vec<String> = hashmap.get("sort_by").unwrap();

                            if maybe_sort_by.len() <= 0 {
                                SortBy::UpdatedAt
                            } else {

                                let ref sort_by: String = maybe_sort_by[0];

                                match sort_by.to_lowercase().as_ref() {
                                    "created_at" => SortBy::CreatedAt,
                                    "updated_at" => SortBy::UpdatedAt,
                                    "title" => SortBy::Title,
                                    "reviewed_date" => SortBy::ReviewedDate,
                                    "times_reviewed" => SortBy::TimesReviewed,
                                    // "raw_score" => SortBy::RawScore,
                                    _ => SortBy::UpdatedAt
                                }
                            }
                        },
                        _ => SortBy::UpdatedAt
                    };

                    let order: SortOrder = match hashmap.contains_key("ordery_by") {
                        true => {
                            let maybe_order_by: &Vec<String> = hashmap.get("order_by").unwrap();

                            if maybe_order_by.len() <= 0 {
                                SortOrder::Descending
                            } else {

                                let ref order_by: String = maybe_order_by[0];

                                match order_by.to_lowercase().as_ref() {
                                    "desc" => SortOrder::Descending,
                                    "descending" => SortOrder::Descending,
                                    "asc" => SortOrder::Ascending,
                                    "ascending" => SortOrder::Ascending,
                                    _ => SortOrder::Descending
                                }
                            }
                        },
                        _ => SortOrder::Descending
                    };

                    let offset: i64 = (page - 1) * per_page;

                    CardsPageRequest {
                        offset: offset,
                        per_page: per_page,
                        sort_by: sort_by,
                        order: order
                    }
                },

                Err(UrlDecodingError::EmptyQuery) => {
                    CardsPageRequest {
                        offset: 0,
                        per_page: 25,
                        sort_by: SortBy::UpdatedAt,
                        order: SortOrder::Descending
                    }
                },

                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            // fetch and parse requested stash id

            let stash_id = req.extensions.get::<Router>().unwrap().find("stash_id").unwrap();

            let stash_id: i64 = match stash_id.parse::<u64>() {
                Ok(stash_id) => stash_id as i64,
                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            // ensure stash exists
            match stash_exists(grokdb, stash_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* stash exists; continue */}
            }

            match grokdb.cards.count_by_stash(stash_id) {
                Err(why) => {
                    // why: QueryError

                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },

                Ok(count) => {

                    if count <= 0 {
                        let ref v: Vec<CardResponse> = vec![];
                        let response: String = json::encode(v).unwrap();
                        return Ok(Response::with((status::Ok, response)));
                    }

                    if page_query.offset >= count {
                        let ref reason = format!("page out of bounds");
                        let res_code = status::BadRequest;

                        let err_response = ErrorResponse {
                            status: res_code,
                            developerMessage: reason,
                            userMessage: reason,
                        }.to_json();

                        return Ok(Response::with((res_code, err_response)));
                    }
                }
            }

            let response: String = match grokdb.cards.get_by_stash(stash_id, page_query) {
                Err(why) => {
                    // why: QueryError

                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },

                Ok(list) => {

                    let mut collected_list: Vec<CardResponse> = vec![];

                    for card_id in &list {

                        let card_id: i64 = *card_id;

                        let maybe_card: Result<CardResponse, QueryError> = grokdb.cards.get_response(grokdb, card_id);

                        let card: CardResponse = match maybe_card {

                            Err(why) => {
                                // why: QueryError

                                let ref reason = format!("{:?}", why);
                                let res_code = status::NotFound;

                                let err_response = ErrorResponse {
                                    status: res_code,
                                    developerMessage: reason,
                                    userMessage: why.description(),
                                }.to_json();

                                return Ok(Response::with((res_code, err_response)));
                            },

                            Ok(card) => card,
                        };

                        collected_list.push(card);
                    }

                    let ref collected_list = collected_list;

                    json::encode(collected_list).unwrap()
                }
            };

            return Ok(Response::with((status::Ok, response)));
        }
    });

}

/* helpers */

pub fn get_card_by_id(grokdb: &GrokDB, card_id: i64) -> IronResult<Response> {

    let maybe_card: Result<CardResponse, QueryError> = grokdb.cards.get_response(grokdb, card_id);

    let card: CardResponse = match maybe_card {

        Err(why) => {
            // why: QueryError

            let ref reason = format!("{:?}", why);
            let res_code = status::NotFound;

            let err_response = ErrorResponse {
                status: res_code,
                developerMessage: reason,
                userMessage: why.description(),
            }.to_json();

            return Ok(Response::with((res_code, err_response)));
        },

        Ok(card) => card,
    };

    let response = card.to_json();

    return Ok(Response::with((status::Ok, response)));
}

pub fn card_exists(grokdb: &GrokDB, card_id: i64) -> Result<(), IronResult<Response>> {

    match grokdb.cards.exists(card_id) {

        Err(why) => {
            // why: QueryError

            let ref reason = format!("{:?}", why);
            let res_code = status::InternalServerError;

            let err_response = ErrorResponse {
                status: res_code,
                developerMessage: reason,
                userMessage: why.description(),
            }.to_json();

            let res = Ok(Response::with((res_code, err_response)));
            return Err(res);
        },

        Ok(false) => {
            let ref reason = format!("given card id does not exist: {}", card_id);
            let res_code = status::NotFound;

            let err_response = ErrorResponse {
                status: res_code,
                developerMessage: reason,
                userMessage: reason,
            }.to_json();

            let res = Ok(Response::with((res_code, err_response)));
            return Err(res);
        },

        _ => {
            return Ok(());
        }
    }
}
