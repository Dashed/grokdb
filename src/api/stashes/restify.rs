extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate rustc_serialize;

use iron::status;
use iron::prelude::*;
use iron::mime::Mime;
use router::Router;
use urlencoded::{UrlEncodedQuery, QueryMap, UrlDecodingError};
use rustc_serialize::json;
use regex::Regex;

use std::sync::Arc;
use std::ops::Deref;
use std::error::Error;

use ::api::{GrokDB, ErrorResponse};
use ::api::cards::restify::card_exists;
use ::api::stashes::{StashesPageRequest, SortBy, SortOrder, CreateStash, StashResponse, UpdateStash};
use ::database::QueryError;

// attach stashes REST endpoints to given router
pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);

    let stashes_list_re = Regex::new(r"^[1-9]\d*(,[1-9]\d*)*$").unwrap();

    router.get("/stashes", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            let page_query: StashesPageRequest = match req.get_ref::<UrlEncodedQuery>() {

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
                                    "name" => SortBy::Name,
                                    // "reviewed_at" => SortBy::ReviewedDate,
                                    // "times_reviewed" => SortBy::TimesReviewed,
                                    _ => SortBy::UpdatedAt
                                }
                            }
                        },
                        _ => SortBy::UpdatedAt
                    };

                    let order: SortOrder = match hashmap.contains_key("order_by") {
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

                    StashesPageRequest {
                        page: page,
                        per_page: per_page,
                        sort_by: sort_by,
                        order: order
                    }
                },

                Err(UrlDecodingError::EmptyQuery) => {
                    StashesPageRequest {
                        page: 1,
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

            match grokdb.stashes.count() {

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

                        // no stashes, return empty array

                        let ref v: Vec<StashResponse> = vec![];
                        let response: String = json::encode(v).unwrap();
                        let content_type = "application/json".parse::<Mime>().unwrap();

                        return Ok(Response::with((content_type, status::Ok, response)));
                    }

                    if page_query.get_offset() >= count {
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

            let response: String = match grokdb.stashes.get_list(page_query) {

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

                    let mut collected_list: Vec<StashResponse> = vec![];

                    for stash_id in &list {

                        let stash_id: i64 = *stash_id;

                        let maybe_stash: Result<StashResponse, QueryError> = grokdb.stashes.get_response(stash_id);

                        let stash: StashResponse = match maybe_stash {

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

                            Ok(stash) => stash,
                        };

                        collected_list.push(stash);
                    }

                    let ref collected_list = collected_list;

                    json::encode(collected_list).unwrap()

                }
            };

            let content_type = "application/json".parse::<Mime>().unwrap();

            return Ok(Response::with((content_type, status::Ok, response)));
        }
    });

    router.get("/stashes/bulk", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            let list_stash_ids: Vec<i64> = match req.get_ref::<UrlEncodedQuery>() {

                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },

                Ok(ref hashmap) => {
                    let hashmap: &QueryMap = hashmap;

                    let stashes: Vec<i64> = match hashmap.contains_key("stashes") {
                        true => {
                            let maybe_stashes: &Vec<String> = hashmap.get("stashes").unwrap();

                            if maybe_stashes.len() <= 0 {
                                vec![]
                            } else {

                                let ref stashes_str: String = maybe_stashes[0];

                                if stashes_list_re.is_match(stashes_str) {
                                    let stashes = stashes_str.split(",").map(
                                        |x: &str| -> i64 {
                                            x.parse::<i64>().unwrap()
                                    });

                                    stashes.collect::<Vec<i64>>()
                                } else {

                                    let ref reason = format!("Invalid list of stashes ids");
                                    let res_code = status::BadRequest;

                                    let err_response = ErrorResponse {
                                        status: res_code,
                                        developerMessage: reason,
                                        userMessage: reason,
                                    }.to_json();

                                    return Ok(Response::with((res_code, err_response)));
                                }
                            }
                        },

                        _ => vec![]
                    };

                    stashes
                }
            };

            let mut stashes: Vec<StashResponse> = vec![];

            for stash_id in list_stash_ids {

                let maybe_stash: Result<StashResponse, QueryError> = grokdb.stashes.get_response(stash_id);

                let stash: StashResponse = match maybe_stash {

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

                    Ok(stash) => stash,
                };

                stashes.push(stash);
            }

            let ref stashes = stashes;

            let response = json::encode(stashes).unwrap();

            let content_type = "application/json".parse::<Mime>().unwrap();

            return Ok(Response::with((content_type, status::Ok, response)));
        }
    });

    router.get("/stashes/:stash_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

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

            return get_stash_by_id(grokdb.clone(), stash_id);
        }
    });

    router.delete("/stashes/:stash_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

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

            // delete stash

            match grokdb.stashes.delete(stash_id) {
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
                _ => {/* stash sucessfully deleted */},
            };

            return Ok(Response::with((status::Ok)));
        }
    });

    router.post("/stashes", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            // parse json

            let create_stash_request = req.get::<bodyparser::Struct<CreateStash>>();

            let create_stash_request: CreateStash = match create_stash_request {

                Ok(Some(create_stash_request)) => create_stash_request,

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

            // ensure stash title is non-empty string
            let mut create_stash_request = create_stash_request;
            create_stash_request.name = create_stash_request.name.trim().to_string();

            if create_stash_request.name.len() <= 0 {
                let ref reason = format!("stash name should be non-empty string");
                let res_code = status::BadRequest;

                let err_response = ErrorResponse {
                    status: res_code,
                    developerMessage: reason,
                    userMessage: reason,
                }.to_json();

                return Ok(Response::with((res_code, err_response)));
            }

            let create_stash_request = create_stash_request;

            // create stash

            let stash_id: i64 = match grokdb.stashes.create(&create_stash_request) {
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
                Ok(stash_id) => {
                    // stash_id: i64
                    /* stash sucessfully created */
                    stash_id
                },
            };

            return get_stash_by_id(&grokdb, stash_id);
        }
    });

    router.patch("/stashes/:stash_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            // TODO: refactor
            let update_stash_request = req.get::<bodyparser::Struct<UpdateStash>>();

            // fetch and parse requested stash id

            let stash_id: &str = req.extensions.get::<Router>().unwrap().find("stash_id").unwrap();

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

            // parse stash request

            let ref update_stash_request: UpdateStash = match update_stash_request {

                Ok(Some(update_stash_request)) => {
                    let update_stash_request: UpdateStash = update_stash_request;
                    update_stash_request
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
            if !update_stash_request.should_update() {

                let ref reason = format!("Invalid stash update request.");
                let res_code = status::BadRequest;

                let err_response = ErrorResponse {
                    status: res_code,
                    developerMessage: reason,
                    userMessage: reason,
                }.to_json();

                return Ok(Response::with((res_code, err_response)));
            }

            // ensure stash to be updated exists
            match stash_exists(grokdb, stash_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* updating stash exists; continue */}
            }

            // update stash
            match grokdb.stashes.update(stash_id, update_stash_request) {
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
                _ => {/* stash updated */}
            }

            return get_stash_by_id(&grokdb, stash_id);
        }
    });

    // add card to stash
    router.put("/cards/:card_id/stashes/:stash_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

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

            // ensure stash exists
            match stash_exists(grokdb, stash_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* stash exists; continue */}
            }

            // ensure card exists
            match card_exists(grokdb, card_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* card exists; continue */}
            }

            match grokdb.stashes.add_card_to_stash(stash_id, card_id) {
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
                _ => {/* card added to stash */}
            }

            let res_code = status::Ok;
            return Ok(Response::with((res_code, "")));
        }
    });

    // remove a card from a stash
    router.delete("/cards/:card_id/stashes/:stash_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

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

            // ensure stash exists
            match stash_exists(grokdb, stash_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* stash exists; continue */}
            }

            // ensure card exists
            match card_exists(grokdb, card_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* card exists; continue */}
            }

            match grokdb.stashes.remove_card_from_stash(stash_id, card_id) {
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
                _ => {/* card removed from stash */}
            }

            let res_code = status::Ok;
            return Ok(Response::with((res_code, "")));
        }
    });

    // remove a specific card from all stashes
    router.delete("/cards/:card_id/stashes", {
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

            // ensure card exists
            match card_exists(grokdb, card_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* card exists; continue */}
            }

            match grokdb.stashes.remove_card_from_all_stashes(card_id) {
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
                _ => {/* card removed from all stashes */}
            }

            let res_code = status::Ok;
            return Ok(Response::with((res_code, "")));
        }
    });

    // remove all cards from stash
    router.delete("/stashes/:stash_id/cards", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

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

            match grokdb.stashes.remove_all_cards_from_stash(stash_id) {
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
                _ => {/* removed all cards from stash */}
            }

            let res_code = status::Ok;
            return Ok(Response::with((res_code, "")));
        }
    });

    // get list of stashes this card belongs to
    router.get("/cards/:card_id/stashes", {
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

            // ensure card exists
            match card_exists(grokdb, card_id) {
                Err(response) => {
                    return response;
                },
                _ => {/* card exists; continue */}
            }

            match grokdb.stashes.count_by_card(card_id) {
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
                        let ref v: Vec<StashResponse> = vec![];
                        let response: String = json::encode(v).unwrap();
                        return Ok(Response::with((status::Ok, response)));
                    }
                }
            }

            let response: String = match grokdb.stashes.get_by_card(card_id) {
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

                    let mut collected_list: Vec<StashResponse> = vec![];

                    for stash_id in &list {

                        let stash_id: i64 = *stash_id;

                        let maybe_stash: Result<StashResponse, QueryError> = grokdb.stashes.get_response(stash_id);

                        let stash: StashResponse = match maybe_stash {

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

                            Ok(stash) => stash,
                        };

                        collected_list.push(stash);
                    }

                    let ref collected_list = collected_list;

                    json::encode(collected_list).unwrap()
                }
            };

            let content_type = "application/json".parse::<Mime>().unwrap();

            return Ok(Response::with((content_type, status::Ok, response)));
        }
    });
}

/* helpers */

fn get_stash_by_id(grokdb: &GrokDB, stash_id: i64) -> IronResult<Response> {

    // ensure stash exists
    match stash_exists(grokdb, stash_id) {
        Err(response) => {
            return response;
        },
        _ => {/* stash exists; continue */}
    }

    let maybe_stash: Result<StashResponse, QueryError> = grokdb.stashes.get_response(stash_id);

    let stash: StashResponse = match maybe_stash {

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

        Ok(stash) => stash,
    };

    let response = stash.to_json();

    let content_type = "application/json".parse::<Mime>().unwrap();

    return Ok(Response::with((content_type, status::Ok, response)));
}

pub fn stash_exists(grokdb: &GrokDB, stash_id: i64) -> Result<(), IronResult<Response>> {

    match grokdb.stashes.exists(stash_id) {

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
            let ref reason = format!("given stash id does not exist: {}", stash_id);
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
