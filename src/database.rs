extern crate rusqlite;

use rusqlite::SqliteConnection;
use std::ops::Deref;
use std::sync::Mutex;
use std::sync::mpsc::{sync_channel, SyncSender, Receiver};
use std::thread;
use std::thread::JoinHandle;

pub enum Message {
    Quit,
    Write(String),
}

pub struct DBPortal {
    db_tx: Mutex<SyncSender<Message>>,
    main_rx: Mutex<Receiver<String>>,
    join_handle: JoinHandle<()>,
}

impl DBPortal {
    pub fn write(&self, msg: Message) -> String {

        let db_tx = self.db_tx.lock().unwrap();
        let main_rx = self.main_rx.lock().unwrap();

        db_tx.send(msg).unwrap();

        return main_rx.recv().unwrap();
    }
}

impl Drop for DBPortal {
    fn drop(&mut self) {
        self.write(Message::Quit);
    }
}

pub fn bootstrap(database_name: String) -> DBPortal {

    let database_name = database_name.clone();

    let (main_tx, main_rx) = sync_channel::<String>(1);
    let (db_tx, db_rx) = sync_channel::<Message>(1);


    let join_handle: JoinHandle<()> = thread::spawn(move || {

        // open db connection
        let ref db_conn = match SqliteConnection::open(database_name) {
            Err(why) => panic!("{:?}", why),
            Ok(db_conn) => db_conn,
        };

        loop {
            let msg: Message = db_rx.recv().unwrap();

            match msg {
                Message::Quit => break,
                Message::Write(query) => main_tx.send(query).unwrap(),
            }
        }
    });

    return DBPortal {
        db_tx: Mutex::new(db_tx),
        main_rx: Mutex::new(main_rx),
        join_handle: join_handle,
    };
}
