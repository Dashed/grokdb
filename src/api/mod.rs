extern crate rusqlite;

pub mod decks;

use rusqlite::SqliteError;
use self::decks::Decks;

pub struct GrokDB {
    pub decks: Decks,
}

pub fn new(database_name: String) -> Result<GrokDB, SqliteError> {

    // open db connection and bootstrap
    let db_conn = super::database::bootstrap(database_name);

    return match db_conn {
        Err(why) => {
            return Err(why);
        },
        Ok(db_conn) => {
            let api = GrokDB {
                decks: Decks {
                    db_conn: db_conn.clone()
                }
            };

            return Ok(api);
        }
    };
}
