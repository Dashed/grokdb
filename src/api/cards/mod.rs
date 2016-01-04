extern crate rusqlite;
extern crate rustc_serialize;

pub mod restify;

use std::sync::Arc;

use rusqlite::types::ToSql;
use rusqlite::{SqliteStatement};
use rustc_serialize::json;

use ::api::{GrokDB};
use ::api::review::ReviewResponse;
use ::database::{DB, QueryError};
pub use self::restify::restify;


pub enum SortBy {
    CreatedAt,
    UpdatedAt,
    Title,
    ReviewedDate,
    TimesReviewed,
    // TODO: implement
    // RawScore,
}

pub enum SortOrder {
    Descending,
    Ascending
}

pub struct CardsPageRequest {
    page: i64,
    per_page: i64,
    sort_by: SortBy,
    order: SortOrder
}

impl CardsPageRequest {

    pub fn get_offset(&self) -> i64 {
        let offset: i64 = (self.page - 1) * self.per_page;
        return offset;
    }
}

#[derive(Debug, Clone, RustcDecodable)]
pub struct CreateCard {
    title: String,
    description: Option<String>,
    front: String,
    back: String,
    deck: i64,
}

#[derive(Debug, Clone, RustcDecodable)]
pub struct CreateCardForDeck {
    title: String,
    description: Option<String>,
    front: String,
    back: String
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

    #[allow(unused_parens)]
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
pub struct CardPaginationInfo {
    num_of_cards: i64
}

impl CardPaginationInfo {

    pub fn to_json(&self) -> String {
        return json::encode(self).unwrap();
    }
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
    updated_at: i64,  // unix timestamp
    review_stat: ReviewResponse
    // TODO: needed?
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

