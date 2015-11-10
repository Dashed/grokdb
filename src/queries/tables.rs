pub const SETUP: [&'static str; 16] = [

    // configs

    CONFIGS,

    // decks

    DECKS,
    DECKSCLOSURE,

    // decks/indices

    DECKSCLOSURE_DEPTH_INDEX,

    // decks/triggers

    DECKSCLOSURE_NEW_DECK_TRIGGER,

    // cards

    CARDS,

    // cards/indices

    CARD_ID_INDEX,

    // cards/triggers

    UPDATED_CARD_TRIGGER,

    // cards score

    CARDS_SCORE,

    // cards score/triggers

    CARDS_SCORE_ON_NEW_CARD_TRIGGER,
    CARDS_SCORE_ON_UPDATED_TRIGGER,

    // cards score/indices

    CARDS_SCORE_INDEX,

    // cards score history

    CARDS_SCORE_HISTORY,

    // cards score history/triggers

    SNAPSHOT_CARDS_SCORE_ON_UPDATED_TRIGGER,

    // cards score history/indices
    CARDS_SCORE_HISTORY_CARD_INDEX,
    CARDS_SCORE_HISTORY_OCCURED_AT_INDEX
];

/**
 * All SQL comply with syntax supported with SQLite v3.9.1
 */

/* configs */

const CONFIGS: &'static str = "
CREATE TABLE IF NOT EXISTS Config (
    setting TEXT PRIMARY KEY NOT NULL,
    value TEXT,
    CHECK (setting <> '') /* ensure not empty */
);
";



/* decks */

const DECKS: &'static str = "
CREATE TABLE IF NOT EXISTS Decks (
    deck_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    CHECK (name <> '') /* ensure not empty */
);
";

// description of the closure table from:
// - https://pragprog.com/titles/bksqla/sql-antipatterns
// - http://dirtsimple.org/2010/11/simplest-way-to-do-tree-based-queries.html
//
// allows nested decks

const DECKSCLOSURE: &'static str = "
CREATE TABLE IF NOT EXISTS DecksClosure (
    ancestor INTEGER NOT NULL,
    descendent INTEGER NOT NULL,
    depth INTEGER NOT NULL,
    PRIMARY KEY(ancestor, descendent),
    FOREIGN KEY (ancestor) REFERENCES Decks(deck_id) ON DELETE CASCADE,
    FOREIGN KEY (descendent) REFERENCES Decks(deck_id) ON DELETE CASCADE
);
";

const DECKSCLOSURE_DEPTH_INDEX: &'static str = "
CREATE INDEX IF NOT EXISTS DECKSCLOSURE_DEPTH_INDEX
ON DecksClosure (depth DESC);
";

// any and all node Decks are an/a ancestor/descendent of itself.
const DECKSCLOSURE_NEW_DECK_TRIGGER: &'static str = "
CREATE TRIGGER IF NOT EXISTS DECKSCLOSURE_NEW_DECK_TRIGGER
AFTER INSERT
ON Decks
BEGIN
    INSERT OR IGNORE INTO DecksClosure(ancestor, descendent, depth) VALUES (NEW.deck_id, NEW.deck_id, 0);
END;
";

/* cards */

const CARDS: &'static str = "
CREATE TABLE IF NOT EXISTS Cards (
    card_id INTEGER PRIMARY KEY NOT NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',

    front TEXT NOT NULL DEFAULT '',

    back TEXT NOT NULL DEFAULT '',

    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')), /* note: time when the card was modified. not when it was seen. */

    deck INTEGER NOT NULL,

    CHECK (title <> ''), /* ensure not empty */
    FOREIGN KEY (deck) REFERENCES Decks(deck_id) ON DELETE CASCADE
);
";

const CARD_ID_INDEX: &'static str = "
CREATE INDEX IF NOT EXISTS CARD_ID_INDEX
ON Cards (deck);
";

const UPDATED_CARD_TRIGGER: &'static str = "
CREATE TRIGGER IF NOT EXISTS UPDATED_CARD_TRIGGER
AFTER UPDATE OF
    title, description, front, back, deck
ON Cards
BEGIN
    UPDATE Cards SET updated_at = strftime('%s', 'now') WHERE card_id = NEW.card_id;
END;
";

/* cards score */

const CARDS_SCORE: &'static str = "
CREATE TABLE IF NOT EXISTS CardsScore (
    success INTEGER NOT NULL DEFAULT 0,
    fail INTEGER NOT NULL DEFAULT 0,
    times_reviewed INT NOT NULL DEFAULT 0,
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    changelog TEXT NOT NULL DEFAULT '', /* internal for CardsScoreHistory to take snapshot of */

    card INTEGER NOT NULL,

    PRIMARY KEY(card),

    FOREIGN KEY (card) REFERENCES Cards(card_id) ON DELETE CASCADE
);
";

const CARDS_SCORE_ON_NEW_CARD_TRIGGER: &'static str = "
CREATE TRIGGER IF NOT EXISTS CARDS_SCORE_ON_NEW_CARD_TRIGGER
AFTER INSERT
ON Cards
BEGIN
    INSERT OR IGNORE INTO CardsScore(card) VALUES (NEW.card_id);
END;
";

const CARDS_SCORE_ON_UPDATED_TRIGGER: &'static str = "
CREATE TRIGGER IF NOT EXISTS CARDS_SCORE_ON_UPDATED_TRIGGER
AFTER UPDATE OF
    success, fail
ON CardsScore
BEGIN
    UPDATE CardsScore SET updated_at = strftime('%s', 'now') WHERE card = NEW.card;
END;
";

// enforce 1-1 relationship
const CARDS_SCORE_INDEX: &'static str = "
CREATE UNIQUE INDEX IF NOT EXISTS CARDS_SCORE_INDEX ON CardsScore (card);
";

/* cards score history */

const CARDS_SCORE_HISTORY: &'static str = "
CREATE TABLE IF NOT EXISTS CardsScoreHistory (

    occured_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    success INTEGER NOT NULL DEFAULT 0,
    fail INTEGER NOT NULL DEFAULT 0,
    changelog TEXT NOT NULL DEFAULT '', /* internal for CardsScoreHistory to take snapshot of */
    card INTEGER NOT NULL,

    FOREIGN KEY (card) REFERENCES Cards(card_id) ON DELETE CASCADE
);
";

const SNAPSHOT_CARDS_SCORE_ON_UPDATED_TRIGGER: &'static str = "
CREATE TRIGGER IF NOT EXISTS SNAPSHOT_CARDS_SCORE_ON_UPDATED_TRIGGER
AFTER UPDATE
OF success, fail, changelog
ON CardsScore
BEGIN
   INSERT INTO CardsScoreHistory(occured_at, success, fail, changelog, card)
   VALUES (strftime('%s', 'now'), NEW.success, NEW.fail, NEW.changelog, NEW.card);
END;
";

const CARDS_SCORE_HISTORY_CARD_INDEX: &'static str = "
CREATE INDEX IF NOT EXISTS CARDS_SCORE_HISTORY_CARD_INDEX
ON CardsScoreHistory (card);
";

const CARDS_SCORE_HISTORY_OCCURED_AT_INDEX: &'static str = "
CREATE INDEX IF NOT EXISTS CARDS_SCORE_HISTORY_OCCURED_AT_INDEX
ON CardsScoreHistory (occured_at DESC);
";
