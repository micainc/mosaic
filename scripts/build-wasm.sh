#!/bin/bash
emcc \
    src/cpp/slic.cpp \
    -o src/slic.js \
    -s WASM=1 \
    -s ENVIRONMENT='web' \
    -O3 \
    -s MODULARIZE=1 \
    -s 'EXPORT_NAME="createModule"' \
    --bind