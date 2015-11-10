// crates
extern crate clap;
extern crate iron;
// [begin] iron framework plugins
extern crate router;
extern crate logger;
extern crate staticfile;
extern crate bodyparser;
extern crate urlencoded;
// [end] iron framework plugins
// extern crate chrono;
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
use router::{Router};
use logger::Logger;
use staticfile::Static;
// [end] iron framework
// use chrono::*;

use std::path::Path;



// #[derive(Debug)]
// struct Person {
//     id: i32,
//     name: String,
//     time_created: Timespec,
//     data: Option<Vec<u8>>
// }

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

    if let Err(why) = grokdb {
        println!("FATAL ERROR:\n{}", why);
        std::process::exit(1);
    }

    let grokdb: GrokDB = match grokdb {
        Ok(grokdb) => grokdb,
        _ => unreachable!(),
    };

    /* iron router */

    let mut router = Router::new();

    if cmd_matches.is_present("app_path") {
        let app_path = cmd_matches.value_of("app_path")
                                    .unwrap()
                                    .trim();

        router.get("/", Static::new(Path::new(app_path)));
    }

    /* REST API */

    api::restify(&mut router, grokdb);

    // router.get("/decks", handler);

    // fn handler(req: &mut Request) -> IronResult<Response> {
    //     // let ref query = req.extensions.get::<Router>().unwrap().find("query").unwrap_or("/");
    //     // Ok(Response::with((status::Ok, *query)))
    //     // let deck = grokdb.decks.get(1);
    //     foo;

    //     Ok(Response::with((status::Ok, "lol")))
    // }


    /* iron logging */

    let mut log_chain = Chain::new(router);

    let (logger_before, logger_after) = Logger::new(None);

    log_chain.link_before(logger_before);
    log_chain.link_after(logger_after);

    /* start the server */

    match Iron::new(log_chain).http("localhost:3030") {
        Err(why) => panic!("{:?}", why),
        Ok(_) => println!("Listening on port 3030"),
    }


    // TODO: should be from command line
    // let path_str = "test.db";

    // let utc: DateTime<UTC> = UTC::now();

    // println!("{}", utc.timestamp().to_string());


    // conn.execute("CREATE TABLE person (
    //               id              INTEGER PRIMARY KEY,
    //               name            TEXT NOT NULL,
    //               time_created    TEXT NOT NULL,
    //               data            BLOB
    //               )", &[]).unwrap();
    // let me = Person {
    //     id: 0,
    //     name: "Steven".to_string(),
    //     time_created: time::get_time(),
    //     data: None
    // };
    // conn.execute("INSERT INTO person (name, time_created, data)
    //               VALUES ($1, $2, $3)",
    //              &[&me.name, &me.time_created, &me.data]).unwrap();

    // let mut stmt = conn.prepare("SELECT id, name, time_created, data FROM person").unwrap();
    // let mut person_iter = stmt.query_map(&[], |row| {
    //     Person {
    //         id: row.get(0),
    //         name: row.get(1),
    //         time_created: row.get(2),
    //         data: row.get(3)
    //     }
    // }).unwrap();

    // for person in person_iter {
    //     println!("Found person {:?}", person.unwrap());
    // }
}
