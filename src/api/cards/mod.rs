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
pub struct CreateCard {
    title: String,
    description: Option<String>,
    front: String,
    back: String,
    deck: i64,
}

#[derive(Debug, RustcEncodable)]
struct Card {
    id: i64,
    title: String,
    description: String,
    front: String,
    back: String,
    deck: i64,
    created_at: i64, // unix timestamp
    updated_at: i64  // unix timestamp
}

#[derive(Debug, RustcEncodable)]
struct CardResponse {
    id: i64,
    title: String,
    description: String,
    front: String,
    back: String,
    deck: i64,
    created_at: i64, // unix timestamp
    updated_at: i64  // unix timestamp
    // stashes: Vec<i64>
}

impl CardResponse {

    pub fn to_json(&self) -> String {
        return json::encode(self).unwrap();
    }
}

#[derive(Debug, Clone)]
pub struct CardsAPI {
    pub db: Arc<DB>,
}

impl CardsAPI {

    pub fn get_response(&self, card_id: i64) -> Result<CardResponse, QueryError> {

        // get props

        let maybe_card: Result<Card, QueryError> = self.get(card_id);
        let card: Card = match maybe_card {
            Err(why) => {
                // why: QueryError
                return Err(why);
            },
            Ok(card) => card,
        };

        let response = CardResponse {
            id: card.id,
            title: card.title,
            description: card.description,
            front: card.front,
            back: card.back,
            deck: card.deck,
            created_at: card.created_at,
            updated_at: card.updated_at
        };

        return Ok(response);
    }

    pub fn get(&self, card_id: i64) -> Result<Card, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT card_id, title, description, front, back, deck, created_at, updated_at
            FROM Cards
            WHERE card_id = :card_id
            LIMIT 1;
        ");

        let results = db_conn.query_row(query, &[&card_id], |row| -> Card {
            return Card {
                id: row.get(0),
                title: row.get(1),
                description: row.get(2),
                front: row.get(3),
                back: row.get(4),
                deck: row.get(5),
                created_at: row.get(6),
                updated_at: row.get(7)
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
            Ok(card) => {
                return Ok(card);
            }
        };
    }

    pub fn create(&self, create_card_request: &CreateCard) -> Result<i64, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let description = match create_card_request.description {
            Some(ref description) => description.clone(),
            None => "".to_string()
        };

        let ref query = format!("
            INSERT INTO Cards(title, description, front, back, deck)
            VALUES (:title, :description, :front, :back, :deck);
        ");

        let params: &[(&str, &ToSql)] = &[

            // required
            (":title", &create_card_request.title),

            // optional
            (":description", &description),

            (":front", &create_card_request.front),

            (":back", &create_card_request.back),

            (":deck", &create_card_request.deck)
        ];

        match db_conn.execute_named(query, params) {
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
}
