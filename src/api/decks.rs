extern crate rusqlite;

use rusqlite::SqliteConnection;
use std::sync::{Arc, RwLock};

pub struct Decks {
    pub db_conn: Arc<RwLock<SqliteConnection>>,
}

impl Decks {

    pub fn get(&self, deck_id: i64) -> String {

        return "lol".to_string();
    }
}
