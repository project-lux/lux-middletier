# Development & Deployment

## Overview

The middle tier is a mediator that sits between the MarkLogic database backend and the JavaScript frontend.  It is a web application implemented with Node.js. It provides API endpoints that serves data in JSON format.

## Running the Application Locally

### 1. Prerequisites

Running this middle tier assumes there is a MarkLogic database running somewhere that it can talk to. See https://github.com/project-lux/lux-marklogic for more information.

### 2. Install/Update NPM Modules

This project uses [yarn](https://yarnpkg.com/) instead of [npm](https://www.npmjs.com/) for commands and dependency files -- e.g., keep yarn.lock instead of package-lock.json to lock the versions of the dependencies. First, install/update modules by running

```bash
yarn install
```

### 3.. Set the required environment variables

See [/env.template](../env.template). for the list of environment variable to set. Note: the app doesn't automatically read environment variables from a file (e.g. .env). You have to set them manually or copy .env.template to another file (say env), fill in the values, and do
```bash
source env
```



### 4. Run

```bash
yarn start
```

You can then access the application at http://localhost:{port}. For example, http://localhost:8080 if you set the environment variable APP_PORT to 8080.

## Code Generation

You can ignore this section except when the API on the MarkLogic side has been updated so that any of the endpoints requires a different signature than before.

Middle tier uses MarkLogic-provided [node client library](https://www.npmjs.com/package/marklogic) to access the API endpoints of the MarkLogic database. Whenever the MarkLogic code for the REST API is updated, the client code must be regenerated.

Make sure the MarkLogic code (from https://github.com/project-lux/lux-marklogic)  is cloned at the same level as this repository. That is, `lux-middletier/` and `lux-marklogic/` are present in the same parent directory.

Make sure the lux-marklogic code is at the desired version, and run the following from the `lux-middletier/.` directory (where package.json and gulpfile.js are present).

```bash
yarn buildProxy
```

Which will update the file  `./lib/ml-generated/lux.js`.

## Docker

To get an idea for building a docker image and running it, see [Dockerfile](../docker/Dockerfile), [build-docker-image.sh](../docker/build-docker-image.sh), and [run-docker-container.sh](../docker/run-docker-container.sh) in the [/docker](../docker) directory for an example.
