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
use ::api::cards::restify::card_exists;
use ::api::stashes::{CreateStash, StashResponse, UpdateStash};
use ::database::QueryError;

// attach stashes REST endpoints to given router
pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);

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
}

/* helpers */

fn get_stash_by_id(grokdb: &GrokDB, stash_id: i64) -> IronResult<Response> {

    // ensure stash exists
    match stash_exists(grokdb, stash_id) {
        Err(response) => {
            return response;
        },
        _ => {/* updating stash exists; continue */}
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

    return Ok(Response::with((status::Ok, response)));
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
