extern crate iron;
extern crate rusqlite;
extern crate router;

pub mod decks;

use rusqlite::SqliteError;
use iron::{Request, Response, IronResult};
use iron::status;
use router::Router;

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

    // TODO: db backup

    decks::restify(router, grokdb);
}
