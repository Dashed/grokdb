extern crate rusqlite;
extern crate rustc_serialize;

mod restify;

use rand::{thread_rng, Rng};

use std::sync::Arc;

use rusqlite::types::ToSql;
use rusqlite::{SqliteStatement, SqliteRow, SqliteError};
use rustc_serialize::json;

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
    changelog: Option<String>
}


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
        // TODO: complete
        return true;
    }

    pub fn should_update(&self) -> bool {

        return (
            // TODO: implement
            true
        );
    }

}

#[derive(Debug, Clone)]
pub struct ReviewAPI {
    pub db: Arc<DB>,
}

impl ReviewAPI {

    // pub fn update_reviewed_card(&self, card_id: i64, update_review_request: UpdateCardScore) -> Result<(), QueryError> {

    // }

    // pub fn remove_cached_review_card(&self, card_id: i64) -> Result<(), QueryError> {

    //     // executes when card is reviewed

    //     // TODO: remove card id from cached stash and cached deck
    // }

    // // remove deck/card review entry by card
    // pub fn remove_cached_deck_review_card(&self, card_id: i64) -> Result<(), QueryError> {
    //     // TODO: complete
    // }

    // // remove stash/card review entry by card
    // pub fn remove_cached_stash_review_card(&self, card_id: i64) -> Result<(), QueryError> {
    //     // TODO: complete
    // }

    // // TODO: move to stash api
    // pub fn get_review_card_for_stash(&self, stash_id: i64) -> Result<Option<i64>, QueryError> {

    //     // get cached card for stash

    // }

    // // // TODO: move to stash api
    // // returns card id (if exists)
    // pub fn get_cached_review_card_for_stash(&self, stash_id: i64) -> Result<Option<i64>, QueryError> {
    //     // TODO: implement
    // }

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

    let mut rng = thread_rng();

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

            // randomly decide to discard low scoring cards
            let min_score: f64 = {

                let cutoff = 0.3f64; // TODO: move this

                let num_cards = match selection.number_of_reviewable_cards(3, cutoff) {
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

            let num_cards: i64 = match selection.number_of_reviewable_cards(3, min_score) {
                Err(why) => {
                    return Err(why);
                },
                Ok(num_cards) => num_cards
            };

            let card_idx: i64 = match rng.gen_range(0f64, 1f64) {

                pin if pin < 0.3 => {
                    // random card
                    rng.gen_range(0, num_cards)
                },

                _ => { // 70% probability
                    // Random card from top 50% of highest rank score
                    let min_idx: i64 = ((num_cards as f64) / 2f64).ceil() as i64;
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

    // remove any cache
    match selection.remove_cache() {
        Err(why) => {
            return Err(why);
        },
        Ok(_) => {
            // cache removed
        }
    }

    // set cache
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

fn choose_method<T>(selection: &T) -> Result<Method, QueryError>
    where T: ReviewableSelection {

    // these should add up to 1
    let new_cards = 0.15;
    let old_enough = 0.3;
    let least_recent = 0.55;

    let mut max_pin: f64 = 1f64;

    match selection.has_new_cards() {
        Err(why) => {
            return Err(why);
        },
        Ok(false) => {
            max_pin = max_pin - new_cards;
        },
        _ => {}
    }

    match selection.has_reviewable_cards(3, 0f64) {
        Err(why) => {
            return Err(why);
        },
        Ok(false) => {
            max_pin = max_pin - old_enough;
        },
        _ => {}
    }

    let max_pin = max_pin;

    let mut rng = thread_rng();

    let method = match rng.gen_range(0f64, max_pin) {
        pin if pin < least_recent => Method::LeastRecentlyReviewed,
        pin if pin < (least_recent + old_enough) => Method::OldEnough,
        _ => Method::NewCards,
    };

    return Ok(method);
}
