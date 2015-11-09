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

#[derive(Debug, Clone, RustcDecodable)]
pub struct UpdateCard {
    title: Option<String>,
    description: Option<String>,
    front: Option<String>,
    back: Option<String>,
    deck: Option<i64>,
}

impl UpdateCard {

    pub fn should_update(&self) -> bool {

        return (
            self.title.is_some() ||
            self.description.is_some() ||
            self.front.is_some() ||
            self.back.is_some() ||
            self.deck.is_some()
        );
    }

    // get fields to update.
    // this is a helper to construct the sql update query
    pub fn sqlize(&self) -> (String, Vec<(&str, &ToSql)>) {

        let mut fields: Vec<String> = vec![];
        let mut values: Vec<(&str, &ToSql)> = vec![];

        if self.title.is_some() {
            fields.push(format!("title = :title"));
            let tuple: (&str, &ToSql) = (":title", self.title.as_ref().unwrap());
            values.push(tuple);
        }

        if self.description.is_some() {
            fields.push(format!("description = :description"));
            let tuple: (&str, &ToSql) = (":description", self.description.as_ref().unwrap());
            values.push(tuple);
        }

        if self.front.is_some() {
            fields.push(format!("front = :front"));
            let tuple: (&str, &ToSql) = (":front", self.front.as_ref().unwrap());
            values.push(tuple);
        }

        if self.back.is_some() {
            fields.push(format!("back = :back"));
            let tuple: (&str, &ToSql) = (":back", self.back.as_ref().unwrap());
            values.push(tuple);
        }

        if self.deck.is_some() {
            fields.push(format!("deck = :deck"));
            let tuple: (&str, &ToSql) = (":deck", self.deck.as_ref().unwrap());
            values.push(tuple);
        }

        return (fields.join(", "), values);
    }
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

    pub fn exists(&self, card_id: i64) -> Result<bool, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("SELECT COUNT(1) FROM Cards WHERE card_id = $1 LIMIT 1;");

        let card_exists = db_conn.query_row(query, &[&card_id], |row| -> bool {
            let count: i64 = row.get(0);
            return count >= 1;
        });

        match card_exists {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(card_exists) => {
                return Ok(card_exists);
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

    pub fn update(&self, card_id: i64, update_card_request: &UpdateCard) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let (fields, values): (String, Vec<(&str, &ToSql)>) = update_card_request.sqlize();

        let mut values = values;
        values.push((":card_id", &card_id));
        let values = values;

        let ref query_update = format!("
            UPDATE Cards
            SET
            {fields}
            WHERE card_id = :card_id;
        ", fields = fields);

        match db_conn.execute_named(query_update, &values[..]) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query_update.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }

        return Ok(());
    }
}
