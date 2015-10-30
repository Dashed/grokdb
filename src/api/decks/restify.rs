extern crate iron;
extern crate router;

use iron::{Request, Response, IronResult};
use iron::status;
use router::Router;

use ::api::GrokDB;


pub fn restify(router: &mut Router, grokdb: GrokDB) {

    router.get("/decks/:deck_id", move |req: &mut Request| -> IronResult<Response> {

        let deck_id = req.extensions.get::<Router>().unwrap().find("deck_id").unwrap_or("/");

        let deck_id = deck_id.parse::<i64>().unwrap_or(1);

        // let deck = grokdb.decks.get(deck_id);

        // let msg = database::Message::Write(deck_id.to_string());

        // let response = db_portal.write(msg);

        Ok(Response::with((status::Ok, "lol")))
    });

}
