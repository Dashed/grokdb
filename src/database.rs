extern crate rusqlite;

use std::ops::Deref;
use rusqlite::SqliteConnection;
use rusqlite::SqliteError;
use std::sync::{Arc, RwLock};

use queries::tables;


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

            {   // write lock region
                let arc = &arc;
                let lock = arc.deref();
                let db_conn_guard = lock.write().unwrap();
                let ref db_conn = *db_conn_guard;

                match create_tables(db_conn) {
                    Err(why) => {
                        return Err(why);
                    },
                    _ => {/* don't expect anything */},
                }
            }

            return Ok(arc);
        }
    };
}

fn create_tables(db_conn: &SqliteConnection) -> Result<(), SqliteError> {

    match db_conn.execute(tables::DECKS, &[]) {
        Err(why) => {
            return Err(why);
        },
        _ => {/* don't care */},
    }

    println!("{}", tables::DECKS);

    return Ok(());
}
