#!/usr/bin/env bash

# see: https://github.com/jgallagher/rusqlite/blob/master/Changelog.md#version-050-2015-12-08
# PKG_CONFIG_PATH=$(echo /usr/local/Cellar/sqlite/3.9.1/lib/pkgconfig/) cargo build

cargo build
target/debug/grokdb --app=./assets -p 3030 --dir=./images utsc
