extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate rustc_serialize;

use iron::status;
use iron::prelude::*;
use router::Router;
use rustc_serialize::json;

use std::sync::Arc;
use std::ops::Deref;
use std::error::Error;

use ::api::{GrokDB, ErrorResponse};
use ::api::cards::{CreateCard, Card, UpdateCard, CardResponse};
use ::api::decks::restify::deck_exists;
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

            return get_card_by_id(&grokdb, card_id);
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

            return get_card_by_id(&grokdb, card_id);
        }
    });

}

/* helpers */

fn get_card_by_id(grokdb: &GrokDB, card_id: i64) -> IronResult<Response> {

    let maybe_card: Result<CardResponse, QueryError> = grokdb.cards.get_response(card_id);

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
