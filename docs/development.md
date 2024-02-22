# Development & Deployment

## Running the Application

Set the required environment variables before running the application, listed in [env.template](../env.templae).

To run the application locally, do:

```bash
yarn start
```

## Code Generation

Middle tier uses MarkLogic-provided [node client library](https://www.npmjs.com/package/marklogic)  to access its API. Whenever the MarkLogic code for the REST API is updated, the client code must be regenerated.

Make sure the up-to-date MarkLogic code is present at the same level as this code (`../marklogic` -- see [gulpfile.js](gulpfile.js)), then run:

```bash
yarn buildProxy
```

will update `lib/ml-generated/lux.js`.

## Dependency

This is a [Node.js](https://nodejs.org/) application. For package management, [yarn](https://yarnpkg.com/) is used (vs. npm), thus yarn.lock is kept in version control while package-lock.json is not.

[winston](https://github.com/winstonjs/winston) is used for logging.

## Docker

To build a docker image and run it, see [Dockerfile](../docker/Dockerfile), [build-docker-image.sh](../docker/build-docker-image.sh), and [run-docker-container.sh](../docker/run-docker-container.sh) for an example.
