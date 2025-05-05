// GENERATED - DO NOT EDIT!
"use strict";
/**
* Provides a set of operations on the database server
*/
class Lux {
  /**
  * A convenience factory that calls the constructor to create the Lux object for executing operations
  * on the database server.
  * @param {DatabaseClient} client - the client for accessing the database server as the user
  * @param {object} [serviceDeclaration] - an optional declaration for a custom implementation of the service
  * @returns {Lux} the object for the database operations
  */
  static on(client, serviceDeclaration) {
    return new Lux(client, serviceDeclaration);
  }
  /**
  * The constructor for creating a Lux object for executing operations on the database server.
  * @param {DatabaseClient} client - the client for accessing the database server as the user
  * @param {object} [serviceDeclaration] - an optional declaration for a custom implementation of the service
  */
  constructor(client, serviceDeclaration) {
    if (client === undefined || client === null) {
      throw new Error("missing required client");
    }
    if (serviceDeclaration === undefined || serviceDeclaration === null) {
      serviceDeclaration = {
        "endpointDirectory": "/ds/lux",
        "$javaClass": "edu.yale.collections.lux.marklogic.services.Root"
      };
    }
    this.$mlProxy = client.createProxy(serviceDeclaration).withFunction({
      "functionName": "advancedSearchConfig",
      "params": [{
        "name": "unitName",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 1,
      "paramsKind": "multiAtomic",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "autoComplete",
      "params": [{
        "name": "unitName",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "text",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "context",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "fullyHonorContext",
        "datatype": "boolean",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "onlyMatchOnPrimaryNames",
        "datatype": "boolean",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "onlyReturnPrimaryNames",
        "datatype": "boolean",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "page",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "pageLength",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "filterIndex",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "previouslyFiltered",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "timeoutInMilliseconds",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 11,
      "paramsKind": "multiAtomic",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "facets",
      "params": [{
        "name": "unitName",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "name",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "q",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "scope",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "page",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "pageLength",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "sort",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 7,
      "paramsKind": "multiAtomic",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "relatedList",
      "params": [{
        "name": "unitName",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "scope",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "name",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "uri",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "page",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "pageLength",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "filterResults",
        "datatype": "boolean",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "relationshipsPerRelation",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 8,
      "paramsKind": "multiAtomic",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "search",
      "params": [{
        "name": "unitName",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "q",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "scope",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "mayChangeScope",
        "datatype": "boolean",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "page",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "pageLength",
        "datatype": "int",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "pageWith",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "sort",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "filterResults",
        "datatype": "boolean",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "facetsSoon",
        "datatype": "boolean",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "synonymsEnabled",
        "datatype": "boolean",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 11,
      "paramsKind": "multiAtomic",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "searchEstimate",
      "params": [{
        "name": "unitName",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "q",
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      }, {
        "name": "scope",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 3,
      "paramsKind": "multiNode",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "searchInfo",
      "params": [{
        "name": "unitName",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 1,
      "paramsKind": "multiAtomic",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "searchWillMatch",
      "params": [{
        "name": "unitName",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "q",
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 2,
      "paramsKind": "multiNode",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "stats",
      "params": [{
        "name": "unitName",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 1,
      "paramsKind": "multiAtomic",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "storageInfo",
      "params": [],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "paramsKind": "empty",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "translate",
      "params": [{
        "name": "q",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "scope",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "maxArgs": 2,
      "paramsKind": "multiAtomic",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs").withFunction({
      "functionName": "versionInfo",
      "params": [],
      "return": {
        "datatype": "jsonDocument",
        "$javaClass": "com.fasterxml.jackson.databind.JsonNode",
        "dataKind": "node",
        "mimeType": "application/json",
        "multiple": false,
        "nullable": false
      },
      "paramsKind": "empty",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs");
  }
  /**
  * Invokes the advancedSearchConfig operation on the database server.
  * @param {string} [unitName] - provides an input value of the string datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  advancedSearchConfig(unitName) {
    return this.$mlProxy.execute("advancedSearchConfig", {
      "unitName": unitName
    }, arguments.length);
  }
  /**
  * Invokes the autoComplete operation on the database server.
  * @param {string} [unitName] - provides an input value of the string datatype,
  * @param {string} text - provides an input value of the string datatype,
  * @param {string} context - provides an input value of the string datatype,
  * @param {boolean|string} [fullyHonorContext] - provides an input value of the boolean datatype,
  * @param {boolean|string} [onlyMatchOnPrimaryNames] - provides an input value of the boolean datatype,
  * @param {boolean|string} [onlyReturnPrimaryNames] - provides an input value of the boolean datatype,
  * @param {number|string} [page] - provides an input value of the int datatype,
  * @param {number|string} [pageLength] - provides an input value of the int datatype,
  * @param {number|string} [filterIndex] - provides an input value of the int datatype,
  * @param {number|string} [previouslyFiltered] - provides an input value of the int datatype,
  * @param {number|string} [timeoutInMilliseconds] - provides an input value of the int datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  autoComplete(unitName, text, context, fullyHonorContext, onlyMatchOnPrimaryNames, onlyReturnPrimaryNames, page, pageLength, filterIndex, previouslyFiltered, timeoutInMilliseconds) {
    return this.$mlProxy.execute("autoComplete", {
      "unitName": unitName,
      "text": text,
      "context": context,
      "fullyHonorContext": fullyHonorContext,
      "onlyMatchOnPrimaryNames": onlyMatchOnPrimaryNames,
      "onlyReturnPrimaryNames": onlyReturnPrimaryNames,
      "page": page,
      "pageLength": pageLength,
      "filterIndex": filterIndex,
      "previouslyFiltered": previouslyFiltered,
      "timeoutInMilliseconds": timeoutInMilliseconds
    }, arguments.length);
  }
  /**
  * Invokes the facets operation on the database server.
  * @param {string} [unitName] - provides an input value of the string datatype,
  * @param {string} name - provides an input value of the string datatype,
  * @param {string} q - provides an input value of the string datatype,
  * @param {string} [scope] - provides an input value of the string datatype,
  * @param {number|string} [page] - provides an input value of the int datatype,
  * @param {number|string} [pageLength] - provides an input value of the int datatype,
  * @param {string} [sort] - provides an input value of the string datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  facets(unitName, name, q, scope, page, pageLength, sort) {
    return this.$mlProxy.execute("facets", {
      "unitName": unitName,
      "name": name,
      "q": q,
      "scope": scope,
      "page": page,
      "pageLength": pageLength,
      "sort": sort
    }, arguments.length);
  }
  /**
  * Invokes the relatedList operation on the database server.
  * @param {string} [unitName] - provides an input value of the string datatype,
  * @param {string} scope - provides an input value of the string datatype,
  * @param {string} name - provides an input value of the string datatype,
  * @param {string} uri - provides an input value of the string datatype,
  * @param {number|string} [page] - provides an input value of the int datatype,
  * @param {number|string} [pageLength] - provides an input value of the int datatype,
  * @param {boolean|string} [filterResults] - provides an input value of the boolean datatype,
  * @param {number|string} [relationshipsPerRelation] - provides an input value of the int datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  relatedList(unitName, scope, name, uri, page, pageLength, filterResults, relationshipsPerRelation) {
    return this.$mlProxy.execute("relatedList", {
      "unitName": unitName,
      "scope": scope,
      "name": name,
      "uri": uri,
      "page": page,
      "pageLength": pageLength,
      "filterResults": filterResults,
      "relationshipsPerRelation": relationshipsPerRelation
    }, arguments.length);
  }
  /**
  * Invokes the search operation on the database server.
  * @param {string} [unitName] - provides an input value of the string datatype,
  * @param {string} q - provides an input value of the string datatype,
  * @param {string} [scope] - provides an input value of the string datatype,
  * @param {boolean|string} [mayChangeScope] - provides an input value of the boolean datatype,
  * @param {number|string} [page] - provides an input value of the int datatype,
  * @param {number|string} [pageLength] - provides an input value of the int datatype,
  * @param {string} [pageWith] - provides an input value of the string datatype,
  * @param {string} [sort] - provides an input value of the string datatype,
  * @param {boolean|string} [filterResults] - provides an input value of the boolean datatype,
  * @param {boolean|string} [facetsSoon] - provides an input value of the boolean datatype,
  * @param {boolean|string} [synonymsEnabled] - provides an input value of the boolean datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  search(unitName, q, scope, mayChangeScope, page, pageLength, pageWith, sort, filterResults, facetsSoon, synonymsEnabled) {
    return this.$mlProxy.execute("search", {
      "unitName": unitName,
      "q": q,
      "scope": scope,
      "mayChangeScope": mayChangeScope,
      "page": page,
      "pageLength": pageLength,
      "pageWith": pageWith,
      "sort": sort,
      "filterResults": filterResults,
      "facetsSoon": facetsSoon,
      "synonymsEnabled": synonymsEnabled
    }, arguments.length);
  }
  /**
  * Invokes the searchEstimate operation on the database server.
  * @param {string} [unitName] - provides an input value of the string datatype,
  * @param {array|Buffer|Map|Set|stream.Readable|string} q - provides an input value of the jsonDocument datatype,
  * @param {string} [scope] - provides an input value of the string datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  searchEstimate(unitName, q, scope) {
    return this.$mlProxy.execute("searchEstimate", {
      "unitName": unitName,
      "q": q,
      "scope": scope
    }, arguments.length);
  }
  /**
  * Invokes the searchInfo operation on the database server.
  * @param {string} [unitName] - provides an input value of the string datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  searchInfo(unitName) {
    return this.$mlProxy.execute("searchInfo", {
      "unitName": unitName
    }, arguments.length);
  }
  /**
  * Invokes the searchWillMatch operation on the database server.
  * @param {string} [unitName] - provides an input value of the string datatype,
  * @param {array|Buffer|Map|Set|stream.Readable|string} q - provides an input value of the jsonDocument datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  searchWillMatch(unitName, q) {
    return this.$mlProxy.execute("searchWillMatch", {
      "unitName": unitName,
      "q": q
    }, arguments.length);
  }
  /**
  * Invokes the stats operation on the database server.
  * @param {string} [unitName] - provides an input value of the string datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  stats(unitName) {
    return this.$mlProxy.execute("stats", {
      "unitName": unitName
    }, arguments.length);
  }
  /**
  * Invokes the storageInfo operation on the database server.
  * @returns {Promise} object value of the jsonDocument data type
  */
  storageInfo() {
    return this.$mlProxy.execute("storageInfo", {}, arguments.length);
  }
  /**
  * Invokes the translate operation on the database server.
  * @param {string} q - provides an input value of the string datatype,
  * @param {string} scope - provides an input value of the string datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  translate(q, scope) {
    return this.$mlProxy.execute("translate", {
      "q": q,
      "scope": scope
    }, arguments.length);
  }
  /**
  * Invokes the versionInfo operation on the database server.
  * @returns {Promise} object value of the jsonDocument data type
  */
  versionInfo() {
    return this.$mlProxy.execute("versionInfo", {}, arguments.length);
  }
}
module.exports = Lux;
