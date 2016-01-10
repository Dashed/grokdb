extern crate rusqlite;

use std::sync::Arc;
use std::ops::Deref;

use rusqlite::types::ToSql;

use ::database::{DB, QueryError};
use ::api::GrokDB;
use ::api::review::ReviewableSelection;

pub struct ReviewableDeck {
    pub deck_id: i64,
    pub grokdb: Arc<GrokDB>
}

impl ReviewableDeck {

    // check if the card is within the deck or the deck's descendents
    pub fn has_card(&self, card_id: i64) -> Result<bool, QueryError> {

        let ref grokdb = self.grokdb.deref();

        return grokdb.cards.deck_has_card(self.deck_id, card_id);

    }

    // returns cached card id for this deck.
    // if a cached entry exists, it's not guaranteed that the card is still in the deck.
    fn __get_cached_card(&self) -> Result<Option<i64>, QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let params: &[(&str, &ToSql)] = &[
            (":deck_id", &(self.deck_id))
        ];

        // TODO: can be simplified if this is fixed: https://github.com/jgallagher/rusqlite/issues/79
        // ensure a cache entry exists for this deck
        let ref query_count = format!("
            SELECT
                COUNT(1)
            FROM CachedDeckReview
            WHERE
                deck = :deck_id
            LIMIT 1;
        ");

        let has_entry = db_conn.query_row_named(query_count, params, |row| -> bool {
            let count: i64 = row.get(0);
            return count >= 1;
        });

        match has_entry {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query_count.clone(),
                };
                return Err(err);
            },
            Ok(has_entry) => {
                if !has_entry {
                    return Ok(None);
                }
            }
        }

        let ref query = format!("
            SELECT
                deck, card, created_at
            FROM CachedDeckReview
            WHERE
                deck = :deck_id
            LIMIT 1;
        ");

        let cached_card = db_conn.query_row_named(query, params, |row| -> i64 {
            return row.get(1);
        });

        match cached_card {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(card_id) => {
                return Ok(Some(card_id));
            }
        };
    }

}

impl ReviewableSelection for ReviewableDeck {

    // faster version
    fn has_cards(&self) -> Result<bool, QueryError> {

        match self.number_of_cards() {
            Err(err) => {
                return Err(err);
            },
            Ok(num_cards) => {
                return Ok(num_cards > 0);
            }
        }
    }

    fn number_of_cards(&self) -> Result<i64, QueryError> {

        match self.grokdb.deref().cards.count_by_deck(self.deck_id) {
            Err(err) => {
                return Err(err);
            },
            Ok(num_cards) => {
                return Ok(num_cards);
            }
        }
    }

