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

use ::api::{GrokDB, ErrorResponse};
use ::api::decks::CreateDeck;




pub fn restify(router: &mut Router, grokdb: GrokDB) {

     let grokdb = Arc::new(grokdb);
    // let grokdb = Arc::new(grokdb);

    router.get("/decks/:deck_id", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb;
            // let grokdb = grokdb.clone().lock().unwrap();

        //     let ref grokdb = grokdb;

        //     // let grokdb = grokdb.clone().lock().unwrap();

            let deck_id = req.extensions.get::<Router>().unwrap().find("deck_id").unwrap();

            let deck_id = match deck_id.parse::<i64>() {
                Ok(deck_id) => deck_id,
                Err(_) => {
                    return Ok(Response::with((status::BadRequest, "invalid deck id")));
                }
            };

        //     // let json_input = req.get::<bodyparser::Json>();

            let deck = grokdb.decks.get(deck_id);

        //     // let msg = database::Message::Write(deck_id.to_string());

        //     // let response = db_portal.write(msg);

        //     // let output = format!("{}", deck_id);
            return Ok(Response::with((status::Ok)));
        }
    });

    router.post("/decks", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {

            // parse json

            let create_deck_request = req.get::<bodyparser::Struct<CreateDeck>>();
            let new_deck = match create_deck_request {

                Ok(Some(create_deck_request)) => {

                    let create_deck_request: CreateDeck = create_deck_request;

                    let deck = grokdb.decks.create(create_deck_request);
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
                        userMessage: reason,
                    }.to_json();

                    return Ok(Response::with((status::BadRequest, err_response)));
                }
            };


            // let json_input = req.get::<bodyparser::Json>();

            return Ok(Response::with((status::Ok, "")));
        }
    });

}
