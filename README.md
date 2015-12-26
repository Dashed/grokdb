grokdb
======

RESTful flashcard application in rust. Does not come with a client (e.g. web UI).

development
===========

## general

Update crate dependencies using: https://github.com/kbknapp/cargo-outdated



## rusqlite

A fork of rusqlite is being used: https://github.com/Dashed/rusqlite

For OSX:

```sh
PKG_CONFIG_PATH=$(echo /usr/local/Cellar/sqlite/3.9.1/lib/pkgconfig/) cargo run
```

## development

During development, run: `cargo watch check |& dybuk`

- https://github.com/passcod/cargo-watch
- https://github.com/rsolomo/cargo-check
- https://github.com/Ticki/dybuk
