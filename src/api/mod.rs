extern crate iron;
extern crate rusqlite;
extern crate router;

pub mod decks;

use rusqlite::SqliteError;
use iron::{Request, Response, IronResult};
use iron::status;
use router::{Router};

use std::sync::Arc;

use self::decks::Decks;
use super::database::{DB, BootstrapError};

pub struct GrokDB {
    pub decks: Decks,
}

pub fn new(database_name: String) -> Result<GrokDB, BootstrapError> {

    // open db connection and bootstrap it
    let db_conn: Result<DB, BootstrapError> = super::database::bootstrap(database_name);

    let db: Arc<DB> = Arc::new(try!(db_conn));

    let api = GrokDB {
        decks: Decks {
            db: db.clone()
        }
    };

    return Ok(api);
}

pub fn restify(router: &mut Router, grokdb: GrokDB) {

    // decks

    router.get("/decks/:deck_id", move |req: &mut Request| -> IronResult<Response> {

        let deck_id = req.extensions.get::<Router>().unwrap().find("deck_id").unwrap_or("/");

        let deck_id = deck_id.parse::<i64>().unwrap_or(1);

        // let deck = grokdb.decks.get(deck_id);

        // let msg = database::Message::Write(deck_id.to_string());

        // let response = db_portal.write(msg);

        Ok(Response::with((status::Ok, "lol")))
    });

}
