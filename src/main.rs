#![feature(convert)]
// https://github.com/rust-lang/rust/issues/27729

// crates
extern crate regex;
extern crate chrono;
extern crate libc;
extern crate rand;
extern crate clap;
extern crate iron;
// [begin] iron framework plugins
extern crate mount;
extern crate router;
extern crate logger;
extern crate staticfile;
extern crate bodyparser;
extern crate urlencoded;
// [end] iron framework plugins
extern crate rusqlite;
extern crate rustc_serialize;

// local modules
mod database;
mod queries;
mod api;

// local scoped names
use api::GrokDB;

use clap::{Arg, App};
// [begin] iron framework
use iron::{Iron, Chain, AfterMiddleware, Response, Request, IronResult};
use iron::error::{IronError};
use mount::Mount;
use router::{Router};
use logger::Logger;
use staticfile::Static;
use iron::middleware::Handler;
// [end] iron framework

use std::path::{Path};


struct Custom404 {
    staticfile: Static
}

impl AfterMiddleware for Custom404 {
    fn catch(&self, req: &mut Request, err: IronError) -> IronResult<Response> {

        // TODO: so hacky. need better alternative
        req.url.path = vec!["index.html".to_string()];

        return self.staticfile.handle(req);
        // return Ok(Response::with((status::NotFound, "404 Not Found")));
    }
}

fn main() {

    // let do this! ᕕ( ᐛ )ᕗ

    // parse command line args

    let cmd_matches = App::new("grokdb")
        .version("0.1") // semver semantics

        .author("Alberto Leal <mailforalberto@gmail.com> (github.com/dashed)")

        .about("flashcard app to help you grok better")

        .arg(
            Arg::with_name("port")
            .short("p")
            .long("port")
            .help("Port number to serve")
            .takes_value(true)
            // TODO: refactor to remove this; i.e. automatically find a free port
            .required(true)
            .validator(|port| {
                let port = port.trim();
                if port.len() <= 0 {
                    return Err(String::from("invalid port number"));
                }
                match port.parse::<u16>() {
                    Ok(_) => {
                        return Ok(());
                    },
                    _ => {
                        return Err(String::from("invalid port number"));
                    }
                };
            })
        )
        .arg(
            Arg::with_name("app_path")
            .short("a")
            .long("app")
            .help("Sets directory path to serve web app from")
            .takes_value(true)
            .multiple(false)
            .required(false)
            .validator(|app_path| {
                let app_path = app_path.trim();
                if app_path.len() <= 0 {
                    return Err(String::from("invalid directory app dir path"));
                } else {
                    return Ok(());
                }
            })
        )
        .arg(
            Arg::with_name("dir")
            .short("d")
            .long("dir")
            .help("Static assets directory to serve")
            .takes_value(true)
            .multiple(false)
            .required(false)
            .validator(|asset_path| {
                let asset_path = asset_path.trim();
                if asset_path.len() <= 0 {
                    return Err(String::from("invalid directory static dir path"));
                } else {
                    return Ok(());
                }
            })
        )
        .arg(
            Arg::with_name("backup")
            .short("b")
            .long("backup")
            .help("Set the path to the backup directory. By default, it will be the current directory.")
            .takes_value(true)
            .multiple(false)
            .required(false)
            .validator(|asset_path| {
                let asset_path = asset_path.trim();
                if asset_path.len() <= 0 {
                    return Err(String::from("invalid directory static dir path"));
                } else {
                    return Ok(());
                }
            })
        )
        .arg(
            Arg::with_name("database_name")
            .help("Database name to store your flashcards")
            .required(true)
            .index(1)
            .validator(|database_name| {
                let database_name = database_name.trim();
                if database_name.len() <= 0 {
                    return Err(String::from("invalid database name"));
                } else {
                    return Ok(());
                }
            })
        ).get_matches();

    // TODO: if port number is not given, find an available one
    // fetch port number to serve to
    let port = cmd_matches.value_of("port")
                            .unwrap()
                            .trim();

    let port: u16 = match port.parse::<u16>() {
        Ok(port) => port,
        _ => unreachable!()
    };

    // fetch database name

    let mut database_name: String = cmd_matches.value_of("database_name")
                                                .unwrap()
                                                .trim()
                                                .to_string();

    if !database_name.to_lowercase().ends_with(".db") {
        database_name = format!("{}.db", database_name);

        println!("Using database: {}", database_name);
    }

    let database_name = database_name;

    // set up api
    let grokdb = api::new(database_name);

    let grokdb: GrokDB = match grokdb {

        Ok(grokdb) => grokdb,

        Err(why) => {
            println!("FATAL ERROR:\n{}", why);
            std::process::exit(1);
        }
    };

    let mut grokdb = grokdb;

    if let Some(ref backup_path) = cmd_matches.value_of("backup") {
        let backup_path = backup_path.trim();
        grokdb.backup_base_dest = Some(format!("{}", backup_path));

        println!("Default back up path at: {}", backup_path);
    }

    let grokdb = grokdb;

    /* iron middleware */
    let mut router = Router::new();
    let mut mount = Mount::new();

    /* set up iron router */

    api::restify(&mut router, grokdb);

    /* REST API */

    mount.mount("/api", router);

    /* static files */

    let mut maybe_app_path: Option<&str> = None;

    // set app path
    if let Some(ref app_path) = cmd_matches.value_of("app_path") {
        let app_path = app_path.trim();
        mount.mount("/", Static::new(Path::new(app_path)));

        println!("Serving app at / from: {}", app_path);

        maybe_app_path = Some(app_path);
    }
    let maybe_app_path = maybe_app_path;

    // TODO: set multiple assets directory to /assets in the order they're defined via clap-rs
    // set assets directory
    if let Some(ref asset_path) = cmd_matches.value_of("dir") {
        let asset_path = asset_path.trim();
        mount.mount("/assets", Static::new(Path::new(asset_path)));

        println!("Serving assets at /assets from: {}", asset_path);
    }

    let mut log_chain = Chain::new(mount);

    /* iron logging */

    let (logger_before, logger_after) = Logger::new(None);

    log_chain.link_before(logger_before);
    log_chain.link_after(logger_after);

    // redirect to app on non-existent routes

    match maybe_app_path {
        None => {/* continue */},
        Some(app_path) => {

            let custom_404 = Custom404 {
                staticfile: Static::new(app_path)
            };

            log_chain.link_after(custom_404);
        }
    }

    /* start the server */

    match Iron::new(log_chain).http(("localhost", port)) {
        Err(why) => panic!("{:?}", why),
        Ok(_) => println!("Listening on port {}", port),
    }

}
