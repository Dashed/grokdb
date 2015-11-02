extern crate iron;
extern crate rusqlite;
extern crate router;
extern crate rustc_serialize;

mod restify;

use std::sync::Arc;

use rusqlite::types::ToSql;
use rustc_serialize::json;

use ::database::{DB, QueryError};
pub use self::restify::restify;


#[derive(Debug, Clone, RustcDecodable)]
pub struct CreateDeck {
    name: String,
    description: Option<String>,
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

    pub fn create(&self, create_deck_request: CreateDeck) -> Result<i64, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query = format!("INSERT INTO Decks(name, description) VALUES ($1, $2);");
        let params: &[&ToSql] = &[

            // required
            &create_deck_request.name,

            // optional
            &create_deck_request.description.unwrap_or("".to_string())
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

    pub fn get(&self, deck_id: i64) -> Result<Deck, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("SELECT deck_id, name, description FROM Decks WHERE deck_id = $1;");

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
}


