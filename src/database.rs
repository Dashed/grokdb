extern crate rusqlite;

use rusqlite::SqliteConnection;
use rusqlite::SqliteError;
use std::sync::{Arc, RwLock};


pub fn bootstrap(database_name: String) -> Result<Arc<RwLock<SqliteConnection>>, SqliteError> {

    // open db connection
    let db_conn = SqliteConnection::open(database_name);

    return match db_conn {
        Err(why) => {
            return Err(why);
        },
        Ok(db_conn) => {
        let lock = RwLock::new(db_conn);
        let arc = Arc::new(lock).clone();

        return Ok(arc);
        }
    };
}
