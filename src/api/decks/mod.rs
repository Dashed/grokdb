extern crate iron;
extern crate rusqlite;
extern crate router;

mod restify;

use std::sync::Arc;

use ::database::{DB, QueryError};

pub use self::restify::restify;


#[derive(Debug, Clone, RustcDecodable)]
pub struct CreateDeck {
    name: String,
    description: Option<String>,
}

struct Deck {
    name: String,
    description: String,
}


impl Deck {
    pub fn to_json() {

    }
}

pub struct Decks {
    pub db: Arc<DB>,
}

impl Decks {

    pub fn create(&self, create_deck_request: CreateDeck) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query = format!("INSERT INTO Decks(name, description) VALUES ($1, $2);");
        let params: &[&rusqlite::types::ToSql] = &[
            &create_deck_request.name,
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

        return Ok(());
    }

    pub fn get(&self, deck_id: i64) -> String {

        return "lol".to_string();
    }
}


