extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate rustc_serialize;

use iron::{Request, Response, IronResult};
use iron::status;
use router::Router;
use rustc_serialize::json;

use ::api::{GrokDB, ErrorResponse, __ErrorResponse};


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

        // let json_input = req.get::<bodyparser::Json>();

        let err_response = ErrorResponse {
            status: status::Ok,
            developerMessage: "homura",
            userMessage: "homura",
        }.to_json();

        return Ok(Response::with((status::Ok, err_response)));

    });

}