    fn cache_card(&self, card_id: i64) -> Result<(), QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query = format!("
            INSERT OR REPLACE INTO CachedDeckReview(deck, card)
            VALUES (:deck_id, :card_id);
        ");

        let params: &[(&str, &ToSql)] = &[
            (":deck_id", &(self.deck_id)),
            (":card_id", &card_id)
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

        return Ok(());
    }

    fn get_cached_card(&self) -> Result<Option<i64>, QueryError> {

        match self.__get_cached_card() {
            Err(why) => {
                return Err(why);
            },
            Ok(None) => {
                return Ok(None);
            },
            Ok(Some(card_id)) => {

                // check if the card is still within the deck

                match self.has_card(card_id) {
                    Err(why) => {
                        return Err(why);
                    },
                    Ok(true) => {
                        return Ok(Some(card_id));
                    },
                    Ok(false) => {

                        match self.remove_cache() {
                            Err(why) => {
                                return Err(why);
                            },
                            Ok(_) => {
                                return Ok(None);
                            }
                        }
                    }
                }
            }
        }
    }

    // remove deck/card review entry by deck
    fn remove_cache(&self) -> Result<(), QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query_delete = format!("
            DELETE FROM CachedDeckReview WHERE deck = :deck_id;
        ");

        let params: &[(&str, &ToSql)] = &[
            (":deck_id", &(self.deck_id))
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

    fn remove_cached_card(&self, card_id: i64) -> Result<(), QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query_delete = format!("
            DELETE FROM CachedDeckReview WHERE card = :card_id;
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

    fn has_new_cards(&self) -> Result<bool, QueryError> {

        match self.number_of_new_cards() {
            Err(err) => {
                return Err(err);
            },
            Ok(num_cards) => {
                return Ok(num_cards > 0);
            }
        }
    }

    fn number_of_new_cards(&self) -> Result<i64, QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let params: &[(&str, &ToSql)] = &[
            (":deck_id", &(self.deck_id))
        ];

        let ref query = format!("
            SELECT
                COUNT(1)
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            INNER JOIN CardsScore AS cs
            ON cs.card = c.card_id

            WHERE
                dc.ancestor = :deck_id
            AND
                (c.created_at - cs.seen_at) = 0;
        ");

        let maybe_count = db_conn.query_row_named(query, params, |row| -> i64 {
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

    // returns card id
    fn get_new_card(&self, index: i64) -> Result<i64, QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                c.card_id
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            INNER JOIN CardsScore AS cs
            ON cs.card = c.card_id

            WHERE
                dc.ancestor = :deck_id
            AND
                (c.created_at - cs.seen_at) = 0
            LIMIT 1
            OFFSET :offset;
        ");

        let params: &[(&str, &ToSql)] = &[
            (":deck_id", &(self.deck_id)),
            (":offset", &index),
        ];

        let maybe_card_id = db_conn.query_row_named(query, params, |row| -> i64 {
            return row.get(0);
        });

        match maybe_card_id {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(card_id) => {
                return Ok(card_id);
            }
        };
    }

    fn has_reviewable_cards(&self, age_in_hours: i64, min_score: f64) -> Result<bool, QueryError> {

        match self.number_of_reviewable_cards(age_in_hours, min_score) {
            Err(err) => {
                return Err(err);
            },
            Ok(num_cards) => {
                return Ok(num_cards > 0);
            }
        }
    }

    fn number_of_reviewable_cards(&self, age_in_hours: i64, min_score: f64) -> Result<i64, QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                COUNT(1)
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            INNER JOIN CardsScore AS cs
            ON cs.card = c.card_id

            WHERE
                dc.ancestor = :deck_id
            AND
                (strftime('%s','now') - cs.seen_at) >= :age_of_consent
            AND
                rank_score(cs.success, cs.fail, strftime('%s','now') - cs.seen_at, cs.times_reviewed) >= :min_score;
        ");

        let age_in_seconds: i64 = age_in_hours * 3600;

        let params: &[(&str, &ToSql)] = &[
            (":age_of_consent", &age_in_seconds),
            (":min_score", &min_score),
            (":deck_id", &(self.deck_id))
        ];

        let maybe_count = db_conn.query_row_named(query, params, |row| -> i64 {
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

    fn get_reviewable_card(&self, age_in_hours: i64, min_score: f64, index: i64) -> Result<i64, QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        // TODO: use http://blog.ssokolow.com/archives/2009/12/23/sql-pagination-without-offset/
        let ref query = format!("
            SELECT
                c.card_id
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            INNER JOIN CardsScore AS cs
            ON cs.card = c.card_id

            WHERE
                dc.ancestor = :deck_id
            AND
                (strftime('%s','now') - cs.seen_at) >= :age_of_consent
            AND
                rank_score(cs.success, cs.fail, strftime('%s','now') - cs.seen_at, cs.times_reviewed) >= :min_score
            ORDER BY
                rank_score(cs.success, cs.fail, strftime('%s','now') - cs.seen_at, cs.times_reviewed) DESC
            LIMIT 1
            OFFSET :index;
        ");

        let age_in_seconds: i64 = age_in_hours * 3600;

        let params: &[(&str, &ToSql)] = &[
            (":age_of_consent", &age_in_seconds),
            (":min_score", &min_score),
            (":index", &index),
            (":deck_id", &(self.deck_id))
        ];

        let maybe_card_id = db_conn.query_row_named(query, params, |row| -> i64 {
            return row.get(0);
        });

        match maybe_card_id {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(card_id) => {
                return Ok(card_id);
            }
        };
    }

    fn has_old_cards(&self, purgatory_size: i64, min_score: f64) -> Result<bool, QueryError> {

        match self.number_of_old_cards(purgatory_size, min_score, false) {
            Err(err) => {
                return Err(err);
            },
            Ok(num_cards) => {
                return Ok(num_cards > 0);
            }
        }
    }

    fn number_of_old_cards(&self, purgatory_size: i64, min_score: f64, sort_by_score: bool) -> Result<i64, QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                COUNT(1)
            FROM
            (
                SELECT
                    c.card_id, cs.success, cs.fail, cs.seen_at, cs.times_reviewed
                FROM DecksClosure AS dc

                INNER JOIN Cards AS c
                ON c.deck = dc.descendent

                INNER JOIN CardsScore AS cs
                ON cs.card = c.card_id

                WHERE
                    dc.ancestor = :deck_id
                ORDER BY
                    (strftime('%s','now') - cs.seen_at) DESC
                LIMIT :purgatory_size
            )
            AS sub
            WHERE
                rank_score(sub.success, sub.fail, strftime('%s','now') - sub.seen_at, sub.times_reviewed) >= :min_score
            {sort_by_score}
            ;
        ", sort_by_score = {
            if sort_by_score {
                "ORDER BY rank_score(sub.success, sub.fail, strftime('%s','now') - sub.seen_at, sub.times_reviewed) DESC"
            } else {
                ""
            }
        });

        let params: &[(&str, &ToSql)] = &[
            (":purgatory_size", &purgatory_size),
            (":min_score", &min_score),
            (":deck_id", &(self.deck_id))
        ];

        let maybe_count = db_conn.query_row_named(query, params, |row| -> i64 {
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

    // returns card id
    fn get_old_card(&self, purgatory_size: i64, min_score: f64, index: i64, sort_by_score: bool) -> Result<i64, QueryError> {

        let ref grokdb = self.grokdb.deref();

        let db_conn_guard = grokdb.decks.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                sub.card_id
            FROM
            (
                SELECT
                    c.card_id, cs.success, cs.fail, cs.seen_at, cs.times_reviewed
                FROM DecksClosure AS dc

                INNER JOIN Cards AS c
                ON c.deck = dc.descendent

                INNER JOIN CardsScore AS cs
                ON cs.card = c.card_id

                WHERE
                    dc.ancestor = :deck_id
                ORDER BY
                    (strftime('%s','now') - cs.seen_at) DESC
                LIMIT :purgatory_size
            )
            AS sub
            WHERE
                rank_score(sub.success, sub.fail, strftime('%s','now') - sub.seen_at, sub.times_reviewed) >= :min_score
            {sort_by_score}
            LIMIT 1 OFFSET :index;
        ", sort_by_score = {
            if sort_by_score {
                "ORDER BY rank_score(sub.success, sub.fail, strftime('%s','now') - sub.seen_at, sub.times_reviewed) DESC"
            } else {
                ""
            }
        });

        let params: &[(&str, &ToSql)] = &[
            (":purgatory_size", &purgatory_size),
            (":min_score", &min_score),
            (":index", &index),
            (":deck_id", &(self.deck_id))
        ];

        let maybe_card_id = db_conn.query_row_named(query, params, |row| -> i64 {
            return row.get(0);
        });

        match maybe_card_id {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(card_id) => {
                return Ok(card_id);
            }
        };
    }

}
