extern crate iron;
extern crate rusqlite;
extern crate router;
extern crate rustc_serialize;

pub mod decks;

use rusqlite::SqliteError;
use iron::{Request, Response, IronResult};
use iron::status;
use router::Router;

use std::sync::Arc;

use self::decks::Decks;
use super::database::{DB, BootstrapError};


pub struct ErrorResponse<'a>  {
    status: status::Status,
    developerMessage: &'a str,
    userMessage: &'a str,
}

// Pattern from: https://github.com/WhiteHouse/api-standards#error-handling
impl<'a> ErrorResponse<'a> {
    pub fn get_raw(&self) -> __ErrorResponse {

        let response = __ErrorResponse {
            status: self.status.to_u16(),
            developerMessage: format!("{}", self.developerMessage),
            userMessage: format!("{}", self.userMessage),
        };

        return response;
    }
}

// less-hacky alternative to https://doc.rust-lang.org/error-index.html#E0117
//
// this struct is essentially the same as above; but is "encodable"-friendly for
// rustc_serialize.
//
#[derive(RustcEncodable)]
pub struct __ErrorResponse  {
    status: u16,
    developerMessage: String,
    userMessage: String,
}

// TODO: this is a horrible hack! definitely not doing this; prefer above as alternative
// see:
// - https://internals.rust-lang.org/t/named-trait-instances/2823
// - https://doc.rust-lang.org/error-index.html#E0117
// - https://gist.github.com/DanielKeep/f0c0d882241af4e69a19
//
// pub trait Encodable {
//     fn encode<S: rustc_serialize::Encoder>(&self, s: &mut S) -> Result<(), S::Error>;
// }
// impl Encodable for status::Status {
//     fn encode<S: rustc_serialize::Encoder>(&self, s: &mut S) -> Result<(), S::Error> {
//         let foo = *self;
//         return s.emit_u16(foo.to_u16());
//     }
// }

pub struct GrokDB {
    pub decks: Decks,
}

pub fn new(database_name: String) -> Result<GrokDB, BootstrapError> {

    // open db connection and bootstrap it
    let db_conn: Result<DB, BootstrapError> = super::database::bootstrap(database_name);

    let db: Arc<DB> = Arc::new(try!(db_conn));

    let api = GrokDB {
        decks: Decks {
            db: db.clone()
        }
    };

    return Ok(api);
}

pub fn restify(router: &mut Router, grokdb: GrokDB) {

    // TODO: db backup

    decks::restify(router, grokdb);
}

