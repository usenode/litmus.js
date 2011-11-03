
TESTS=./tests/suite.js
AMD_DIR=./amd

default: test

clean:
	rm -fr $(AMD_DIR)

setup: clean
	mkdir -p $(AMD_DIR)/{lib,tests,ext}

./node_modules/.bin/commonjs-to-amd:
	npm install amdtools

./node_modules/requirejs/require.js:
	npm install requirejs

amd: ./node_modules/.bin/commonjs-to-amd ./node_modules/requirejs/require.js setup
	find {lib,tests} | grep '.js' | awk -F / '{print "./node_modules/.bin/commonjs-to-amd " $$0 " > $(AMD_DIR)/" $$0 }' | sh && \
	cp tests/index.html $(AMD_DIR)/tests && \
	cp ./node_modules/requirejs/require.js $(AMD_DIR)/ext/require.js

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

