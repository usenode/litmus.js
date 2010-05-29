
TESTS=litmus_tests_suite

ext/pkg.js/src/pkg.js: ext/pkg.js/src/pkg.src.js ext/pkg.js/ext/node-promise/promise.js
	cd ext/pkg.js && \
	make

ext/pkg.js/src/pkg.src.js:
	git submodule init && \
	git submodule update

ext/pkg.js/ext/node-promise/promise.js:
	cd ext/pkg.js && \
	git submodule init && \
	git submodule update

test: ext/pkg.js/src/pkg.js
	./bin/litmus -I litmus:src -I litmus_tests:tests $(TESTS)


