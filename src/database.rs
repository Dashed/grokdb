extern crate libc;
extern crate rusqlite;

use std::error;
use std::fmt;
use std::ops::Deref;
use std::sync::{Arc, Mutex, LockResult, MutexGuard};
use libc::{c_int, c_double};

use rusqlite::{Connection, Error, Result as SqliteResult};
use rusqlite::functions::{Context};

use queries::tables;

#[derive(Debug)]
pub struct DB {
    pub db_conn: Arc<Mutex<Connection>>
}

impl DB {

    pub fn lock(&self) -> LockResult<MutexGuard<Connection>> {
        let mutex = self.db_conn.deref();
        return mutex.lock();
    }

    pub fn prepare_query(db_conn: &Connection) -> Result<(), QueryError> {

        // src: https://www.sqlite.org/pragma.html#pragma_foreign_keys
        // As of SQLite version 3.6.19, the default setting for foreign key enforcement is OFF.

        let ref final_query = format!("PRAGMA foreign_keys=ON;");

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

        return Ok(());
    }

    // pub fn finalize_query(sql: &str) -> String {

    //     // src: https://www.sqlite.org/pragma.html#pragma_foreign_keys
    //     // As of SQLite version 3.6.19, the default setting for foreign key enforcement is OFF.

    //     return format!("PRAGMA foreign_keys=ON; {}", sql);
    // }
}


#[derive(Debug)]
pub struct QueryError {
    pub sqlite_error: Error,
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
    Sqlite(Error),
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

impl From<Error> for BootstrapError {
    fn from(err: Error) -> BootstrapError {
        return BootstrapError::Sqlite(err);
    }
}

pub fn bootstrap(database_name: String) -> Result<DB, BootstrapError> {

    // open db connection
    let db_conn = Connection::open(database_name);

    return match db_conn {
        Err(why) => {
            return Err(BootstrapError::Sqlite(why));
        },
        Ok(db_conn) => {

            // TODO: move this somewhere
            match db_conn.create_scalar_function("rank_score", 4, true, rank_score) {
                Err(why) => {
                    return Err(BootstrapError::Sqlite(why));
                },
                _ => {

                    // ensure custom scalar function was loaded

                    let ref query = format!("
                        SELECT rank_score(0, 0, 0, 0);
                    ");

                    let maybe_result = db_conn.query_row(query, &[], |row| -> f64 {
                        return row.get(0);
                    });

                    match maybe_result {
                        Err(why) => {
                            return Err(BootstrapError::Sqlite(why));
                        },
                        Ok(_/*result*/) => {
                            // TODO: assert result is 0.5, otherwise panic
                            // println!("result: {}", result);
                        }
                    };
                }
            }

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

    try!(DB::prepare_query(db_conn));

    // execute every table setup query
    for query in tables::SETUP.into_iter() {

        let ref query = query.to_string();

        match db_conn.execute_batch(query) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }
    }

    return Ok(());
}

// TODO: move this somewhere
fn rank_score(ctx: &Context) -> SqliteResult<c_double> {

    // rank_score(success: int, fail: int, age: int, times_reviewed: int) -> f64
    assert!(ctx.len() == 4, "called with unexpected number of arguments");

    let success = try!(ctx.get::<c_int>(0)) as c_double;
    let fail = try!(ctx.get::<c_int>(1)) as c_double;
    let age = try!(ctx.get::<c_int>(2)) as c_double;
    let times_reviewed = try!(ctx.get::<c_int>(3)) as c_double;

    let total: c_double = success + fail;

    let lidstone: c_double = (fail + 0.5f64) / (total + 1.0f64);
    let bias_factor: c_double = (1.0f64 + fail) / ((total + 1.0f64) + success + times_reviewed / 3.0f64);
    let base: c_double = lidstone + 1.0f64;

    let _rank_score: c_double = lidstone * (age * bias_factor + base).ln() / base.ln();

    return Ok(_rank_score);
}
