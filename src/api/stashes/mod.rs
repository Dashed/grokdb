extern crate rusqlite;
extern crate rustc_serialize;

mod restify;

use std::sync::Arc;

use rusqlite::types::ToSql;
use rusqlite::{SqliteStatement, SqliteRow, SqliteError};
use rustc_serialize::json;

use ::database::{DB, QueryError};
pub use self::restify::restify;


#[derive(Debug, Clone, RustcDecodable)]
pub struct CreateStash {
    name: String,
    description: Option<String>
}

#[derive(Debug, RustcEncodable)]
struct Stash {
    id: i64,
    name: String,
    description: String,
    created_at: i64, // unix timestamp
    updated_at: i64  // unix timestamp
}

#[derive(Debug, RustcEncodable)]
struct StashResponse {
    id: i64,
    name: String,
    description: String,
    created_at: i64, // unix timestamp
    updated_at: i64  // unix timestamp
}

impl StashResponse {

    pub fn to_json(&self) -> String {
        return json::encode(self).unwrap();
    }
}

#[derive(Debug, Clone)]
pub struct StashesAPI {
    pub db: Arc<DB>,
}

impl StashesAPI {

    pub fn get_response(&self, stash_id: i64) -> Result<StashResponse, QueryError> {

        // get props

        let maybe_stash: Result<Stash, QueryError> = self.get(stash_id);
        let stash: Stash = match maybe_stash {
            Err(why) => {
                // why: QueryError
                return Err(why);
            },
            Ok(stash) => stash,
        };

        let response = StashResponse {
            id: stash.id,
            name: stash.name,
            description: stash.description,
            created_at: stash.created_at,
            updated_at: stash.updated_at
        };

        return Ok(response);
    }

    pub fn get(&self, stash_id: i64) -> Result<Stash, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                stash_id, name, description, created_at, updated_at
            FROM Stashes
            WHERE stash_id = $1 LIMIT 1;
        ");

        let results = db_conn.query_row(query, &[&stash_id], |row| -> Stash {
            return Stash {
                id: row.get(0),
                name: row.get(1),
                description: row.get(2),
                created_at: row.get(3),
                updated_at: row.get(4)
            };
        });

        match results {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(stash) => {
                return Ok(stash);
            }
        };
    }

    pub fn create(&self, create_stash_request: &CreateStash) -> Result<i64, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let description = match create_stash_request.description {
            Some(ref description) => description.clone(),
            None => "".to_string()
        };

        let ref query = format!("INSERT INTO Stashes(name, description) VALUES ($1, $2);");

        let params: &[&ToSql] = &[

            // required
            &create_stash_request.name, // $1

            // optional
            &description // $2
        ];

        match db_conn.execute(query, params) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }

        let rowid = db_conn.last_insert_rowid();

        return Ok(rowid);
    }

    pub fn delete(&self, stash_id: i64) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query_delete = format!("
            DELETE FROM Stashes WHERE stash_id = :stash_id;
        ");

        let params: &[(&str, &ToSql)] = &[
            (":stash_id", &stash_id)
        ];

        match db_conn.execute_named(query_delete, params) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query_delete.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }

        return Ok(());
    }
}
