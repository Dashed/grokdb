extern crate iron;
extern crate rusqlite;
extern crate router;
extern crate rustc_serialize;

mod restify;

use std::sync::Arc;

use rusqlite::types::ToSql;
use rusqlite::{SqliteStatement, SqliteRow, SqliteError};
use rustc_serialize::json;

use ::database::{DB, QueryError};
pub use self::restify::restify;


#[derive(Debug, Clone, RustcDecodable)]
pub struct CreateDeck {
    name: String,
    description: Option<String>,
    parent: Option<i64>,
}

#[derive(RustcEncodable)]
struct Deck {
    id: i64,
    name: String,
    description: String,
}


impl Deck {
    pub fn to_json(&self) -> String {
        return json::encode(self).unwrap();
    }
}

pub struct Decks {
    pub db: Arc<DB>,
}

impl Decks {

    pub fn get(&self, deck_id: i64) -> Result<Deck, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("SELECT deck_id, name, description FROM Decks WHERE deck_id = $1 LIMIT 1;");

        let results = db_conn.query_row(query, &[&deck_id], |row| -> Deck {
            return Deck {
                id: row.get(0),
                name: row.get(1),
                description: row.get(2),
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
            Ok(deck) => {
                return Ok(deck);
            }
        };
    }

    pub fn exists(&self, deck_id: i64) -> Result<bool, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("SELECT COUNT(1) FROM Decks WHERE deck_id = $1 LIMIT 1;");

        let deck_exists = db_conn.query_row(query, &[&deck_id], |row| -> bool {
            let count: i64 = row.get(0);
            return count == 1;
        });

        match deck_exists {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(deck_exists) => {
                return Ok(deck_exists);
            }
        };
    }

    pub fn create(&self, create_deck_request: &CreateDeck) -> Result<i64, QueryError> {


        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query = format!("INSERT INTO Decks(name, description) VALUES ($1, $2);");

        let description = match create_deck_request.description {
            Some(ref description) => description.clone(),
            None => "".to_string()
        };

        let params: &[&ToSql] = &[

            // required
            &create_deck_request.name, // $1

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

    pub fn delete(&self, deck_id: i64) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        // depth-first delete on deck's children

        let ref query_delete = format!("
            DELETE FROM Decks
            WHERE deck_id IN (
                SELECT descendent
                    FROM DecksClosure
                WHERE
                    ancestor = $1
            );
        ");

        let params: &[&ToSql] = &[
            &deck_id, // $1
        ];

        match db_conn.execute(query_delete, params) {
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

    pub fn connect_decks(&self, child: i64, parent: i64) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        // moving a child deck subtree consists of two procedures:
        // 1. delete any and all subtree connections between child (and its descendants)
        //    and the child's ancestors
        let ref query_delete = format!("
            DELETE FROM DecksClosure

            /* select all descendents of child */
            WHERE descendent IN (
                SELECT descendent
                FROM DecksClosure
                WHERE ancestor = $1
            )
            AND

            /* select all ancestors of child but not child itself */
            ancestor IN (
                SELECT ancestor
                FROM DecksClosure
                WHERE descendent = $1
                AND ancestor != descendent
            );
        ");

        let params: &[&ToSql] = &[
            &child, // $1
        ];

        match db_conn.execute(query_delete, params) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query_delete.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }

        // 2. make parent (and its ancestors) be ancestors of child deck (and its descendants)
        let ref query_insert = format!("
            INSERT OR IGNORE INTO DecksClosure(ancestor, descendent, depth)
            SELECT p.ancestor, c.descendent, p.depth+c.depth+1
                FROM DecksClosure AS p, DecksClosure AS c
            WHERE
                c.ancestor = $1
                AND p.descendent = $2;
        ");

        let params: &[&ToSql] = &[
            &child, // $1
            &parent, // $2
        ];

        match db_conn.execute(query_insert, params) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query_insert.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }

        return Ok(());
    }
}


