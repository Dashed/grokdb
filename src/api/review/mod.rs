extern crate rusqlite;
extern crate rustc_serialize;

mod restify;

use rand::{thread_rng, Rng};

use std::sync::Arc;

use rusqlite::types::ToSql;

use ::database::{DB, QueryError};
pub use self::restify::restify;


pub trait ReviewableSelection {

    // number of cards in the selection
    fn has_cards(&self) -> Result<bool, QueryError>; // faster version

    fn number_of_cards(&self) -> Result<i64, QueryError>;

    /* caching */
    fn cache_card(&self, card_id: i64) -> Result<(), QueryError>;
    fn get_cached_card(&self) -> Result<Option<i64>, QueryError>;
    fn remove_cache(&self) -> Result<(), QueryError>;

    // remove any cached entry by card id, regardless of sub-selection,
    // of container type (e.g. Decks or Stash)
    fn remove_cached_card(&self, card_id: i64) -> Result<(), QueryError>;

    /* new cards */

    fn has_new_cards(&self) -> Result<bool, QueryError>;

    fn number_of_new_cards(&self) -> Result<i64, QueryError>;

    // returns card id
    fn get_new_card(&self, index: i64) -> Result<i64, QueryError>;

    /* Top scoring cards that are reviewed for more than N hours ago and have score of at least M */

    fn has_reviewable_cards(&self, age_in_hours: i64, min_score: f64) -> Result<bool, QueryError>;

    fn number_of_reviewable_cards(&self, age_in_hours: i64, min_score: f64) -> Result<i64, QueryError>;

    // TODO: adapt using http://blog.ssokolow.com/archives/2009/12/23/sql-pagination-without-offset/
    // returns card id
    fn get_reviewable_card(&self, age_in_hours: i64, min_score: f64, index: i64) -> Result<i64, QueryError>;

    /* Top N least recently reviewed cards and have score of at least M */

    fn has_old_cards(&self, purgatory_size: i64, min_score: f64) -> Result<bool, QueryError>;

    // - get cards reviewed sorted by age (desc)
    // - get top purgatory_size cards
    // - discards less than min_score
    // - sort by score (desc) [optional; if false, cards are implicitly sorted by age]
    fn number_of_old_cards(&self, purgatory_size: i64, min_score: f64, sort_by_score: bool) -> Result<i64, QueryError>;

    // returns card id
    // - get cards reviewed sorted by age (desc)
    // - get top purgatory_size cards
    // - discards less than min_score
    // - sort by score (desc) [optional; if false, cards are implicitly sorted by age]
    fn get_old_card(&self, purgatory_size: i64, min_score: f64, index: i64, sort_by_score: bool) -> Result<i64, QueryError>;
}

pub enum Action {
    Success,
    Fail,
    Reset,
    Forgot,
    Skip,
    Invalid
}

#[derive(Debug, Clone, RustcDecodable)]
pub struct UpdateCardScore {

    // possible valid actions:
    // - success
    // - fail
    // - reset
    // - forgot
    // - skip
    action: String,

    value: Option<i64>,

    // description of the action on the card being reviewed
    changelog: Option<String>,

    // denote which 'container' the card was reviewed in.
    // either stash or deck is given (but not both),
    // or neither stash nor deck is selected (case when reviewing the card individually)
    stash: Option<i64>, // stash id
    deck: Option<i64> // deck id
}

static DEFAULT_VALUE: i64 = 1;
static DEFAULT_SUCCESS: i64 = 0;
static DEFAULT_FAIL: i64 = 0;
static FORGOT_FAIL: i64 = 2;
impl UpdateCardScore {

    pub fn get_action(&self) -> Action {

        return match self.action.to_lowercase().as_ref() {
            "success" => Action::Success,
            "fail" => Action::Fail,
            "reset" => Action::Reset,
            "forgot" => Action::Forgot,
            "skip" => Action::Skip,
            _ => Action::Invalid
        };
    }

    pub fn is_valid_action(&self) -> bool {
        return match self.get_action() {
            Action::Invalid => false,
            _ => true
        };
    }

    pub fn is_valid_value(&self) -> bool {

        if !self.is_valid_action() {
            return false;
        }

        return match self.get_action() {
            Action::Success | Action::Fail => {
                match self.value {
                    Some(value) => {
                        return value > 0;
                    },
                    None => {
                        return false;
                    }
                }
            },
            _ => {
                // value is ignored for all other actions
                return true;
            }
        }

    }

