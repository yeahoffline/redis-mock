REPORTER?=spec
FLAGS=--reporter $(REPORTER)

# Runs the tests against a mock
test:
	npm test -- $(FLAGS)

watch-tests:
	npm test -- --watch $(FLAGS)

# Runs the tests against a real redis to make sure they are valid
validate-tests:
	npm run test:valid -- $(FLAGS)

lint:
	npm run lint

test-all: lint validate-tests test
