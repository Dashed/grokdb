
pub const DECKS: &'static str = "
CREATE TABLE IF NOT EXISTS Decks (
    deck_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    CHECK (name <> '') /* ensure not empty */
);
";
