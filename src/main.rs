
// mod greetings;

// crates
extern crate clap;
extern crate iron;
// [begin] iron framework plugins
extern crate router;
extern crate logger;
// [end] iron framework plugins
// extern crate chrono;
// extern crate rusqlite;

use clap::{Arg, App};
use iron::{Iron, Request, Response, IronResult, Chain};
use iron::status;
use router::{Router};
use logger::Logger;
// use chrono::*;
// use rusqlite::SqliteConnection;

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
            Arg::with_name("database_name")
            .required(true)
            .index(1)
            .help("Flashcard database name")
            .validator(|database_name| {
                let database_name = database_name.trim();
                if database_name.len() <= 0 {
                    return Err(String::from("invalid database name"));
                } else {
                    return Ok(());
                }
            })
        ).get_matches();

    let mut database_name: String = cmd_matches.value_of("database_name").unwrap().trim().to_string();

    if !database_name.to_lowercase().ends_with(".db") {
        database_name = format!("{}.db", database_name)
    }

    let database_name = database_name;

    /* iron router */

    let mut router = Router::new();
    router.get("/", handler);        // let router = router!(get "/" => handler,
    router.get("/:query", handler);  //

    fn handler(req: &mut Request) -> IronResult<Response> {
        let ref query = req.extensions.get::<Router>().unwrap().find("query").unwrap_or("/");
        Ok(Response::with((status::Ok, *query)))
    }

    let router_chain = Chain::new(router);

    /* iron logging */

    let mut log_chain = Chain::new(router_chain);

    let (logger_before, logger_after) = Logger::new(None);

    log_chain.link_before(logger_before);
    log_chain.link_after(logger_after);

    match Iron::new(log_chain).http("localhost:3030") {
        Err(why) => panic!("{:?}", why),
        Ok(_) => println!("Listening on port 3030"),
    }


    // TODO: should be from command line
    // let path_str = "test.db";

    // let conn = SqliteConnection::open(&path_str).unwrap();

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
