extern crate iron;
extern crate rusqlite;
extern crate router;
extern crate rustc_serialize;

pub mod restify;
pub mod reviewable;

use std::sync::Arc;

use rusqlite::types::ToSql;
use rusqlite::{SqliteStatement, SqliteRow};
use rustc_serialize::json;

use ::database::{DB, QueryError};
pub use self::restify::restify;


#[derive(Debug, Clone, RustcDecodable)]
pub struct CreateDeck {
    name: String,
    description: Option<String>,
    parent: Option<i64>,
}

#[derive(Debug, Clone, RustcDecodable)]
pub struct UpdateDeck {
    name: Option<String>,
    description: Option<String>,
    parent: Option<i64>,
}

impl UpdateDeck {

    #[allow(unused_parens)]
    pub fn should_update(&self) -> bool {
        return (
            self.name.is_some() ||
            self.description.is_some() ||
            self.parent.is_some()
        );
    }

    #[allow(unused_parens)]
    pub fn should_update_deck_props(&self) -> bool {
        return (
            self.name.is_some() ||
            self.description.is_some()
        );
    }

    // get fields to update.
    // this is a helper to construct the sql update query
    pub fn sqlize(&self) -> (String, Vec<(&str, &ToSql)>) {

        let mut fields: Vec<String> = vec![];
        let mut values: Vec<(&str, &ToSql)> = vec![];

        if self.name.is_some() {
            fields.push(format!("name = :name"));
            let tuple: (&str, &ToSql) = (":name", self.name.as_ref().unwrap());
            values.push(tuple);
        }

        if self.description.is_some() {
            fields.push(format!("description = :description"));
            let tuple: (&str, &ToSql) = (":description", self.description.as_ref().unwrap());
            values.push(tuple);
        }

        return (fields.join(", "), values);
    }
}

#[derive(Debug, RustcEncodable)]
struct Deck {
    id: i64,
    name: String,
    description: String,
    created_at: i64, // unix timestamp
    updated_at: i64  // unix timestamp
}

#[derive(Debug, RustcEncodable)]
struct DeckResponse {
    id: i64,
    name: String,
    description: String,
    has_parent: bool,
    parent: i64,
    children: Vec<i64>,
    created_at: i64, // unix timestamp
    updated_at: i64,  // unix timestamp
    ancestors: Vec<i64> // Vec of deck ids
}

impl DeckResponse {

    pub fn to_json(&self) -> String {
        return json::encode(self).unwrap();
    }
}

#[derive(Debug, Clone)]
pub struct DecksAPI {
    pub db: Arc<DB>,
}

impl DecksAPI {

    pub fn get_response(&self, deck_id: i64) -> Result<DeckResponse, QueryError> {

        // get props

        let maybe_deck: Result<Deck, QueryError> = self.get(deck_id);
        let deck: Deck = match maybe_deck {
            Err(why) => {
                // why: QueryError
                return Err(why);
            },
            Ok(deck) => deck,
        };

        let maybe_has_parent: Result<bool, QueryError> = self.has_parent(deck_id);
        let has_parent: bool = match maybe_has_parent {
            Err(why) => {
                // why: QueryError
                return Err(why);
            },
            Ok(has_parent) => has_parent,
        };

        let parent: i64 = match has_parent {
            false => 0,
            true => {
                match self.get_parent(deck_id) {
                    Err(why) => {
                        // why: QueryError
                        return Err(why);
                    },
                    Ok(parent_id) => parent_id
                }
            }
        };

        let maybe_children: Result<Vec<i64>, QueryError> = self.children(deck_id);

        let children: Vec<i64> = match maybe_children {
            Err(why) => {
                // why: QueryError
                return Err(why);
            },
            Ok(children) => children,
        };

        let ancestors: Vec<i64> = match self.ancestors(deck_id) {
            Err(why) => {
                // why: QueryError
                return Err(why);
            },
            Ok(ancestors) => ancestors,
        };

        let response = DeckResponse {
            id: deck.id,
            name: deck.name,
            description: deck.description,
            has_parent: has_parent,
            parent: parent,
            children: children,
            created_at: deck.created_at, // unix timestamp
            updated_at: deck.updated_at,  // unix timestamp
            ancestors: ancestors
        };

        return Ok(response);
    }

