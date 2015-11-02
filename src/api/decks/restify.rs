extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate rustc_serialize;

use iron::status;
use iron::prelude::*;
use router::Router;
use rustc_serialize::json;

use std::sync::{Arc, Mutex};
use std::ops::Deref;
use std::error::Error;

use ::api::{GrokDB, ErrorResponse};
use ::api::decks::{CreateDeck, Deck};
use ::database::QueryError;


pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);

    router.get("/decks/:deck_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {

            // fetch and parse requested deck id

            let deck_id = req.extensions.get::<Router>().unwrap().find("deck_id").unwrap();

            let deck_id: i64 = match deck_id.parse::<u64>() {
                Ok(deck_id) => deck_id as i64,
                Err(why) => {

                    let ref reason = format!("{:?}", why);

                    let err_response = ErrorResponse {
                        status: status::BadRequest,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((status::BadRequest, err_response)));
                }
            };

            return get_deck_by_id(grokdb.clone(), deck_id);
        }
    });

    router.post("/decks", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {

            // parse json

            let create_deck_request = req.get::<bodyparser::Struct<CreateDeck>>();

            let maybe_created = match create_deck_request {

                Ok(Some(create_deck_request)) => {

                    let create_deck_request: CreateDeck = create_deck_request;

                    grokdb.decks.create(create_deck_request)
                },

                Ok(None) => {

                    let reason = "no JSON given";

                    let err_response = ErrorResponse {
                        status: status::BadRequest,
                        developerMessage: reason,
                        userMessage: reason,
                    }.to_json();

                    return Ok(Response::with((status::BadRequest, err_response)));
                },

                Err(err) => {

                    let ref reason = format!("{:?}", err);

                    let err_response = ErrorResponse {
                        status: status::BadRequest,
                        developerMessage: reason,
                        userMessage: err.description(),
                    }.to_json();

                    return Ok(Response::with((status::BadRequest, err_response)));
                }
            };

            match maybe_created {
                Err(why) => {
                    // why: QueryError
                    let ref reason = format!("{:?}", why);

                    let err_response = ErrorResponse {
                        status: status::BadRequest,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((status::InternalServerError, err_response)));
                },
                Ok(rowid) => {
                    // rowid: i64
                    /* deck sucessfully created */

                    return get_deck_by_id(grokdb.clone(), rowid);
                },
            };
        }
    });

}

/* helpers */

fn get_deck_by_id(grokdb: Arc<GrokDB>, deck_id: i64) -> IronResult<Response> {

    let maybe_deck: Result<Deck, QueryError> = grokdb.decks.get(deck_id);

    let deck: Deck = match maybe_deck {
        Err(why) => {
            // why: QueryError

            let ref reason = format!("{:?}", why);

            let err_response = ErrorResponse {
                status: status::NotFound,
                developerMessage: reason,
                userMessage: why.description(),
            }.to_json();

            return Ok(Response::with((status::NotFound, err_response)));
        },
        Ok(deck) => deck,
    };

    let response = deck.to_json();

    return Ok(Response::with((status::Ok, response)));
}
