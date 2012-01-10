SHELL=/bin/bash

TESTS=./tests/suite.js
AMD_DIR=./amd
DIST_DIR=./dist
DIST_BUILD_DIR=./dist/build

default: test

clean:
	rm -fr $(AMD_DIR) $(DIST_DIR)

setup: clean
	mkdir -p $(AMD_DIR)/{lib,tests,litmus,ext}

dependencies:
	npm install .

./node_modules/.bin/commonjs-to-amd:
	npm install amdtools

./node_modules/requirejs/require.js:
	npm install requirejs

amd: ./node_modules/.bin/commonjs-to-amd ./node_modules/requirejs/require.js setup
	find {lib,tests,litmus} | grep '.js' | awk -F / '{print "./node_modules/.bin/commonjs-to-amd " $$0 " > $(AMD_DIR)/" $$0 }' | sh && \
	./node_modules/.bin/commonjs-to-amd ./litmus.js > $(AMD_DIR)/litmus.js && \
	cp tests/index.html $(AMD_DIR)/tests && \
	cp ./node_modules/requirejs/require.js $(AMD_DIR)/ext/require.js && \
	cp ext/domReady.js $(AMD_DIR)/ext/domReady.js

browser-dist: dependencies amd
	mkdir -p $(DIST_BUILD_DIR) && \
	./node_modules/.bin/r.js -o requirejs.build.js && \
	cp $(DIST_BUILD_DIR)/litmus/browser.js $(DIST_DIR)/litmus.js && \
	cp ./node_modules/requirejs/require.js $(DIST_DIR) && \
	cp ./dist-example.html $(DIST_DIR) && \
	rm -fr $(DIST_BUILD_DIR)

test: dependencies
	./bin/litmus $(TESTS)

release: test browser-dist
	./node_modules/.bin/usenode-release .
