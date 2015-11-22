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
use ::api::stashes::{CreateStash, StashResponse};
use ::database::QueryError;

// attach stashes REST endpoints to given router
pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);

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
}

/* helpers */

fn get_stash_by_id(grokdb: &GrokDB, stash_id: i64) -> IronResult<Response> {

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
