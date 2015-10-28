pub mod decks;

use std::sync::Arc;
use super::database::DBPortal;
use self::decks::Decks;

pub struct GrokDB {
    pub decks: Decks,
}

pub fn new(database_name: String) -> GrokDB {

    // open db connection
    let db_portal: Arc<DBPortal> = Arc::new(super::database::bootstrap(database_name));


    return GrokDB {
        decks: Decks {
            db_portal: db_portal
        }
    };

}