    pub fn get_response(&self, grokdb: &GrokDB, card_id: i64) -> Result<CardResponse, QueryError> {

        // get props

        let maybe_card: Result<Card, QueryError> = self.get(card_id);
        let card: Card = match maybe_card {
            Err(why) => {
                // why: QueryError
                return Err(why);
            },
            Ok(card) => card,
        };

        let review_stat: ReviewResponse = match grokdb.review.get_review_stat(card_id) {
            Err(why) => {
                // why: QueryError
                return Err(why);
            },
            Ok(review_stat) => review_stat
        };

        let response = CardResponse {
            id: card.id,
            title: card.title,
            description: card.description,
            front: card.front,
            back: card.back,
            deck: card.deck,
            created_at: card.created_at,
            updated_at: card.updated_at,
            review_stat: review_stat
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

        let results = db_conn.query_named_row(query, &[(":card_id", &card_id)], |row| -> Card {
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

    pub fn count_by_deck(&self, deck_id: i64) -> Result<i64, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                COUNT(1)
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            WHERE dc.ancestor = :deck_id;
        ");

        let params: &[(&str, &ToSql)] = &[
            (":deck_id", &deck_id)
        ];

        let maybe_count = db_conn.query_named_row(query, params, |row| -> i64 {
            return row.get(0);
        });

        match maybe_count {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(count) => {
                return Ok(count);
            }
        };
    }

    pub fn get_by_deck(&self, deck_id: i64, page_query: CardsPageRequest) -> Result<Vec<i64>, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref page_query = page_query;

        let ref query = get_by_deck_query(page_query);

        let params: &[(&str, &ToSql)] = &[
            (":deck_id", &deck_id),
            (":offset", &(page_query.get_offset())),
            (":per_page", &(page_query.per_page))
        ];

        let maybe_stmt = db_conn.prepare(query);

        if maybe_stmt.is_err() {

            let why = maybe_stmt.unwrap_err();

            let err = QueryError {
                sqlite_error: why,
                query: query.clone(),
            };
            return Err(err);
        }

        let mut stmt: SqliteStatement = maybe_stmt.unwrap();

        let maybe_iter = stmt.query_named(params);

        match maybe_iter {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(iter) => {

                let mut vec_of_card_id: Vec<i64> = Vec::new();

                for result_row in iter {

                    let card_id: i64 = match result_row {
                        Err(why) => {
                            let err = QueryError {
                                sqlite_error: why,
                                query: query.clone(),
                            };
                            return Err(err);
                        },
                        Ok(row) => row.get(0)
                    };

                    vec_of_card_id.push(card_id);
                }

                let vec_of_card_id = vec_of_card_id;

                return Ok(vec_of_card_id);
            }
        };

    }

    pub fn exists(&self, card_id: i64) -> Result<bool, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT COUNT(1)
            FROM Cards
            WHERE card_id = $1 LIMIT 1;
        ");

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

    pub fn create_for_deck(&self, deck_id: i64, create_card_request: &CreateCardForDeck) -> Result<i64, QueryError> {

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

            (":deck", &deck_id)
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

    pub fn create(&self, create_card_request: &CreateCard) -> Result<i64, QueryError> {

        let deck_id = create_card_request.deck;

        let ref create_card_request = CreateCardForDeck {
            title: create_card_request.title.clone(),
            description: create_card_request.description.clone(),
            front: create_card_request.front.clone(),
            back: create_card_request.back.clone()
        };

        return self.create_for_deck(deck_id, create_card_request);

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

    pub fn delete(&self, card_id: i64) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query_delete = format!("
            DELETE FROM Cards WHERE card_id = :card_id;
        ");

        let params: &[(&str, &ToSql)] = &[
            (":card_id", &card_id)
        ];

        match db_conn.execute_named(query_delete, params) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query_delete.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }

        return Ok(());
    }

    pub fn deck_has_card(&self, deck_id: i64, card_id: i64) -> Result<bool, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                COUNT(1)
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            WHERE
                dc.ancestor = :deck_id
            AND
                c.card_id = :card_id
            LIMIT 1;
        ");

        let params: &[(&str, &ToSql)] = &[
            (":card_id", &card_id),
            (":deck_id", &deck_id)
        ];

        let deck_exists = db_conn.query_named_row(query, params, |row| -> bool {
            let count: i64 = row.get(0);
            return count >= 1;
        });

        match deck_exists {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(deck_exists) => {
                return Ok(deck_exists);
            }
        };

    }

    pub fn count_by_stash(&self, stash_id: i64) -> Result<i64, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                COUNT(1)
            FROM
                StashCards
            WHERE stash = :stash_id;
        ");

        let params: &[(&str, &ToSql)] = &[
            (":stash_id", &stash_id)
        ];

        let maybe_count = db_conn.query_named_row(query, params, |row| -> i64 {
            return row.get(0);
        });

        match maybe_count {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(count) => {
                return Ok(count);
            }
        };
    }

    // TODO: StashCards trait for CardsPageRequest => query = page_query.generate_query()
    pub fn get_by_stash(&self, stash_id: i64, page_query: CardsPageRequest) -> Result<Vec<i64>, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        // invariant: page_query.offset is legal

        let ref page_query = page_query;

        let ref query = get_by_stash_query(page_query);

        let params: &[(&str, &ToSql)] = &[
            (":stash_id", &stash_id),
            (":offset", &(page_query.get_offset())),
            (":per_page", &(page_query.per_page))
        ];

        let maybe_stmt = db_conn.prepare(query);

        if maybe_stmt.is_err() {

            let why = maybe_stmt.unwrap_err();

            let err = QueryError {
                sqlite_error: why,
                query: query.clone(),
            };
            return Err(err);
        }

        let mut stmt: SqliteStatement = maybe_stmt.unwrap();

        let maybe_iter = stmt.query_named(params);

        match maybe_iter {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(iter) => {

                let mut vec_of_card_id: Vec<i64> = Vec::new();

                for result_row in iter {

                    let card_id: i64 = match result_row {
                        Err(why) => {
                            let err = QueryError {
                                sqlite_error: why,
                                query: query.clone(),
                            };
                            return Err(err);
                        },
                        Ok(row) => row.get(0)
                    };

                    vec_of_card_id.push(card_id);
                }

                return Ok(vec_of_card_id);
            }
        };
    }
}

/* helpers */

fn get_by_deck_query(page_query: &CardsPageRequest) -> String {

    let sort_order: &str = match page_query.order {
        SortOrder::Descending => "DESC",
        SortOrder::Ascending => "ASC"
    };

    let query = match page_query.sort_by {

        SortBy::CreatedAt => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM DecksClosure AS dc

                INNER JOIN Cards AS c
                ON c.deck = dc.descendent

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM DecksClosure AS dc

                    INNER JOIN Cards AS c
                    ON c.deck = dc.descendent

                    WHERE dc.ancestor = :deck_id
                    ORDER BY c.created_at {sort_order} LIMIT :offset
                )
                AND
                dc.ancestor = :deck_id
                ORDER BY c.created_at {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },

        SortBy::UpdatedAt => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM DecksClosure AS dc

                INNER JOIN Cards AS c
                ON c.deck = dc.descendent

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM DecksClosure AS dc

                    INNER JOIN Cards AS c
                    ON c.deck = dc.descendent

                    WHERE dc.ancestor = :deck_id
                    ORDER BY c.updated_at {sort_order} LIMIT :offset
                )
                AND
                dc.ancestor = :deck_id
                ORDER BY c.updated_at {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },

        SortBy::Title => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM DecksClosure AS dc

                INNER JOIN Cards AS c
                ON c.deck = dc.descendent

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM DecksClosure AS dc

