````
cd maker/app
````

To run unit tests:

````
npm test
````

To run tests with code coverage:
````
npm run coverage
````

A pretty coverage report gets written to test/coverage/lcov-report/index.html

Text execution commands can be found in the "scripts" block of package.json.
Note that the async. test timeout was increased to 5 seconds to ensure tests would pass when running on slower hardware.

