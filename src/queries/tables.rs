pub const SETUP: [&'static str; 23] = [

    // configs

    CONFIGS,

    // configs/triggers

    CONFIG_ON_UPDATE_TRIGGER,

    // decks

    DECKS,
    DECKSCLOSURE,

    // decks/indices

    DECKSCLOSURE_DEPTH_INDEX,

    // decks/triggers

    DECK_ON_UPDATE_TRIGGER,
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
    CARDS_SCORE_HISTORY_OCCURED_AT_INDEX,

    // stashes
    STASHES,
    STASHES_CARDS,

    // stashes/triggers
    STASHES_ON_UPDATE_TRIGGER,

    // review
    CACHED_DECK_REVIEW,
    CACHED_STASH_REVIEW
];

/**
 * All SQL comply with syntax supported with SQLite v3.9.1
 */

/* configs */

// note: CHECK (setting <> '') ensures setting is non-empty string
const CONFIGS: &'static str = "
CREATE TABLE IF NOT EXISTS Configs (
    setting TEXT PRIMARY KEY NOT NULL,
    value TEXT,

    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')),

    CHECK (setting <> '')
);
";

const CONFIG_ON_UPDATE_TRIGGER: &'static str = "
CREATE TRIGGER IF NOT EXISTS CONFIG_ON_UPDATE_TRIGGER
AFTER UPDATE OF
    setting, value
ON Configs
BEGIN
    UPDATE Configs SET updated_at = strftime('%s', 'now') WHERE setting = NEW.setting;
END;
";

/* decks */

// note: updated_at is when the deck was modified, not when it was reviewed.
// note: CHECK (name <> '') ensures name is non-empty string
const DECKS: &'static str = "
CREATE TABLE IF NOT EXISTS Decks (
    deck_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',

    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    reviewed_at INT NOT NULL DEFAULT (strftime('%s', 'now')),

    CHECK (name <> '')
);
";

const DECK_ON_UPDATE_TRIGGER: &'static str = "
CREATE TRIGGER IF NOT EXISTS DECK_ON_UPDATE_TRIGGER
AFTER UPDATE OF
    name, description
ON Decks
BEGIN
    UPDATE Decks SET updated_at = strftime('%s', 'now') WHERE deck_id = NEW.deck_id;
END;
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

// note: updated_at is when the card was modified. not when it was seen.
// note: CHECK (title <> '') ensures title is non-empty string
const CARDS: &'static str = "
CREATE TABLE IF NOT EXISTS Cards (
    card_id INTEGER PRIMARY KEY NOT NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',

    front TEXT NOT NULL DEFAULT '',

    back TEXT NOT NULL DEFAULT '',

    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')),

    deck INTEGER NOT NULL,

    CHECK (title <> ''),
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

// changelog is internal for CardsScoreHistory to take snapshot of.
// times_seen is number of times a card was put up for review.
// times_reviewed is number of times a card was actually reviewed. skipping a card
// is not actually reviewing the card.
const CARDS_SCORE: &'static str = "
CREATE TABLE IF NOT EXISTS CardsScore (
    success INTEGER NOT NULL DEFAULT 0,
    fail INTEGER NOT NULL DEFAULT 0,
    times_reviewed INT NOT NULL DEFAULT 0,
    times_seen INT NOT NULL DEFAULT 0,
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    changelog TEXT NOT NULL DEFAULT '',

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
    UPDATE
        CardsScore
    SET
        updated_at = strftime('%s', 'now'),
        times_seen = times_seen + 1
    WHERE card = NEW.card;
END;
";

// enforce 1-1 relationship
const CARDS_SCORE_INDEX: &'static str = "
CREATE UNIQUE INDEX IF NOT EXISTS CARDS_SCORE_INDEX ON CardsScore (card);
";

/* cards score history */

// changelog is internal for CardsScoreHistory to take snapshot of
const CARDS_SCORE_HISTORY: &'static str = "
CREATE TABLE IF NOT EXISTS CardsScoreHistory (

    occured_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    success INTEGER NOT NULL DEFAULT 0,
    fail INTEGER NOT NULL DEFAULT 0,
    changelog TEXT NOT NULL DEFAULT '',
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
   VALUES (strftime('%s', 'now'), (NEW.success - OLD.success), (NEW.fail - OLD.fail), NEW.changelog, NEW.card);
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

/* stashes */

// note: updated_at is when the stash was modified, not when it was reviewed.
// note: CHECK (name <> '') ensures name is non-empty string
const STASHES: &'static str = "
CREATE TABLE IF NOT EXISTS Stashes (
    stash_id INTEGER PRIMARY KEY NOT NULL,

    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',

    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    reviewed_at INT NOT NULL DEFAULT (strftime('%s', 'now')),

    CHECK (name <> '')
);
";

// cards that belong to a stash
const STASHES_CARDS: &'static str = "
CREATE TABLE IF NOT EXISTS StashCards (

    stash INTEGER NOT NULL,
    card INTEGER NOT NULL,

    added_at INT NOT NULL DEFAULT (strftime('%s', 'now')),

    PRIMARY KEY(stash, card),

    FOREIGN KEY (stash) REFERENCES Stashes(stash_id) ON DELETE CASCADE,
    FOREIGN KEY (card) REFERENCES Cards(card_id) ON DELETE CASCADE
);
";

const STASHES_ON_UPDATE_TRIGGER: &'static str = "
CREATE TRIGGER IF NOT EXISTS STASHES_ON_UPDATE_TRIGGER
AFTER UPDATE OF
    name, description
ON Stashes
BEGIN
    UPDATE Stashes SET updated_at = strftime('%s', 'now') WHERE stash_id = NEW.stash_id;
END;
";


/* review */

const CACHED_DECK_REVIEW: &'static str = "
CREATE TABLE IF NOT EXISTS CachedDeckReview (
    deck INTEGER NOT NULL,
    card INTEGER NOT NULL,
    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),

    PRIMARY KEY(deck),

    FOREIGN KEY (deck) REFERENCES Decks(deck_id) ON DELETE CASCADE,
    FOREIGN KEY (card) REFERENCES Cards(card_id) ON DELETE CASCADE
);
";

const CACHED_STASH_REVIEW: &'static str = "
CREATE TABLE IF NOT EXISTS CachedStashReview (
    stash INTEGER NOT NULL,
    card INTEGER NOT NULL,
    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),

    PRIMARY KEY(stash),

    FOREIGN KEY (stash) REFERENCES Stashes(stash_id) ON DELETE CASCADE,
    FOREIGN KEY (card) REFERENCES Cards(card_id) ON DELETE CASCADE
);
";
