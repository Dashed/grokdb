extern crate rusqlite;

pub mod decks;

use rusqlite::SqliteError;

use std::sync::Arc;

use self::decks::Decks;
use super::database::DB;

pub struct GrokDB {
    pub decks: Decks,
}

pub fn new(database_name: String) -> Result<GrokDB, SqliteError> {

    // open db connection and bootstrap
    let db_conn: Result<DB, SqliteError> = super::database::bootstrap(database_name);

    return match db_conn {
        Err(why) => {
            return Err(why);
        },
        Ok(_db) => {

            let db = Arc::new(_db);

            let api = GrokDB {
                decks: Decks {
                    db: db.clone()
                }
            };

            return Ok(api);
        }
    };
}