    pub fn get_value(&self) -> &i64 {

        return match self.get_action() {
            Action::Success | Action::Fail => {
                match self.value {
                    Some(ref value) => {
                        return value;
                    },
                    None => {
                        return &DEFAULT_VALUE;
                    }
                }
            },
            _ => unreachable!() // action and value should be already validated
        }
    }

    pub fn should_update(&self) -> bool {
        return self.is_valid_action() && self.is_valid_value()
            && (!self.stash.is_some() || !self.deck.is_some());
            // long-form:
            // ((self.stash.is_some() && !self.deck.is_some()) ||
            //     (!self.stash.is_some() && self.deck.is_some()) ||
            //     (!self.stash.is_some() && !self.deck.is_some()));
    }

    // get fields to update.
    // this is a helper to construct the sql update query
    pub fn sqlize(&self) -> (String, Vec<(&str, &ToSql)>) {

        let mut fields: Vec<String> = vec![];
        let mut values: Vec<(&str, &ToSql)> = vec![];

        match self.get_action() {

            Action::Success => {

                let value: &i64 = self.get_value();

                fields.push(format!("times_reviewed = times_reviewed + 1"));

                fields.push(format!("success = success + :success"));
                let tuple: (&str, &ToSql) = (":success", value);
                values.push(tuple);
            },

            Action::Fail => {

                let value: &i64 = self.get_value();

                fields.push(format!("times_reviewed = times_reviewed + 1"));

                fields.push(format!("fail = fail + :fail"));
                let tuple: (&str, &ToSql) = (":fail", value);
                values.push(tuple);
            },

            Action::Reset => {

                fields.push(format!("success = :success"));
                let tuple: (&str, &ToSql) = (":success", &DEFAULT_SUCCESS);
                values.push(tuple);

                fields.push(format!("fail = :fail"));
                let tuple: (&str, &ToSql) = (":fail", &DEFAULT_FAIL);
                values.push(tuple);
            },

            Action::Forgot => {

                fields.push(format!("times_reviewed = times_reviewed + 1"));

                fields.push(format!("success = :success"));
                let tuple: (&str, &ToSql) = (":success", &DEFAULT_SUCCESS);
                values.push(tuple);

                fields.push(format!("fail = :fail"));
                // minor boost relative to a newly created card
                let tuple: (&str, &ToSql) = (":fail", &FORGOT_FAIL);
                values.push(tuple);
            },

            Action::Skip => {

                // prevents trigger CARDS_SCORE_ON_UPDATED_TRIGGER in tables.rs
                // TODO: this seems too hacky
                fields.push(format!("times_seen = times_seen"));
            },

            _ => unreachable!() // action should be already validated
        }

        if self.changelog.is_some() {
            fields.push(format!("changelog = :changelog"));
            let tuple: (&str, &ToSql) = (":changelog", self.changelog.as_ref().unwrap());
            values.push(tuple);
        } else {
            fields.push(format!("changelog = ''"));
        }

        return (fields.join(", "), values);
    }
}

#[derive(Debug, Clone, RustcEncodable)]
pub struct ReviewResponse {
    success: i64,
    fail: i64,
    score: f64,
    times_reviewed: i64,
    times_seen: i64,
    reviewed_at: i64 // unix timestamp
}

#[derive(Debug, Clone)]
pub struct ReviewAPI {
    pub db: Arc<DB>,
}

impl ReviewAPI {

    pub fn get_review_stat(&self, card_id: i64) -> Result<ReviewResponse, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                success, fail, times_reviewed, times_seen, updated_at
            FROM CardsScore
            WHERE card = :card_id
            LIMIT 1;
        ");

        let results = db_conn.query_row_named(query, &[(":card_id", &card_id)], |row| -> ReviewResponse {

            let success: i64 = row.get(0);
            let fail: i64 = row.get(1);
            let total: i64 = success + fail;

            return ReviewResponse {
                success: row.get(0),
                fail: row.get(1),
                score: (fail as f64 + 0.5f64) / (total as f64 + 1.0f64),
                times_reviewed: row.get(2),
                times_seen: row.get(3),
                reviewed_at: row.get(4)
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

    pub fn update_reviewed_card(&self, card_id: i64, update_review_request: UpdateCardScore) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let (fields, values): (String, Vec<(&str, &ToSql)>) = update_review_request.sqlize();


        let mut values = values;
        values.push((":card_id", &card_id));
        let values = values;

        let ref query_update = format!("
            UPDATE CardsScore
            SET
            {fields}
            WHERE card = :card_id;
        ", fields = fields);

        let tx = match db_conn.transaction() {

            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: format!("creating transaction"),
                };
                return Err(err);
            },

            Ok(tx) => {
                /* new transaction created */
                tx
            }
        };

        match db_conn.execute_named(query_update, &values[..]) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query_update.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */}
        }

