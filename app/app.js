const { hrtime } = require('node:process')
const cors = require('cors')
const express = require('express')
const marklogic = require('marklogic')

const env = require('../config/env')
const { HalLinksBuilder } = require('../lib/hal-links-builder')
const log = require('../lib/log')
const { MLProxy } = require('../lib/ml-proxy')
const util = require('../lib/util')
const { transformEntityDoc, translateQuery } = require('../lib/data-transform')

const { version } = require('../package.json')

/**
 * Create error response based on the error object passed in and send it
 * to client.
 *
 * @param {Error} err - error caught by a try...catch block.
 * @params {string} defaultMessage - error messge to prepend if err is not
 *   determined to originate from MarkLogic proxy.
 * @params {object} res - the current response object for Express handler
 */
const handleError = (err, defaultMessage, res) => {
  const parsed = MLProxy.parseError(err)
  let { statusCode, errorMessage } = parsed

  if (statusCode === 0) {
    statusCode = 500
    errorMessage = defaultMessage
  }

  log.error(`${defaultMessage} - ${errorMessage}`)

  res.status(statusCode)
  res.json({
    statusCode,
    errorMessage,
  })
}

class App {
  constructor(config) {
    this.app = null // express app
    this.port = config.port
    this.mlProxy = config.mlProxy
    this.mlProxy2 = config.mlProxy2
    this.searchUriHost = env.searchUriHost || 'https://lux.collections.yale.edu'
    this.resultUriHost = env.resultUriHost || null
  }

  run() {
    const { port } = this
    const exp = express()
    exp.use(cors())
    exp.use(express.static('public'))

    // Routes
    exp.get('/api/advanced-search-config', this.handleAdvancedSearchConfig.bind(this))
    exp.get('/api/auto-complete', this.handleAutoComplete.bind(this))
    exp.get('/api/facets/:scope', this.handleFacets.bind(this))
    exp.get('/api/related-list/:scope', this.handleRelatedList.bind(this))
    exp.get('/api/search/:scope', this.handleSearch.bind(this))
    exp.get('/api/search-estimate/:scope', this.handleSearchEstimate.bind(this))
    exp.get('/api/search-info', this.handleSearchInfo.bind(this))
    exp.get('/api/search-will-match', this.handleSearchWillMatch.bind(this))
    exp.get('/api/stats', this.handleStats.bind(this))
    exp.get('/api/translate/:scope', this.handleTranslate.bind(this))
    exp.get('/data/:type/:uuid', this.handleDocument.bind(this))
    exp.get('/health', (req, res) => {
      res.json({
        status: 'ok',
      })
    })
    exp.get('/api/_info', App._handleInfo)

    exp.listen(port, () => {
      log.info(`Listening on port ${port}`)
    })
  }

