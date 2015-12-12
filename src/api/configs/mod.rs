extern crate rusqlite;
extern crate rustc_serialize;

pub mod restify;

use std::sync::Arc;

use rusqlite::types::ToSql;
use rustc_serialize::json;

use ::database::{DB, QueryError};
pub use self::restify::restify;


#[derive(Debug, Clone, RustcDecodable)]
pub struct SetConfigRequest {
    value: String
}

#[derive(Debug, Clone)]
pub struct SetConfig {
    setting: String,
    value: String
}

impl SetConfig {

    pub fn valid_setting(&self) -> bool {
        let setting_name: String = self.setting.trim().to_string();
        return setting_name.len() > 0;
    }

    pub fn should_update(&self) -> bool {
        return self.valid_setting();
    }
}

struct Config {
    setting: String,
    value: String
}


#[derive(Debug, RustcEncodable)]
pub struct ConfigResponse {
    setting: String,
    value: String
}

impl ConfigResponse {

    pub fn to_json(&self) -> String {
        return json::encode(self).unwrap();
    }
}

#[derive(Debug, Clone)]
pub struct ConfigsAPI {
    pub db: Arc<DB>,
}

impl ConfigsAPI {

    pub fn exists(&self, config_name: &String) -> Result<bool, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT COUNT(1)
            FROM Configs
            WHERE setting = $1 LIMIT 1;
        ");

        let config_name: &str = &config_name;

        let setting_exists = db_conn.query_row(query, &[&config_name], |row| -> bool {
            let count: i64 = row.get(0);
            return count >= 1;
        });

        match setting_exists {
            Err(why) => {
                let err = QueryError {
                    sqlite_error: why,
                    query: query.clone(),
                };
                return Err(err);
            },
            Ok(setting_exists) => {
                return Ok(setting_exists);
            }
        };

    }

    pub fn get(&self, config_name: &String) -> Result<ConfigResponse, QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        let ref query = format!("
            SELECT
                setting, value
            FROM Configs
            WHERE
                setting = :setting
            LIMIT 1;
        ");

        let config_name: &str = &config_name;

        let params: &[(&str, &ToSql)] = &[
            (":setting", &config_name)
        ];

        let results = db_conn.query_named_row(query, params, |row| -> ConfigResponse {
            return ConfigResponse {
                setting: row.get(0),
                value: row.get(1)
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
            Ok(config) => {
                return Ok(config);
            }
        };
    }

    pub fn set(&self, set_config_request: &SetConfig) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query = format!("
            INSERT OR REPLACE INTO Configs (setting, value)
            VALUES (:setting, :value);
        ");

        let params: &[(&str, &ToSql)] = &[

            (":setting", &set_config_request.setting),
            (":value", &set_config_request.value),

        ];

        match db_conn.execute_named(query, &params[..]) {
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

    pub fn delete(&self, config_name: &String) -> Result<(), QueryError> {

        let db_conn_guard = self.db.lock().unwrap();
        let ref db_conn = *db_conn_guard;

        try!(DB::prepare_query(db_conn));

        let ref query_delete = format!("
            DELETE FROM
            Configs
            WHERE
            setting = :setting;
        ");

        let config_name: &str = &config_name;

        let params: &[(&str, &ToSql)] = &[
            (":setting", &config_name)
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
}
