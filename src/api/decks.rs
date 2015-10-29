extern crate rusqlite;

use std::sync::Arc;

use ::database::DB;

pub struct Decks {
    pub db: Arc<DB>,
}

impl Decks {

    pub fn get(&self, deck_id: i64) -> String {

        return "lol".to_string();
    }
}
