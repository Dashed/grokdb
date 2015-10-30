extern crate rusqlite;

use std::ops::Deref;
use rusqlite::SqliteConnection;
use rusqlite::SqliteError;
use std::sync::{Arc, RwLock, LockResult, RwLockWriteGuard};

use queries::tables;

pub struct DB {
    pub db_conn: Arc<RwLock<SqliteConnection>>
}

impl DB {
    fn write_lock(&self) -> LockResult<RwLockWriteGuard<SqliteConnection>> {
        let lock = self.db_conn.deref();
        return lock.write();
    }

    fn finalize_query(sql: &str) -> String {

        // src: https://www.sqlite.org/pragma.html#pragma_foreign_keys
        // As of SQLite version 3.6.19, the default setting for foreign key enforcement is OFF.

        return format!("PRAGMA foreign_keys=ON; {}", sql);
    }
}


pub fn bootstrap(database_name: String) -> Result<DB, SqliteError> {

    // open db connection
    let db_conn = SqliteConnection::open(database_name);

    return match db_conn {
        Err(why) => {
            return Err(why);
        },
        Ok(db_conn) => {
            let lock = RwLock::new(db_conn);
            let arc = Arc::new(lock).clone();

            let db_wrap = DB {
                db_conn: arc
            };

            {

                let db = &db_wrap;

                match create_tables(db) {
                    Err(why) => {
                        return Err(why);
                    },
                    _ => {/* queries sucessfully executed */},
                }
            }

            return Ok(db_wrap);
        }
    };
}

fn create_tables(db: &DB) -> Result<(), SqliteError> {

    let db_conn_guard = db.write_lock().unwrap();
    let ref db_conn = *db_conn_guard;

    // execute every table setup query
    for query in tables::SETUP.into_iter() {

        let ref final_query = DB::finalize_query(query);

        match db_conn.execute(final_query, &[]) {
            Err(why) => {
                // TODO: amend error with query; will need custom error type
                return Err(why);
            },
            _ => {/* query sucessfully executed */},
        }
    }

    return Ok(());
}
