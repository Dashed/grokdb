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
use ::api::decks::reviewable::{ReviewableDeck};
use ::api::cards::restify::get_card_by_id;
use ::api::review::get_review_card;
use ::database::QueryError;

// attach review REST endpoints to given router
pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);
    let grokdb_arc = grokdb.clone();

    // router.patch("/cards/:card_id/review", {
    //     let grokdb = grokdb.clone();
    //     move |req: &mut Request| -> IronResult<Response> {
    //         let ref grokdb = grokdb.deref();
    //     }
    // });

    router.get("/decks/:deck_id/review", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

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

            let deck_selection = ReviewableDeck {
                deck_id: deck_id,
                grokdb: grokdb_arc.clone()
            };

            match get_review_card(&deck_selection) {
                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },

                Ok(None) => {

                    let ref reason = format!("No card to review");
                    let res_code = status::NotFound;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: reason,
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },

                Ok(Some(card_id)) => {
                    return get_card_by_id(grokdb.clone(), card_id);
                }
            }
        }
    });

}
