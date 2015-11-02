extern crate iron;
extern crate rusqlite;
extern crate router;

mod restify;

use std::sync::Arc;

use ::database::DB;

pub use self::restify::restify;

pub struct Decks {
    pub db: Arc<DB>,
}

impl Decks {

    pub fn create(&self, create_deck_request: CreateDeck) -> String {
        return "lol".to_string();
    }

    pub fn get(&self, deck_id: i64) -> String {

        return "lol".to_string();
    }
}

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

}