                    INNER JOIN Cards AS c
                    ON c.deck = dc.descendent

                    WHERE dc.ancestor = :deck_id
                    ORDER BY c.title {sort_order} LIMIT :offset
                )
                AND
                dc.ancestor = :deck_id
                ORDER BY c.title {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },

        SortBy::ReviewedDate => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM DecksClosure AS dc

                INNER JOIN Cards AS c
                ON c.deck = dc.descendent

                INNER JOIN CardsScore AS cs
                ON cs.card = c.card_id

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM DecksClosure AS dc

                    INNER JOIN Cards AS c
                    ON c.deck = dc.descendent

                    INNER JOIN CardsScore AS cs
                    ON cs.card = c.card_id

                    WHERE dc.ancestor = :deck_id
                    ORDER BY cs.updated_at {sort_order} LIMIT :offset
                )
                AND
                dc.ancestor = :deck_id
                ORDER BY cs.updated_at {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },

        SortBy::TimesReviewed => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM DecksClosure AS dc

                INNER JOIN Cards AS c
                ON c.deck = dc.descendent

                INNER JOIN CardsScore AS cs
                ON cs.card = c.card_id

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM DecksClosure AS dc

                    INNER JOIN Cards AS c
                    ON c.deck = dc.descendent

                    INNER JOIN CardsScore AS cs
                    ON cs.card = c.card_id

                    WHERE dc.ancestor = :deck_id
                    ORDER BY cs.times_reviewed {sort_order} LIMIT :offset
                )
                AND
                dc.ancestor = :deck_id
                ORDER BY cs.times_reviewed {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },
    };

    return query;
}

fn get_by_stash_query(page_query: &CardsPageRequest) -> String {

    let sort_order: &str = match page_query.order {
        SortOrder::Descending => "DESC",
        SortOrder::Ascending => "ASC"
    };

    let query = match page_query.sort_by {

        SortBy::CreatedAt => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM StashCards AS sc

                INNER JOIN Cards AS c
                ON c.card_id = sc.card

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM StashCards AS sc

                    INNER JOIN Cards AS c
                    ON c.card_id = sc.card

                    WHERE sc.stash = :stash_id
                    ORDER BY c.created_at {sort_order} LIMIT :offset
                )
                AND
                sc.stash = :stash_id
                ORDER BY c.created_at {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },

        SortBy::UpdatedAt => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM StashCards AS sc

                INNER JOIN Cards AS c
                ON c.card_id = sc.card

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM StashCards AS sc

                    INNER JOIN Cards AS c
                    ON c.card_id = sc.card

                    WHERE sc.stash = :stash_id
                    ORDER BY c.updated_at {sort_order} LIMIT :offset
                )
                AND
                sc.stash = :stash_id
                ORDER BY c.updated_at {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },

        SortBy::Title => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM StashCards AS sc

                INNER JOIN Cards AS c
                ON c.card_id = sc.card

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM StashCards AS sc

                    INNER JOIN Cards AS c
                    ON c.card_id = sc.card

                    WHERE sc.stash = :stash_id
                    ORDER BY c.title {sort_order} LIMIT :offset
                )
                AND
                sc.stash = :stash_id
                ORDER BY c.title {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },

        SortBy::ReviewedDate => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM StashCards AS sc

                INNER JOIN Cards AS c
                ON c.card_id = sc.card

                INNER JOIN CardsScore AS cs
                ON cs.card = c.card_id

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM StashCards AS sc

                    INNER JOIN Cards AS c
                    ON c.card_id = sc.card

                    INNER JOIN CardsScore AS cs
                    ON cs.card = c.card_id

                    WHERE sc.stash = :stash_id
                    ORDER BY cs.updated_at {sort_order} LIMIT :offset
                )
                AND
                sc.stash = :stash_id
                ORDER BY cs.updated_at {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },

        SortBy::TimesReviewed => {
            format!("
                SELECT
                    c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
                FROM StashCards AS sc

                INNER JOIN Cards AS c
                ON c.card_id = sc.card

                INNER JOIN CardsScore AS cs
                ON cs.card = c.card_id

                WHERE
                c.oid NOT IN (
                    SELECT
                        c.oid
                    FROM StashCards AS sc

                    INNER JOIN Cards AS c
                    ON c.card_id = sc.card

                    INNER JOIN CardsScore AS cs
                    ON cs.card = c.card_id

                    WHERE sc.stash = :stash_id
                    ORDER BY cs.times_reviewed {sort_order} LIMIT :offset
                )
                AND
                sc.stash = :stash_id
                ORDER BY cs.times_reviewed {sort_order} LIMIT :per_page;
            ", sort_order = sort_order)
        },
    };

    return query;
}