        if update_review_request.deck.is_some() {

            let deck_id: i64 = update_review_request.deck.unwrap();

            let ref query_update_deck = format!("
                UPDATE Decks
                SET
                reviewed_at = strftime('%s', 'now')
                WHERE deck_id = :deck_id;
            ");

            match db_conn.execute_named(query_update_deck, &[(":deck_id", &deck_id)]) {
                Err(why) => {
                    let err = QueryError {
                        sqlite_error: why,
                        query: query_update_deck.clone(),
                    };
                    return Err(err);
                },
                _ => {/* query sucessfully executed */}
            }

        } else if update_review_request.stash.is_some() {

            let stash_id = update_review_request.stash.unwrap();

            let ref query_update_stash = format!("
                UPDATE Stashes
                SET
                reviewed_at = strftime('%s', 'now')
                WHERE stash_id = :stash_id;
            ");

            match db_conn.execute_named(query_update_stash, &[(":stash_id", &stash_id)]) {
                Err(why) => {
                    let err = QueryError {
                        sqlite_error: why,
                        query: query_update_stash.clone(),
                    };
                    return Err(err);
                },
                _ => {/* query sucessfully executed */}
            }
        }

        match tx.commit() {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: format!("committing transaction"),
                };
                return Err(err);
            },
            _ => {/* commit successful */}
        }

        return Ok(());
    }
}

pub fn get_review_card<T>(selection: &T) -> Result<Option<i64>, QueryError>
    where T: ReviewableSelection {

    match selection.get_cached_card() {
        Err(why) => {
            return Err(why);
        },
        Ok(Some(card_id)) => {
            return Ok(Some(card_id));
        }
        Ok(None) => {
            // no cached card for review
        }
    }

    // ensure there are cards to review
    match selection.has_cards() {
        Err(why) => {
            return Err(why);
        },
        Ok(false) => {
            return Ok(None);
        },
        Ok(true) => {
            // has cards to review
        }
    }


    // decide method for choosing the next card

    let method = match choose_method(selection) {
        Err(why) => {
            return Err(why);
        },
        Ok(method) => method
    };


    let card_id: i64 = match method {
        Method::NewCards => {
            match selection.get_new_card(0) {
                Err(why) => {
                    return Err(why);
                },
                Ok(card_id) => card_id
            }
        },

        Method::OldEnough => {

            let mut rng = thread_rng();

            // randomly decide to discard low scoring cards
            let min_score: f64 = {

                let cutoff = 0.3f64; // TODO: move this

                let num_cards = match selection.number_of_reviewable_cards(3, cutoff) {
                    Err(why) => {
                        return Err(why);
                    },
                    Ok(num_cards) => num_cards
                };

                // flip a coin.
                if rng.gen_weighted_bool(2) && num_cards >= 2 {
                    cutoff
                } else {
                    0f64
                }
            };

            let num_cards: i64 = match selection.number_of_reviewable_cards(3, min_score) {
                Err(why) => {
                    return Err(why);
                },
                Ok(num_cards) => num_cards
            };

            assert!(num_cards > 0);

            let card_idx: i64 = match rng.gen_range(0f64, 1f64) {

                pin if pin < 0.3 => {
                    // random card
                    rng.gen_range(0, num_cards)
                },

                _ => { // 70% probability
                    // Random card from top 50% of highest rank score
                    let min_idx: i64 = ((num_cards as f64) / 2f64).ceil() as i64;
                    assert!(min_idx > 0);
                    rng.gen_range(0, min_idx)
                }
            };

            match selection.get_reviewable_card(3, min_score, card_idx) {
                Err(why) => {
                    return Err(why);
                },
                Ok(card_id) => card_id
            }
        },

        Method::LeastRecentlyReviewed => {

            let mut rng = thread_rng();

            // calculate the purgatory size
            let purgatory_size = {

                let num_cards: i64 = match selection.number_of_cards() {
                    Err(why) => {
                        return Err(why);
                    },
                    Ok(num_cards) => num_cards
                };

                (0.2 * (num_cards as f64)).ceil() as i64
            };

            // randomly decide to discard low scoring cards
            let min_score: f64 = {

                let cutoff = 0.3f64; // TODO: move this

                let num_cards = match selection.number_of_old_cards(purgatory_size, cutoff, false) {
                    Err(why) => {
                        return Err(why);
                    },
                    Ok(num_cards) => num_cards
                };

                if rng.gen_weighted_bool(2) && num_cards >= 2 {
                    cutoff
                } else {
                    0f64
                }
            };

            let (card_idx, sort_by_score): (i64, bool) = match rng.gen_range(0f64, 1f64) {

                pin if pin < 0.2 => {
                    // random card (20% prob)

                    let num_cards = match selection.number_of_old_cards(purgatory_size, min_score, false) {
                        Err(why) => {
                            return Err(why);
                        },
                        Ok(num_cards) => num_cards
                    };

                    assert!(num_cards > 0);

                    (rng.gen_range(0, num_cards), true)
                },

                pin if pin < (0.2 + 0.75) => {
                    // Random card from top 50% of highest rank score (75% prob)

                    let num_cards = match selection.number_of_old_cards(purgatory_size, min_score, true) {
                        Err(why) => {
                            return Err(why);
                        },
                        Ok(num_cards) => num_cards
                    };

                    let min_idx: i64 = ((num_cards as f64) / 2f64).ceil() as i64;

                    assert!(min_idx > 0);

                    (rng.gen_range(0, min_idx), true)
                },

                _ => { // Oldest card
                    (0, false)
                }
            };

            match selection.get_old_card(purgatory_size, min_score, card_idx, sort_by_score) {
                Err(why) => {
                    return Err(why);
                },
                Ok(card_id) => card_id
            }
        }
    };

    // remove any cached entry
    match selection.remove_cache() {
        Err(why) => {
            return Err(why);
        },
        Ok(_) => {
            // cache removed
        }
    }

    // set cache entry
    match selection.cache_card(card_id) {
        Err(why) => {
            return Err(why);
        },
        Ok(_) => {
            // cache set
        }
    }

    return Ok(Some(card_id));
}

