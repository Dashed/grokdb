extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate rustc_serialize;

// use iron::{Request, Response, IronResult};
use iron::status;
use iron::prelude::*;
use router::Router;
use rustc_serialize::json;

use ::api::{GrokDB, ErrorResponse, __ErrorResponse};

#[derive(Debug, Clone, RustcDecodable)]
struct CreateDeck {
    name: String,
    description: Option<String>,
}

struct Deck {
    name: String,
    description: String,
}

pub fn restify(router: &mut Router, grokdb: GrokDB) {

    router.get("/decks/:deck_id", move |req: &mut Request| -> IronResult<Response> {

        let deck_id = req.extensions.get::<Router>().unwrap().find("deck_id").unwrap();

        let deck_id = match deck_id.parse::<i64>() {
            Ok(deck_id) => deck_id,
            Err(_) => {
                return Ok(Response::with((status::BadRequest, "invalid deck id")));
            }
        };

        // let json_input = req.get::<bodyparser::Json>();

        // let deck = grokdb.decks.get(deck_id);

        // let msg = database::Message::Write(deck_id.to_string());

        // let response = db_portal.write(msg);

        let output = format!("{}", deck_id);

        return Ok(Response::with((status::Ok, output)));
    });

    router.post("/decks", move |req: &mut Request| -> IronResult<Response> {

        // parse json

        let create_deck_request = req.get::<bodyparser::Struct<CreateDeck>>();
        let new_deck = match create_deck_request {

            Ok(Some(create_deck_request)) => {

                let create_deck_request: CreateDeck = create_deck_request;

                // TODO: create
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

    });

}
