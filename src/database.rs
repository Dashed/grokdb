extern crate rusqlite;

use std::error;
use std::fmt;
use std::ops::Deref;
use std::sync::{Arc, Mutex, LockResult, MutexGuard};

use rusqlite::SqliteConnection;
use rusqlite::SqliteError;

use queries::tables;


pub struct DB {
    pub db_conn: Arc<Mutex<SqliteConnection>>
}

impl DB {

    fn lock(&self) -> LockResult<MutexGuard<SqliteConnection>> {
        let mutex = self.db_conn.deref();
        return mutex.lock();
    }

    fn finalize_query(sql: &str) -> String {

        // src: https://www.sqlite.org/pragma.html#pragma_foreign_keys
        // As of SQLite version 3.6.19, the default setting for foreign key enforcement is OFF.

        return format!("PRAGMA foreign_keys=ON; {}", sql);
    }
}


#[derive(Debug)]
pub struct QueryError {
    pub sqlite_error: SqliteError,
    pub query: String,
}

impl fmt::Display for QueryError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{} \nFor query:\n{}", self.sqlite_error, self.query)
    }
}

impl error::Error for QueryError {
    fn description(&self) -> &str {
        return self.sqlite_error.description();
    }
}

#[derive(Debug)]
pub enum BootstrapError {
    Query(QueryError),
    Sqlite(SqliteError),
}

impl fmt::Display for BootstrapError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        return match *self {
            BootstrapError::Query(ref err) => write!(f, "{}", err),
            BootstrapError::Sqlite(ref err) => write!(f, "{}", err),
        };
    }
}

impl error::Error for BootstrapError {
    fn description(&self) -> &str {
        return match *self {
            BootstrapError::Query(ref err) => err.description(),
            BootstrapError::Sqlite(ref err) => err.description(),
        };
    }
}

impl From<QueryError> for BootstrapError {
    fn from(err: QueryError) -> BootstrapError {
        return BootstrapError::Query(err);
    }
}

impl From<SqliteError> for BootstrapError {
    fn from(err: SqliteError) -> BootstrapError {
        return BootstrapError::Sqlite(err);
    }
}

pub fn bootstrap(database_name: String) -> Result<DB, BootstrapError> {

    // open db connection
    let db_conn = SqliteConnection::open(database_name);

    return match db_conn {
        Err(why) => {
            return Err(BootstrapError::Sqlite(why));
        },
        Ok(db_conn) => {
            let lock = Mutex::new(db_conn);
            let arc = Arc::new(lock).clone();

            let db_wrap = DB {
                db_conn: arc
            };

            {
                let db = &db_wrap;

                match create_tables(db) {
                    Err(why) => {
                        // why: QueryError
                        return Err(BootstrapError::Query(why));
                    },
                    _ => {/* queries sucessfully executed */},
                }
            }

            return Ok(db_wrap);
        }
    };
}

fn create_tables(db: &DB) -> Result<(), QueryError> {

    let db_conn_guard = db.lock().unwrap();
    let ref db_conn = *db_conn_guard;

    // execute every table setup query
    for query in tables::SETUP.into_iter() {

        let ref final_query = DB::finalize_query(query);

        match db_conn.execute_batch(final_query) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: final_query.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }
    }

    return Ok(());
}
