TESTS = $(shell find test/ -name '*.test.js')
REPORTER?=spec
FLAGS=--reporter $(REPORTER)

run-tests:
	@./node_modules/.bin/mocha --timeout 5000 $(TESTS) $(FLAGS)

watch-tests:
	@./node_modules/.bin/mocha --timeout 5000 --watch $(TESTS) $(FLAGS)

test:
	@$(MAKE) NODE_PATH=lib TESTS="$(ALL_TESTS)" run-tests

#This is used to validate the tests work on redis_mock
check-tests:
	@$(MAKE) NODE_PATH=lib VALID_TESTS="TRUE" TESTS="$(ALL_TESTS)" run-tests

.PHONY: test
