extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate rustc_serialize;
extern crate chrono;

use chrono::*;
use iron::status;
use iron::prelude::*;
use iron::mime::Mime;
use router::Router;
use rustc_serialize::json;
use rusqlite::DatabaseName;

use std::sync::Arc;
use std::ops::Deref;
use std::error::Error;
use std::path::{Path, PathBuf};

use ::api::{GrokDB, ErrorResponse};

#[derive(Debug, Clone, RustcDecodable)]
pub struct BackupRequest {
    name: Option<String>,
    dest_path: Option<String>,
    with_timestamp: Option<bool>
}

impl BackupRequest {

    fn with_timestamp(&self) -> bool {

        if self.with_timestamp.is_some() {
            return self.with_timestamp.unwrap();
        }

        return true;
    }

    fn get_name(&self, default_name: &String) -> String {

        if self.name.is_some() {
            return format!("{}", self.name.as_ref().unwrap());
        }

        return format!("{}", default_name);
    }

    fn get_dest(&self) -> String {

        if self.dest_path.is_some() {
            return format!("{}", self.dest_path.as_ref().unwrap());
        }

        return format!("./");
    }

    fn get_path(&self, default_name: &String) -> String {

        let name: String = {

            let __name: String = self.get_name(default_name);

            if self.with_timestamp() {
                format!("{}-{}.db",
                    __name,
                    UTC::now().format("%a-%b-%e--%H-%M-%S-%Y").to_string())
            } else {
                format!("{}.db", __name)
            }
        };

        let path = format!("{}/{}", self.get_dest(), name);
        let path = Path::new(&path);

        let normalized: PathBuf = path.iter().collect();
        let normalized = normalized.to_str().unwrap();

        return normalized.to_string();
    }
}

#[derive(Debug, RustcEncodable)]
pub struct BackupResponse {
    dest_file: String
}

impl BackupResponse {

    pub fn to_json(&self) -> String {
        return json::encode(self).unwrap();
    }
}

// attach backup REST endpoints to given router
pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);

    router.put("/backup", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            // parse json

            let backup_request = req.get::<bodyparser::Struct<BackupRequest>>();

            let backup_request: BackupRequest = match backup_request {
                Ok(Some(backup_request)) => backup_request,

                Ok(None) => {
                    BackupRequest {
                        name: Some(format!("{}", grokdb.base_db_name)),
                        dest_path: Some(format!("./")),
                        with_timestamp: Some(true)
                    }
                },

                Err(err) => {

                    let ref reason = format!("{:?}", err);
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: err.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                }
            };

            let mut backup_request = backup_request;

            // if no dest_path is given, fallback to any default backup_base_dest

            match grokdb.backup_base_dest {
                None => {/* continue */},
                Some(ref backup_base_dest) => {

                    if backup_request.dest_path.is_none() {
                        backup_request.dest_path = Some(format!("{}", backup_base_dest));
                    }
                }
            }

            let backup_request = backup_request;

            // back up database

            let db_conn_guard = grokdb.decks.db.lock().unwrap();
            let ref db_conn = *db_conn_guard;

            let dest_path: String = backup_request.get_path(&grokdb.base_db_name);

            match db_conn.backup(DatabaseName::Main, &dest_path, None) {
                Err(why) => {

                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },
                _ => {
                    // backup complete
                }
            };

            let response = BackupResponse {
                dest_file: dest_path
            }.to_json();

            let content_type = "application/json".parse::<Mime>().unwrap();

            return Ok(Response::with((content_type, status::Ok, response)));
        }
    });
}