enum Method {
    NewCards,
    OldEnough, // old enough to be reviewed
    LeastRecentlyReviewed,
}

// these should add up to 1
static NEW_CARDS: f64 = 0.15;
static OLD_ENOUGH: f64 = 0.3;
static LEAST_RECENT: f64 = 0.55;

fn choose_method<T>(selection: &T) -> Result<Method, QueryError>
    where T: ReviewableSelection {

    let mut max_pin: f64 = 1f64;

    // if there are no new cards, adjust pin to exclude 'new cards' method.
    let has_new_cards: bool = match selection.has_new_cards() {
        Err(why) => {
            return Err(why);
        },
        Ok(false) => {
            max_pin = max_pin - NEW_CARDS;
            false
        },
        Ok(true) => { true }
    };

    // check if there are cards that haven't been reviewed for at least 3 hours
    // and have a minimum score of 0.
    //
    // if there are no such cards that meet the above criteria, then exclude
    // this method.
    let has_reviewable_cards: bool = match selection.has_reviewable_cards(3, 0f64) {
        Err(why) => {
            return Err(why);
        },
        Ok(false) => {
            max_pin = max_pin - OLD_ENOUGH;
            false
        },
        Ok(true) => { true }
    };


    let max_pin = max_pin;

    // if there is only one method to choose from.
    // faster code path.
    if !has_new_cards && !has_reviewable_cards {
        return Ok(Method::LeastRecentlyReviewed);
    }

    // invariant: max_pin > LEAST_RECENT

    let mut rng = thread_rng();

    assert!(max_pin > 0f64);

    if !has_new_cards {

        let method = match rng.gen_range(0f64, max_pin) {
            pin if pin < LEAST_RECENT => Method::LeastRecentlyReviewed,
            _ => Method::OldEnough
        };

        return Ok(method);
    }

    if !has_reviewable_cards {

        let method = match rng.gen_range(0f64, max_pin) {
            pin if pin < LEAST_RECENT => Method::LeastRecentlyReviewed,
            _ => Method::NewCards
        };

        return Ok(method);
    }

    let method = match rng.gen_range(0f64, max_pin) {
        pin if pin < LEAST_RECENT => Method::LeastRecentlyReviewed,
        pin if pin < (LEAST_RECENT + OLD_ENOUGH) => Method::OldEnough,
        _ => Method::NewCards
    };

    return Ok(method);
}
