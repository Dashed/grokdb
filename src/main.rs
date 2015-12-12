// crates
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
use iron::{Iron, Chain};
use mount::Mount;
use router::{Router};
use logger::Logger;
use staticfile::Static;
// [end] iron framework

use std::path::{Path, PathBuf};


fn main() {

    // parse command line args

    let cmd_matches = App::new("grokdb")
        .version("0.1") // semver semantics

        .author("Alberto Leal <mailforalberto@gmail.com> (github.com/dashed)")

        .about("flashcard app to help you grok better")

        .arg(

            Arg::with_name("app_path")
            .short("a")
            .long("app")
            .help("Sets directory path to serve web app from")
            .takes_value(true)
            .validator(|app_path| {
                let app_path = app_path.trim();
                if app_path.len() <= 0 {
                    return Err(String::from("invalid directory app path"));
                } else {
                    return Ok(());
                }
            })
        )
        // TODO: port
        // TODO: multiple static directories to serve

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

    let mut database_name: String = cmd_matches.value_of("database_name")
                                                .unwrap()
                                                .trim()
                                                .to_string();

    if !database_name.to_lowercase().ends_with(".db") {
        database_name = format!("{}.db", database_name)
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

    /* set up iron router */

    /* REST API */

    let mut router = Router::new();
    api::restify(&mut router, grokdb);

    /* static files */

    let mut mount = Mount::new();

    let app_path = cmd_matches.value_of("app_path")
                                .unwrap()
                                .trim();

    mount
        .mount("/api", router)
        .mount("/", Static::new(Path::new(app_path)));

    /* iron logging */

    let mut log_chain = Chain::new(mount);

    let (logger_before, logger_after) = Logger::new(None);

    log_chain.link_before(logger_before);
    log_chain.link_after(logger_after);

    /* start the server */

    match Iron::new(log_chain).http("localhost:3030") {
        Err(why) => panic!("{:?}", why),
        Ok(_) => println!("Listening on port 3030"),
    }

}
