**LUX Middle Tier Introduction**

- [Code: Initialization through Endpoint Consumption](#code-initialization-through-endpoint-consumption)
- [Deployment](#deployment)
- [Parting Notes](#parting-notes)

### Code: Initialization through Endpoint Consumption

All relative paths are relative to https://github.com/project-lux/lux-middletier.

When the Node.js instance starts (`npm run start`), [./index.js](./index.js) is executed.  It gets the app going.  Excerpt:

```javascript
const { newApp } = require('./app/app')

const app = newApp()
app.run()
```

Trimmed down version of [./app/app.js](./app/app.js), **initializing a connection**:

```javascript
/* 
 * MarkLogic Node.js Client API
 * ============================
 * 
 * Dependency listed in package.json
 * Source: https://github.com/marklogic/node-client-api
 * Documentation: https://docs.marklogic.com/jsdoc/index.html
 */
const marklogic = require('marklogic')

const { MLProxy } = require('../lib/ml-proxy')

const newApp = () => {
  const mlClient = marklogic.createDatabaseClient({
    host: env.mlHost,
    port: env.mlPort,
    user: env.mlUser,
    password: env.mlPass,
    authType: env.mlAuthType,
    ssl: env.mlSsl,
  })

  const mlProxy = new MLProxy(mlClient)

  const app = new App({
    port: env.appPort,
    mlProxy,
  })
  return app
}

exports.newApp = newApp
```

The `App` class is another part of [./app/app.js](./app/app.js) which **configures Express.js** and **processes middle tier requests**:

```javascript
class App {
  constructor(config) {
    this.app = null // express app
    this.port = config.port
    this.mlProxy = config.mlProxy
    this.searchUriHost = env.searchUriHost || 'https://lux.collections.yale.edu'
  }

  run() {
    const { port } = this
    const exp = express()
    exp.use(cors())
    exp.use(express.static('public'))

    exp.get('/data/:type/:uuid', this.handleGetDocument.bind(this))

    exp.listen(port, () => {
      log.info(`Listening on port ${port}`)
    })
  }

  handleGetDocument(req, res) {
    const { type, uuid } = req.params
    const uri = `${this.searchUriHost}/data/${type}/${uuid}`
    const { profile, lang } = req.query

    this.mlProxy.getDocument(uri, profile || null, lang || null)
      .then(async doc => {
        // happy flow
      })
      .catch(err => {
        // oh drat flow
      })
  }
}
```

Excerpt from [./lib/ml-proxy.js](./lib/ml-proxy.js), an **optional abstraction layer**:

```
const Lux = require('./ml-generated/lux')

// A mediator between the application and the auto-generated MarkLogic client code
class MLProxy {
  constructor(mlClient) {
    this.db = mlClient
    this.luxInstance = Lux.on(this.db)
  }

  getDocument(uri, profile, lang) {
    return this.luxInstance.document(uri, profile, lang)
  }

  ...other functions
}

exports.MLProxy = MLProxy
```

Excerpt from [./lib/ml-generated/lux.js](./lib/ml-generated/lux.js), the **generated data service proxy**:

```javascript
class Lux {
  /**
  * Invokes the document operation on the database server.
  * @param {string} uri - provides an input value of the string datatype,
  * @param {string} [profile] - provides an input value of the string datatype,
  * @param {string} [lang] - provides an input value of the string datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  document(uri, profile, lang) {
    return this.$mlProxy.execute("document", {
      "uri": uri,
      "profile": profile,
      "lang": lang
    }, arguments.length);
  }

  ...other functions
}
module.exports = Lux;
```

On the MarkLogic side, the [document data service](https://github.com/project-lux/lux-marklogic/blob/main/src/main/ml-modules/root/ds/lux/document.mjs):

```javascript
import { get } from '../../lib/crudLib.mjs';
import { handleRequest } from '../../lib/requestHandleLib.mjs';

const uri = external.uri;
const profile = external.profile;
const lang = external.lang;
handleRequest(function () {
  return get(uri, profile, lang);
});
```

[Proxy generation directions (v1.30)](https://github.com/project-lux/lux-marklogic/blob/release1.30/docs/lux-backend-api-usage.md#generated-data-service-interfaces), of which [./gulpfile.js](./gulpfile.js) is a piece of:

```javascript
const gulp = require('gulp')
const proxy = require('marklogic/lib/proxy-generator')

function proxygen() {
  return gulp
    .src('../lux-marklogic/src/main/ml-modules/root/ds/*')
    .pipe(proxy.generate())
    .pipe(gulp.dest('lib/ml-generated'))
}

exports.proxygen = proxygen
```

### Deployment

Take it away, Kam and Peter!

### Parting Notes

Advantages and uses:

* Leverage MarkLogic-supported proxies to consume Data Services.  Includes request retry logic.
* Authentication.
* [Hypertext Application Language](https://en.wikipedia.org/wiki/Hypertext_Application_Language) (HAL)
links
* URL manipulation.
* Future enhancements that are neither ideal for the frontend nor backend.

The LUX middle tier splits its requests by request type amongst two MarkLogic application servers.  As such, it instantiates two instances each of DatabaseClient and MLProxy.  The reason for this is outdated and likely would not apply to others that adopt LUX.  As such, within the code base, instances of `mlProxy` and `mlProxy2` may be viewed as one in the same; this is also true for `mlClient` and `mlClient2`.

The [./lib/build-query](./lib/build-query) directory is used by [./lib/hal-links-builder.js](./lib/hal-links-builder.js) to provide information to the frontend on a specific entity page.  Files within the [./lib/build-query/queries](./lib/build-query/queries) sub-directory define search criteria.  The search grammar was developed for LUX and can be used by others.  The available search terms would vary by dataset.  For instance, if one dataset had a specific predicate that another did not, only the search term configuration for the former should include it.  Others that adopt LUX should expect to update the [search term configuration](https://github.com/project-lux/lux-marklogic/blob/main/src/main/ml-modules/root/config/searchTermsConfig.mjs) (in the backend) to align with their dataset, which would then lead to middle tier changes.

Additional documentation:

* [LUX Middle Tier](./docs)
* [LUX Backend](https://github.com/project-lux/lux-marklogic/blob/main/docs)