    pub fn get(&self, deck_id: i64) -> Result<Deck, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                deck_id, name, description, created_at, updated_at
            FROM Decks
            WHERE deck_id = $1 LIMIT 1;
        ");

        let results = db_conn.query_row(query, &[&deck_id], |row| -> Deck {
            return Deck {
                id: row.get(0),
                name: row.get(1),
                description: row.get(2),
                created_at: row.get(3),
                updated_at: row.get(4)
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
            Ok(deck) => {
                return Ok(deck);
            }
        };
    }

    pub fn exists(&self, deck_id: i64) -> Result<bool, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("SELECT COUNT(1) FROM Decks WHERE deck_id = $1 LIMIT 1;");

        let deck_exists = db_conn.query_row(query, &[&deck_id], |row| -> bool {
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

    pub fn create(&self, create_deck_request: &CreateDeck) -> Result<i64, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let description = match create_deck_request.description {
            Some(ref description) => description.clone(),
            None => "".to_string()
        };

        let ref query = format!("INSERT INTO Decks(name, description) VALUES ($1, $2);");

        let params: &[&ToSql] = &[

            // required
            &create_deck_request.name, // $1

            // optional
            &description // $2
        ];

        match db_conn.execute(query, params) {
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

    pub fn update(&self, deck_id: i64, update_deck_request: &UpdateDeck) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let (fields, values): (String, Vec<(&str, &ToSql)>) = update_deck_request.sqlize();

        let mut values = values;
        values.push((":deck_id", &deck_id));
        let values = values;

        let ref query_update = format!("
            UPDATE Decks
            SET
            {fields}
            WHERE deck_id = :deck_id;
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

    pub fn delete(&self, deck_id: i64) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        // also delete decks within this deck
        let ref query_delete = format!("
            DELETE FROM Decks
            WHERE deck_id IN (
                SELECT descendent
                    FROM DecksClosure
                WHERE
                    ancestor = $1
            );
        ");

        let params: &[&ToSql] = &[
            &deck_id, // $1
        ];

        match db_conn.execute(query_delete, params) {
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

    pub fn ancestors(&self, deck_id: i64) -> Result<Vec<i64>, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        // fetch ancestors in order from furthest to nearest

        let ref query = format!("
            SELECT
                ancestor
            FROM DecksClosure
            WHERE
                descendent = $1
            AND
                depth > 0
            ORDER BY
                depth DESC;
        ");

        let params: &[&ToSql] = &[
            &deck_id, // $1
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

        let maybe_iter = stmt.query_map(params, |row: SqliteRow| -> i64 {
            return row.get(0);
        });

        match maybe_iter {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(iter) => {

                let mut vec_of_deck_id: Vec<i64> = Vec::new();

                for maybe_deck_id in iter {

                    let deck_id: i64 = match maybe_deck_id {
                        Err(why) => {
                            let err = QueryError {
                                sqlite_error: why,
                                query: query.clone(),
                            };
                            return Err(err);
                        },
                        Ok(deck_id) => deck_id
                    };

                    vec_of_deck_id.push(deck_id);
                }

                return Ok(vec_of_deck_id);
            }
        };
    }

    pub fn ancestors_by_name(&self, deck_id: i64) -> Result<Vec<String>, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                Decks.name
            FROM DecksClosure
            INNER JOIN Decks
            ON ancestor = Decks.deck_id
            WHERE
                descendent = $1
            AND
                depth > 0
            ORDER BY
                depth DESC;
        ");

        let params: &[&ToSql] = &[
            &deck_id, // $1
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

        let maybe_iter = stmt.query_map(params, |row: SqliteRow| -> String {
            return row.get(0);
        });

        match maybe_iter {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(iter) => {

                let mut vec_of_deck_names: Vec<String> = Vec::new();

                for maybe_deck_name in iter {

                    let deck_name: String = match maybe_deck_name {
                        Err(why) => {
                            let err = QueryError {
                                sqlite_error: why,
                                query: query.clone(),
                            };
                            return Err(err);
                        },
                        Ok(deck_name) => deck_name
                    };

                    vec_of_deck_names.push(deck_name);
                }

                return Ok(vec_of_deck_names);
            }
        };
    }

    pub fn children(&self, deck_id: i64) -> Result<Vec<i64>, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                descendent
            FROM
                DecksClosure
            INNER JOIN
                Decks
            ON DecksClosure.descendent = Decks.deck_id
            WHERE
                ancestor = $1
            AND
                depth = 1
            ORDER BY
                Decks.name
            COLLATE NOCASE ASC;
        ");

        let params: &[&ToSql] = &[
            &deck_id, // $1
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

        let maybe_iter = stmt.query_map(params, |row: SqliteRow| -> i64 {
            return row.get(0);
        });

        match maybe_iter {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(iter) => {

                let mut vec_of_deck_id: Vec<i64> = Vec::new();

                for maybe_deck_id in iter {

                    let deck_id: i64 = match maybe_deck_id {
                        Err(why) => {
                            let err = QueryError {
                                sqlite_error: why,
                                query: query.clone(),
                            };
                            return Err(err);
                        },
                        Ok(deck_id) => deck_id
                    };

                    vec_of_deck_id.push(deck_id);
                }

                return Ok(vec_of_deck_id);
            }
        };
    }

    pub fn has_parent(&self, deck_id: i64) -> Result<bool, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT COUNT(1)
            FROM DecksClosure
            WHERE
            descendent = $1
            AND depth = 1
            LIMIT 1;
        ");

        let has_parent = db_conn.query_row(query, &[&deck_id], |row| -> bool {
            let count: i64 = row.get(0);
            return count >= 1;
        });

        match has_parent {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(has_parent) => {
                return Ok(has_parent);
            }
        };
    }

    pub fn get_parent(&self, deck_id: i64) -> Result<i64, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT ancestor
            FROM DecksClosure
            WHERE
            descendent = $1
            AND depth = 1
            LIMIT 1;
        ");

        let results = db_conn.query_row(query, &[&deck_id], |row| -> i64 {
            return row.get(0);
        });

        match results {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(ancestor) => {
                return Ok(ancestor);
            }
        };
    }

    pub fn remove_parent(&self, deck: i64) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        // delete any and all subtree connections between child (and its descendants)
        // and the child's ancestors
        let ref query_delete = format!("
            DELETE FROM DecksClosure

            /* select all descendents of child */
            WHERE descendent IN (
                SELECT descendent
                FROM DecksClosure
                WHERE ancestor = $1
            )
            AND

            /* select all ancestors of child but not child itself */
            ancestor IN (
                SELECT ancestor
                FROM DecksClosure
                WHERE descendent = $1
                AND ancestor != descendent
            );
        ");

        let params: &[&ToSql] = &[
            &deck, // $1
        ];

        match db_conn.execute(query_delete, params) {
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

    pub fn connect_decks(&self, child: i64, parent: i64) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        // moving a child deck subtree consists of two procedures:
        // 1. delete any and all subtree connections between child (and its descendants)
        //    and the child's ancestors
        let ref query_delete = format!("
            DELETE FROM DecksClosure

            /* select all descendents of child */
            WHERE descendent IN (
                SELECT descendent
                FROM DecksClosure
                WHERE ancestor = $1
            )
            AND

            /* select all ancestors of child but not child itself */
            ancestor IN (
                SELECT ancestor
                FROM DecksClosure
                WHERE descendent = $1
                AND ancestor != descendent
            );
        ");

        let params: &[&ToSql] = &[
            &child, // $1
        ];

        match db_conn.execute(query_delete, params) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query_delete.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }

        // 2. make parent (and its ancestors) be ancestors of child deck (and its descendants)
        let ref query_insert = format!("
            INSERT OR IGNORE INTO DecksClosure(ancestor, descendent, depth)
            SELECT p.ancestor, c.descendent, p.depth+c.depth+1
                FROM DecksClosure AS p, DecksClosure AS c
            WHERE
                c.ancestor = $1
                AND p.descendent = $2;
        ");

        let params: &[&ToSql] = &[
            &child, // $1
            &parent, // $2
        ];

        match db_conn.execute(query_insert, params) {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query_insert.clone(),
                };
                return Err(err);
            },
            _ => {/* query sucessfully executed */},
        }

        return Ok(());
    }

}
