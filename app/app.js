import { hrtime } from 'node:process'

import cors from 'cors'
import express from 'express'
import marklogic from 'marklogic'

import env from '../config/env.js'
import HalLinksBuilder from '../lib/hal-links-builder.js'
import { extractAccessToken, getServiceToken, verifyToken } from '../lib/auth/auth.js'
import * as log from '../lib/log.js'
import MLProxy from '../lib/ml-proxy.js'
import {
  getNumArg, nanoSecToString, remoteIps, replaceStringsInObject,
} from '../lib/util.js'
import { transformEntityDoc, translateQuery } from '../lib/data-transform.js'
import searchScopes from '../lib/scopes.js'
import {
  getSecondaryResolveQuery, ResolveError, validScopes as validResolveScopes,
  validUnits as validResolveUnits,
} from '../lib/resolve.js'

import json from '../package.json' with {type: "json"}

import * as http from 'http';

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

  const result = {
    statusCode,
    errorMessage,
  }

  res.status(statusCode)
  res.json(result)
  return result
}

class App {
  constructor(config) {
    this.useOAuth = config.useOAuth
    this.port = config.port // port on which the Express app listens
    this.mlProxy = config.mlProxy
    if (!this.useOAuth) {
      this.mlProxy2 = config.mlProxy2
    }
    this.searchUriHost = env.searchUriHost || 'https://lux.collections.yale.edu'
    this.resultUriHost = env.resultUriHost || null
    this.aiHost = env.aiHost || null
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
    exp.get('/api/resolve/:scope/:unit/:identifier', this.handleResolve.bind(this))
    exp.get('/api/search/:scope', this.handleSearch.bind(this))
    exp.get('/api/search-estimate/:scope', this.handleSearchEstimate.bind(this))
    exp.get('/api/search-info', this.handleSearchInfo.bind(this))
    exp.get('/api/search-will-match', this.handleSearchWillMatch.bind(this))
    exp.get('/api/stats', this.handleStats.bind(this))
    exp.get('/api/translate/:scope', this.handleTranslate.bind(this))
    exp.get('/api/version-info', this.handleVersionInfo.bind(this))
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

  async getMLProxy(req, num) {
    if (this.useOAuth) {
      let accessToken = extractAccessToken(req)
      if (accessToken) {
        console.log('user token', req.url)
        const decAccess = await verifyToken(accessToken)
        console.log('user token decoded:', decAccess)
      } else {
        console.log('service token', req.url)
        accessToken = await getServiceToken()
      }
      this.mlProxy.initOAuth(accessToken)
      return this.mlProxy
    }
    return num === 1 ? this.mlProxy : this.mlProxy2
  }

  async handleAdvancedSearchConfig(req, res) {
    const start = hrtime.bigint()
    const mlProxy = await this.getMLProxy(req, 2)
    let errorCopy = {}

    mlProxy.advancedSearchConfig(env.unitName)
      .then(result => {
        res.json(replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        errorCopy = handleError(
          err,
          'failed to retrieve advanced search config',
          res
        )
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  async handleAutoComplete(req, res) {
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
    const mlProxy = await this.getMLProxy(req, 1)
    let errorCopy = {}

    mlProxy.autoComplete(env.unitName,
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
        errorCopy = handleError(err, 'failed autocomplete', res)
      },
    ).finally(() => {
      log.logResult(req, hrtime.bigint() - start, errorCopy)
    })
  }

  async handleDocument(req, res) {
    const start = hrtime.bigint()
    const { type, uuid } = req.params
    const uri = `${this.searchUriHost}/data/${type}/${uuid}`
    const { profile, lang } = req.query
    const mlProxy = await this.getMLProxy(req, 1)
    let errorCopy = {}

    mlProxy.getDocument(env.unitName, uri, profile || null, lang || null)
      .then(async doc => {
        if (doc == null) {
          res.status(404)
          res.json(null)
        } else {
          let links = null
          if (!profile) {
            // Create HAL links only when no profile has been requested
            const linksBuilder = new HalLinksBuilder(mlProxy, env.unitName)
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
        errorCopy = handleError(err, `failed to get doc for ${req.url}`, res)
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  async handleFacets(req, res) {
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
    const mlProxy = await this.getMLProxy(req,1)
    let errorCopy = {}

    mlProxy.facets(env.unitName, name, qstr, scope, page, pageLength, sort)
      .then(result => {
        res.json(replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        errorCopy = handleError(err, `failed to get facets for ${q}`, res)
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  async handleRelatedList(req, res) {
    const start = hrtime.bigint()
    const scope = req.params.scope || ''
    const name = req.query.name || ''
    const uri = translateQuery(req.query.uri || '')
    const page = getNumArg(req.query.page, 1)
    const pageLength = getNumArg(req.query.pageLength, null)
    const relationshipsPerRelation = getNumArg(
      req.query.relationshipsPerRelation,
      null,
    )
    const mlProxy = await this.getMLProxy(req, 2)
    let errorCopy = {}

    mlProxy.relatedList(env.unitName, scope, name, uri, page, pageLength, relationshipsPerRelation)
      .then(result => {
        res.json(replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        errorCopy = handleError(err, `failed get related list ${name}, ${uri}, ${page}, ${pageLength}, ${relationshipsPerRelation}`, res)
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  async handleResolve(req, res) {
    const start = hrtime.bigint()
    const { scope, unit, identifier } = req.params
    const mlProxy = await this.getMLProxy(req, 2)
    let errorCopy = {}

    try {
      if (!validResolveScopes.includes(scope)) {
        throw new ResolveError(`Scope must be one of: ${validResolveScopes.join(', ')}`, 400)
      }
      if (!validResolveUnits.includes(unit)) {
        throw new ResolveError(`Unit must be one of: ${validResolveUnits.join(', ')}`, 400)
      }

      const searchScope = searchScopes[scope]
      if (!searchScope) {
        throw new ResolveError(`There is no search scope mapping for ${scope}`, 500)
      }
      // first try just doing a search with identifier
      let q = { identifier }
      mlProxy.search(env.unitName, q, searchScope, false, 1, 2, '', '', false, false).then(result => {
        if (result.orderedItems) {
          if (result.orderedItems.length > 1) {
          // If there is more than one result, try to find a unique result
          // by including the unit in the query
            q = getSecondaryResolveQuery(scope, unit, identifier)
            mlProxy.search(env.unitName, q, searchScope, false, 1, 2, '', '', false, false).then(secondaryResult => {
              if (secondaryResult.orderedItems) {
                if (secondaryResult.orderedItems.length > 1) {
                // After attempting to narrow results by unit, there is still no unique record
                  throw new ResolveError(`Identifier '${identifier}' and unit '${unit}' do not resolve to a unique record`, 400)
                } else if (secondaryResult.orderedItems.length === 1) {
                // we found a unique result, send a redirect to that record
                  res.redirect(
                    secondaryResult.orderedItems[0].id
                      .replace(this.searchUriHost, this.resultUriHost)
                      .replace('data', 'view'),
                  )
                } else {
                // If the length of orderedItems is 0, there are no results
                  throw new ResolveError(`No results for identifier '${identifier}' and unit '${unit}'`, 404)
                }
              } else {
              // If the response doesn't contain orderedItems property, it is invalid
                throw new ResolveError('Invalid response', 500)
              }
            }).catch(err => {
              errorCopy = handleError(
                err,
                `failed resolve for ${scope}, ${unit}, ${identifier}`,
                res,
              )
            }).finally(() => {
              log.logResult(req, hrtime.bigint() - start, errorCopy)
            })
          } else if (result.orderedItems.length === 1) {
          // we found a unique result, send a redirect to that record
            res.redirect(
              result.orderedItems[0].id
                .replace(this.searchUriHost, this.resultUriHost)
                .replace('data', 'view'),
            )
          } else {
          // If the length of orderedItems is 0, there are no results
            throw new ResolveError(`No results for identifier '${identifier}' and unit '${unit}'`, 404)
          }
        } else {
        // If the response doesn't contain orderedItems property, it is invalid
          throw new ResolveError('Invalid response', 500)
        }
      }).catch(err => {
        errorCopy = handleError(
          err,
          `failed resolve for ${scope}, ${unit}, ${identifier}`,
          res
        )
      }).finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
    } catch (err) {
      errorCopy = handleError(err, `failed resolve for ${scope}, ${unit}, ${identifier}`, res)
    } finally {
      log.logResult(req, hrtime.bigint() - start, errorCopy)
    }
  }

  async handleSearch(req, res) {
    const start = hrtime.bigint()
    const scope = req.params.scope || ''
    const qstr = decodeURIComponent(translateQuery(req.query.q))
    const page = req.query.page || 1
    const pageLength = req.query.pageLength || 20
    const pageWith = req.query.pageWith || ''
    const sort = req.query.sort || ''
    const facetsSoon = req.query.facetsOnly === ''
      || req.query.facetsSoon === 'true'
    const synonymsEnabled = req.query.synonymsEnabled === ''
      || req.query.synonymsEnabled === 'true'
    const mayChangeScope = false
    const mlProxy = await this.getMLProxy(req, 2)
    let errorCopy = {}

    mlProxy.search(
      env.unitName,
      qstr,
      scope,
      mayChangeScope,
      page,
      pageLength,
      pageWith,
      sort,
      facetsSoon,
      synonymsEnabled,
    )
      .then(result => {
        res.json(replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        errorCopy = handleError(err, `failed search for ${qstr}`, res)
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  async handleSearchEstimate(req, res) {
    const start = hrtime.bigint()
    const scope = req.params.scope || ''
    const qstr = translateQuery(req.query.q || '')
    const mlProxy = await this.getMLProxy(req, 1)
    let errorCopy = {}

    mlProxy.searchEstimate(env.unitName, qstr, scope)
      .then(result => {
        res.json(replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        errorCopy = handleError(err, `failed search estimate for ${qstr}`, res)
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  async handleSearchInfo(req, res) {
    const start = hrtime.bigint()
    const mlProxy = await this.getMLProxy(req, 1)
    let errorCopy = {}

    mlProxy.searchInfo(env.unitName)
      .then(result => res.json(result))
      .catch(err => {
        errorCopy = handleError(err, 'failed to retrieve search info', res)
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  async handleSearchWillMatch(req, res) {
    const start = hrtime.bigint()
    const qstr = translateQuery(req.query.q || '')
    const mlProxy = await this.getMLProxy(req, 1)
    let errorCopy = {}

    mlProxy.searchWillMatch(env.unitName, qstr)
      .then(result => {
        res.json(replaceStringsInObject(
          result,
          this.searchUriHost,
          this.resultUriHost,
        ))
      })
      .catch(err => {
        errorCopy = handleError(err, `failed match for ${qstr}`, res)
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  async handleStats(req, res) {
    const start = hrtime.bigint()
    const mlProxy = await this.getMLProxy(req, 1)
    let errorCopy = {}

    mlProxy.stats(env.unitName)
      .then(result => {
        res.json(result)
      })
      .catch(err => {
        errorCopy = handleError(err, 'failed stats', res)
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  async handleTranslate(req, res) {
    const start = hrtime.bigint()
    const qstr = decodeURIComponent(req.query.q)
    const scope = req.params.scope || ''
    const mlProxy = await this.getMLProxy(req, 1)
    let errorCopy = {}

    // Issue a redirect here to python AI code
    if (this.aiHost != null && qstr.startsWith("I want")) {
      try {
        http.get(this.aiHost+"/api/translate/"+scope+"?q="+qstr,
          res2 => {
            let rawdata = ''
            res2.on('data', chunk => {rawdata += chunk})
            res2.on('end', () => {
              const parsedData = JSON.parse(rawdata);
              res.json(parsedData);
            });
          }
        )
      }
      catch(err){
        errorCopy = handleError(err, `failed to use ai translate for query '${qstr}' and scope '${scope}'`, res)
      }
      finally{
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      }
    } else {
      mlProxy.translate(
        qstr,
        scope,
      )
        .then(result => {
          res.json(replaceStringsInObject(
            result,
            this.searchUriHost,
            this.resultUriHost,
          ))
        })
        .catch(err => {
          errorCopy = handleError(err, `failed to translate query '${qstr}' and scope '${scope}'`, res)
        })
        .finally(() => {
          log.logResult(req, hrtime.bigint() - start, errorCopy)
        })
    }
  }

  async handleVersionInfo(req, res) {
    const start = hrtime.bigint()
    const mlProxy = await this.getMLProxy(req, 1)
    let errorCopy = {}

    mlProxy.versionInfo()
      .then(result => {
        res.json(result)
      })
      .catch(err => {
        errorCopy = handleError(err, 'failed versionInfo', res)
      })
      .finally(() => {
        log.logResult(req, hrtime.bigint() - start, errorCopy)
      })
  }

  static _handleInfo = (req, res) => {
    const memUsage = process.memoryUsage()
    res.json({
      version: json.version,
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

function newAppWithDigestAuth() {
  console.log('newAppWithDigestAuth mlHost:', env.mlHost)
  const mlProxy = new MLProxy().initDigestAuth({
    host: env.mlHost,
    port: env.mlPort,
    user: env.mlUser,
    password: env.mlPass,
    authType: env.mlAuthType,
    ssl: env.mlSsl,
  })
  const mlProxy2 = new MLProxy().initDigestAuth({
    host: env.mlHost2,
    port: env.mlPort2,
    user: env.mlUser2,
    password: env.mlPass2,
    authType: env.mlAuthType,
    ssl: env.mlSsl,
  })
  const app = new App({
    useOAuth: false,
    port: env.appPort,
    mlProxy,
    mlProxy2,
  })
  return app
}

async function newAppWithOAuth() {
  const mlProxy = new MLProxy()
  const app = new App({
    useOAuth: true,
    port: env.appPort,
    mlProxy,
  })
  return app
}

async function newApp() {
  if (env.featureMyCollections) {
    return await newAppWithOAuth()
  }
  return newAppWithDigestAuth()
}

export default newApp
