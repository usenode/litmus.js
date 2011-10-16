
TESTS=./tests/suite.js
AMD_DIR=./amd

default: test

clean:
	rm -fr $(AMD_DIR)

setup: clean
	mkdir $(AMD_DIR)

$(AMD_DIR)/litmus.js:
	./build/convert-to-amd ./lib/litmus.js > $(AMD_DIR)/litmus.js

$(AMD_DIR)/utils.js:
	./build/convert-to-amd ./lib/utils.js > $(AMD_DIR)/utils.js

$(AMD_DIR)/assertions.js:
	./build/convert-to-amd ./lib/assertions.js > $(AMD_DIR)/assertions.js

./node_modules/.bin/commonjs-to-amd:
	npm install amdtools

# TODO $(AMD_DIR)/utils.js is failing to convert
amd: ./node_modules/.bin/commonjs-to-amd setup $(AMD_DIR)/assertions.js $(AMD_DIR)/litmus.js

test:
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
	npm publish https://github.com/tomyan/litmus.js/tarball/v$$new_version

