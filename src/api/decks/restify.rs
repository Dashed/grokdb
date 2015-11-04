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
use ::api::decks::{CreateDeck, Deck};
use ::database::QueryError;

// attach decks REST endpoints to given router
pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);

    router.get("/decks/:deck_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

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

            return get_deck_by_id(grokdb, deck_id);
        }
    });

    router.delete("/decks/:deck_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

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

            // delete deck

            match grokdb.decks.delete(deck_id) {
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
                _ => {/* deck sucessfully deleted */},
            };

            return Ok(Response::with((status::Ok)));
        }
    });

    router.post("/decks", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            // parse json

            let create_deck_request = req.get::<bodyparser::Struct<CreateDeck>>();

            let create_deck_request: CreateDeck = match create_deck_request {

                Ok(Some(create_deck_request)) => {

                    let create_deck_request: CreateDeck = create_deck_request;

                    // ensure parent deck (if given) exists; otherwise bail early
                    match create_deck_request.parent {
                        Some(parent_deck_id) => {
                            match deck_exists(grokdb, parent_deck_id) {
                                Err(response) => {
                                    return response;
                                },
                                _ => {/* noop; continue */}
                            }
                        },
                        _ => {/* noop; continue */}
                    }
                    create_deck_request
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

            // create deck

            let deck_id: i64 = match grokdb.decks.create(&create_deck_request) {
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
                Ok(rowid) => {
                    // rowid: i64
                    /* deck sucessfully created */
                    rowid
                },
            };

            // connect new deck to parent (if given).
            // invariant: parent deck exists
            match create_deck_request.parent {
                Some(parent_deck_id) => {

                    let parent_deck_id: i64 = parent_deck_id;

                    match grokdb.decks.connect_decks(deck_id, parent_deck_id) {
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
                        _ => {/* connected new deck with parent; continue */}
                    }
                },
                _ => {/* no parent specified; continue */}
            }

            return get_deck_by_id(grokdb.clone(), deck_id);
        }
    });

}

/* helpers */

fn get_deck_by_id(grokdb: &GrokDB, deck_id: i64) -> IronResult<Response> {

    let maybe_deck: Result<Deck, QueryError> = grokdb.decks.get(deck_id);

    let deck: Deck = match maybe_deck {

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

        Ok(deck) => deck,
    };

    let response = deck.to_json();

    return Ok(Response::with((status::Ok, response)));
}

fn deck_exists(grokdb: &GrokDB, deck_id: i64) -> Result<(), IronResult<Response>> {

    match grokdb.decks.exists(deck_id) {

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
            let ref reason = format!("given deck id does not exist: {}", deck_id);
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
