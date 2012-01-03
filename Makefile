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

# see requirejs issue #158
./node_modules/requirejs/require.js:
	npm install requirejs
	patch ./node_modules/requirejs/require.js ./requirejs-normalizefix.patch

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

publish: test 
	perl -e '`git status` =~ /working directory clean/ or die "cannot publish without clean working dir\n"' && \
	echo current version is `perl -ne 'print /"version"\s*:\s*"(\d+\.\d+\.\d+)"/' package.json` && \
	perl -e 'print "new version? "' && \
	read new_version && \
	perl -i -pe 's/("version"\s*:\s*\")(?:|\d+\.\d+\.\d+)(")/$$1."'$$new_version'".$$2/e' package.json && \
	git commit -m 'Version for release' package.json && \
	git tag v$$new_version && \
	git push origin master && \
	git push --tags && \
	npm publish https://github.com/usenode/litmus.js/tarball/v$$new_version

