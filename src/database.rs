extern crate libc;
extern crate rusqlite;
extern crate libsqlite3_sys as ffi;

use std::error;
use std::fmt;
use std::ops::Deref;
use std::sync::{Arc, Mutex, LockResult, MutexGuard};
use libc::{c_int, c_double};

use rusqlite::SqliteConnection;
use rusqlite::SqliteError;
use rusqlite::functions::{sqlite3_context, sqlite3_value, FromValue,ToResult};

use queries::tables;

#[derive(Debug)]
pub struct DB {
    pub db_conn: Arc<Mutex<SqliteConnection>>
}

impl DB {

    pub fn lock(&self) -> LockResult<MutexGuard<SqliteConnection>> {
        let mutex = self.db_conn.deref();
        return mutex.lock();
    }

    pub fn prepare_query(db_conn: &SqliteConnection) -> Result<(), QueryError> {

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

            // TODO: move this somewhere
            match db_conn.create_scalar_function("rank_score", 4, true, Some(rank_score)) {
                Err(why) => {
                    return Err(BootstrapError::Sqlite(why));
                },
                _ => {}
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
extern "C" fn rank_score(ctx: *mut sqlite3_context, _: c_int, argv: *mut *mut sqlite3_value) {

    // rank_score(success: int, fail: int, age: int, times_reviewed: int) -> f64

    unsafe {

        let success = {
            let _success = *argv.offset(0);

            if !c_int::parameter_has_valid_sqlite_type(_success) {
                ffi::sqlite3_result_error_code(ctx, ffi::SQLITE_MISMATCH);
                return;
            }

            c_int::parameter_value(_success).unwrap() as c_double
        };

        let fail = {
            let _fail = *argv.offset(1);

            if !c_int::parameter_has_valid_sqlite_type(_fail) {
                ffi::sqlite3_result_error_code(ctx, ffi::SQLITE_MISMATCH);
                return;
            }

            c_int::parameter_value(_fail).unwrap() as c_double
        };

        let age = {
            let _age = *argv.offset(2);

            if !c_int::parameter_has_valid_sqlite_type(_age) {
                ffi::sqlite3_result_error_code(ctx, ffi::SQLITE_MISMATCH);
                return;
            }

            c_int::parameter_value(_age).unwrap() as c_double
        };

        let times_reviewed = {
            let _times_reviewed = *argv.offset(3);

            if !c_int::parameter_has_valid_sqlite_type(_times_reviewed) {
                ffi::sqlite3_result_error_code(ctx, ffi::SQLITE_MISMATCH);
                return;
            }

            c_int::parameter_value(_times_reviewed).unwrap() as c_double
        };

        let total: c_double = success + fail;

        let lidstone: c_double = (fail + 0.5f64) / (total + 1.0f64);
        let bias_factor: c_double = (1.0f64 + fail) / ((total + 1.0f64) + success + times_reviewed / 3.0f64);
        let base: c_double = lidstone + 1.0f64;

        let rank_score: c_double = lidstone * (age * bias_factor + base).ln() / base.ln();
        rank_score.set_result(ctx);
    }
}
