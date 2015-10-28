use std::sync::Arc;

use ::database::{DBPortal, Message};

pub struct Decks {
    pub db_portal: Arc<DBPortal>,
}

impl Decks {

    pub fn get(&self, deck_id: i64) -> String {

        let foo = format!("deck: {}", deck_id);

        let msg = Message::Write(foo);

        let response = self.db_portal.write(msg);

        return response;
    }
}
