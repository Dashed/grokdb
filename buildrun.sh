#!/usr/bin/env bash

PKG_CONFIG_PATH=$(echo /usr/local/Cellar/sqlite/3.9.1/lib/pkgconfig/) cargo build
target/debug/grokdb --app=./assets utsc