  handleAdvancedSearchConfig(req, res) {
    const start = hrtime.bigint()

    this.mlProxy2.advancedSearchConfig()
      .then(result => {
        res.json(util.replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        handleError(err, 'failed to retrieve advanced search config', res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for advanced search config ${util.remoteIps(req)}`)
      })
  }

  handleAutoComplete(req, res) {
    const start = hrtime.bigint()
    const q = req.query
    const text = q.text || ''
    const context = q.context || ''
    const fullyHonorContext = q.fullyHonorContext !== 'false'
    const onlyMatchOnPrimaryNames = q.onlyMatchOnPrimaryNames !== 'false'
    const onlyReturnPrimaryNames = q.onlyReturnPrimaryNames === 'true'
    const page = parseInt(q.page, 10) > 0 ? q.page : 1
    const pageLength = parseInt(q.pageLength, 10) > 0 ? q.pageLength : 10
    const filterIndex = parseInt(q.filterIndex, 10) >= 0 ? q.filterIndex : 0
    const previouslyFiltered = parseInt(q.previouslyFiltered, 10) >= 0 ? q.previouslyFiltered : 1
    const timeoutInMilliseconds = parseInt(q.timeoutInMilliseconds, 10) >= 0
      ? q.timeoutInMilliseconds : 0

    this.mlProxy.autoComplete(
      text,
      context,
      fullyHonorContext,
      onlyMatchOnPrimaryNames,
      onlyReturnPrimaryNames,
      page,
      pageLength,
      filterIndex,
      previouslyFiltered,
      timeoutInMilliseconds,
    ).then(result => res.json(result)).catch(
      (err) => {
        handleError(err, 'failed autocomplete', res)
      },
    ).finally(() => {
      const timeStr = util.nanoSecToString(hrtime.bigint() - start)
      log.debug(`took ${timeStr} for auto-complete ${util.remoteIps(req)}`)
    })
  }

  handleDataConstants(req, res) {
    // const start = hrtime.bigint()
    log.debug(`port: ${this.port}`)

    fetch('https://chit.yalespace.org/cf-test/code.txt')
      .then((resp) => resp.text())
      .then((data) => {
        const code = parseInt(data, 10)
        log.debug(`data: ${code}`)
        res.status(code)
        res.json({
          code,
        })
      })
  }

  handleDocument(req, res) {
    const start = hrtime.bigint()
    const { type, uuid } = req.params
    const uri = `${this.searchUriHost}/data/${type}/${uuid}`
    const { profile, lang } = req.query

    this.mlProxy.getDocument(uri, profile || null, lang || null)
      .then(async doc => {
        if (doc == null) {
          res.status(404)
          res.json(null)
        } else {
          let links = null
          if (!profile) {
            // Create HAL links only when no profile has been requested
            const linksBuilder = new HalLinksBuilder(this.mlProxy)
            links = await linksBuilder.getLinks(doc)
          }
          const doc2 = transformEntityDoc(
            doc,
            this.searchUriHost,
            this.resultUriHost,
            links,
          )
          res.json(doc2)
        }
      })
      .catch(err => {
        handleError(err, `failed to get doc for ${req.url}`, res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for data/${type}/${uuid} ${profile},${lang} ${util.remoteIps(req)}`)
      })
  }

  handleFacets(req, res) {
    const start = hrtime.bigint()
    const { scope } = req.params
    const {
      name,
      q,
      page,
      pageLength,
      sort,
    } = req.query
    const qstr = translateQuery(q || '')

    this.mlProxy.facets(name, qstr, scope, page, pageLength, sort)
      .then(result => {
        res.json(util.replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        handleError(err, `failed to get facets for ${q}`, res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for facet ${name}|${q}|${scope} ${util.remoteIps(req)}`)
      })
  }

  handleRelatedList(req, res) {
    const start = hrtime.bigint()
    const scope = req.params.scope || ''
    const name = req.query.name || ''
    const uri = translateQuery(req.query.uri || '')
    const page = util.getNumArg(req.query.page, 1)
    const pageLength = util.getNumArg(req.query.pageLength, null)
    const relationshipsPerRelation = util.getNumArg(
      req.query.relationshipsPerRelation,
      null,
    )

    this.mlProxy2.relatedList(scope, name, uri, page, pageLength, relationshipsPerRelation)
      .then(result => {
        res.json(util.replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        handleError(err, `failed get related list ${name}, ${uri}, ${page}, ${pageLength}, ${relationshipsPerRelation}`, res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for related list ${name}, ${uri}, ${page}, ${pageLength}, ${relationshipsPerRelation} ${util.remoteIps(req)}`)
      })
  }

  handleSearch(req, res) {
    const start = hrtime.bigint()
    const scope = req.params.scope || ''
    const qstr = decodeURIComponent(translateQuery(req.query.q))
    const page = req.query.page || 1
    const pageLength = req.query.pageLength || 20
    const sort = req.query.sort || ''
    const facetsSoon = req.query.facetsOnly === ''
      || req.query.facetsSoon === 'true'
    const synonymsEnabled = req.query.synonymsEnabled === ''
      || req.query.synonymsEnabled === 'true'
    const mayChangeScope = false
    this.mlProxy2.search(
      qstr,
      scope,
      mayChangeScope,
      page,
      pageLength,
      sort,
      facetsSoon,
      synonymsEnabled,
    )
      .then(result => {
        res.json(util.replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        handleError(err, `failed search for ${qstr}`, res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for search ${qstr} ${page},${pageLength},${sort},${synonymsEnabled} ${util.remoteIps(req)}`)
      })
  }

  handleSearchEstimate(req, res) {
    const start = hrtime.bigint()
    const scope = req.params.scope || ''
    const qstr = translateQuery(req.query.q || '')

    this.mlProxy.searchEstimate(qstr, scope)
      .then(result => {
        res.json(util.replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        handleError(err, `failed search estimate for ${qstr}`, res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for search estimate ${qstr} ${util.remoteIps(req)}`)
      })
  }

  handleSearchInfo(req, res) {
    const start = hrtime.bigint()

    this.mlProxy.searchInfo()
      .then(result => res.json(result))
      .catch(err => {
        handleError(err, 'failed to retrieve search info', res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for search-info ${util.remoteIps(req)}`)
      })
  }

  handleSearchWillMatch(req, res) {
    const start = hrtime.bigint()
    const qstr = translateQuery(req.query.q || '')

    this.mlProxy.searchWillMatch(qstr)
      .then(result => {
        res.json(util.replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        handleError(err, `failed match for ${qstr}`, res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for match ${qstr} ${util.remoteIps(req)}`)
      })
  }

  handleStats(req, res) {
    const start = hrtime.bigint()

    this.mlProxy.stats()
      .then(result => {
        res.json(result)
      })
      .catch(err => {
        handleError(err, 'failed stats', res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for stats ${util.remoteIps(req)}`)
      })
  }

  handleTranslate(req, res) {
    const start = hrtime.bigint()
    const qstr = decodeURIComponent(req.query.q)
    const scope = req.params.scope || ''

    this.mlProxy.translate(
      qstr,
      scope,
    )
      .then(result => {
        res.json(util.replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        handleError(err, `failed to translate query '${qstr}' and scope '${scope}'`, res)
      })
      .finally(() => {
        const timeStr = util.nanoSecToString(hrtime.bigint() - start)
        log.debug(`took ${timeStr} for translate ${qstr} ${scope} ${util.remoteIps(req)}`)
      })
  }

  static _handleInfo = (req, res) => {
    const memUsage = process.memoryUsage()
    res.json({
      version,
      backendFastLane: `${env.mlHost}:${env.mlPort}`,
      backendSlowLane: `${env.mlHost2}:${env.mlPort2}`,
      numInstances: env.numInstances,
      mem: memUsage,
      rsrc: process.resourceUsage(),
      node: process.version,
      arch: process.arch,
      platform: process.platform,
      pid: process.pid,
    })
  }
}

const newApp = () => {
  // Create proxy for MarkLogic database (fast lane)
  const mlClient = marklogic.createDatabaseClient({
    host: env.mlHost,
    port: env.mlPort,
    user: env.mlUser,
    password: env.mlPass,
    authType: env.mlAuthType,
    ssl: env.mlSsl,
  })
  // Create proxy for MarkLogic database (slow lane)
  const mlClient2 = marklogic.createDatabaseClient({
    host: env.mlHost2,
    port: env.mlPort2,
    user: env.mlUser2,
    password: env.mlPass2,
    authType: env.mlAuthType,
    ssl: env.mlSsl,
  })

  const mlProxy = new MLProxy(mlClient)
  const mlProxy2 = new MLProxy(mlClient2)

  const app = new App({
    port: env.appPort,
    mlProxy,
    mlProxy2,
  })
  return app
}

exports.newApp = newApp
