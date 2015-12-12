extern crate iron;
extern crate router;
extern crate bodyparser;
extern crate rustc_serialize;

use iron::status;
use iron::prelude::*;
use router::Router;
use rustc_serialize::json;

use std::sync::Arc;
use std::ops::Deref;
use std::error::Error;

use ::api::{GrokDB, ErrorResponse};
use ::api::configs::{SetConfig, SetConfigRequest, ConfigResponse};
use ::database::QueryError;

// attach configs REST endpoints to given router
pub fn restify(router: &mut Router, grokdb: GrokDB) {

    let grokdb = Arc::new(grokdb);

    router.get("/configs/:config_name", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();

            // fetch and parse requested card id
            let config_name: &str = req.extensions.get::<Router>().unwrap().find("config_name").unwrap();

            let config_name: String = config_name.to_string();

            return get_config(&grokdb, &config_name);
        }
    });

    router.post("/configs/:config_name", {
        let grokdb = grokdb.clone();
        move |req: &mut Request| -> IronResult<Response> {
            let ref grokdb = grokdb.deref();


            // parse json
            let set_config_request = req.get::<bodyparser::Struct<SetConfigRequest>>();

            // fetch and parse requested card id
            let config_name: &str = req.extensions.get::<Router>().unwrap().find("config_name").unwrap();

            let config_name: String = config_name.to_string();


            let set_config_request: SetConfig = match set_config_request {

                Ok(Some(set_config_request)) => {

                    SetConfig {
                        setting: config_name,
                        value: set_config_request.value
                    }
                },

                Ok(None) => {

                    let reason = "no JSON given";
                    let res_code = status::BadRequest;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: reason,
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
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

            if !set_config_request.should_update() {

                let ref reason = format!("Invalid set config request.");
                let res_code = status::BadRequest;

                let err_response = ErrorResponse {
                    status: res_code,
                    developerMessage: reason,
                    userMessage: reason,
                }.to_json();

                return Ok(Response::with((res_code, err_response)));
            }

            // update config
            match grokdb.configs.set(&set_config_request) {
                Err(why) => {
                    // why: QueryError

                    let ref reason = format!("{:?}", why);
                    let res_code = status::InternalServerError;

                    let err_response = ErrorResponse {
                        status: res_code,
                        developerMessage: reason,
                        userMessage: why.description(),
                    }.to_json();

                    return Ok(Response::with((res_code, err_response)));
                },
                _ => {/* config updated */}
            }

            return get_config(&grokdb, &set_config_request.setting);
        }
    });
}

fn get_config(grokdb: &GrokDB, config_name: &String) -> IronResult<Response> {

    // ensure stash exists
    match config_exists(grokdb, config_name) {
        Err(response) => {
            return response;
        },
        _ => {/* config exists; continue */}
    }

    let maybe_config: Result<ConfigResponse, QueryError> = grokdb.configs.get(config_name);

    let config: ConfigResponse = match maybe_config {

        Err(why) => {
            // why: QueryError

            let ref reason = format!("{:?}", why);
            let res_code = status::NotFound;

            let err_response = ErrorResponse {
                status: res_code,
                developerMessage: reason,
                userMessage: why.description(),
            }.to_json();

            return Ok(Response::with((res_code, err_response)));
        },

        Ok(config) => config,
    };

    let response = config.to_json();

    return Ok(Response::with((status::Ok, response)));
}

pub fn config_exists(grokdb: &GrokDB, config_name: &String) -> Result<(), IronResult<Response>> {

    match grokdb.configs.exists(config_name) {

        Err(why) => {
            // why: QueryError

            let ref reason = format!("{:?}", why);
            let res_code = status::InternalServerError;

            let err_response = ErrorResponse {
                status: res_code,
                developerMessage: reason,
                userMessage: why.description(),
            }.to_json();

            let res = Ok(Response::with((res_code, err_response)));
            return Err(res);
        },

        Ok(false) => {
            let ref reason = format!("given config setting does not exist: {}", config_name);
            let res_code = status::NotFound;

            let err_response = ErrorResponse {
                status: res_code,
                developerMessage: reason,
                userMessage: reason,
            }.to_json();

            let res = Ok(Response::with((res_code, err_response)));
            return Err(res);
        },

        _ => {
            return Ok(());
        }
    }
}
