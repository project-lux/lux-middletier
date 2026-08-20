// GENERATED - DO NOT EDIT!
"use strict";
/**
* Provides a set of operations on the database server
*/
class Document {
  /**
  * A convenience factory that calls the constructor to create the Document object for executing operations
  * on the database server.
  * @param {DatabaseClient} client - the client for accessing the database server as the user
  * @param {object} [serviceDeclaration] - an optional declaration for a custom implementation of the service
  * @returns {Document} the object for the database operations
  */
  static on(client, serviceDeclaration) {
    return new Document(client, serviceDeclaration);
  }
  /**
  * The constructor for creating a Document object for executing operations on the database server.
  * @param {DatabaseClient} client - the client for accessing the database server as the user
  * @param {object} [serviceDeclaration] - an optional declaration for a custom implementation of the service
  */
  constructor(client, serviceDeclaration) {
    if (client === undefined || client === null) {
      throw new Error("missing required client");
    }
    if (serviceDeclaration === undefined || serviceDeclaration === null) {
      serviceDeclaration = {
        "endpointDirectory": "/ds/lux/document",
        "$javaClass": "edu.yale.collections.lux.marklogic.services.Document"
      };
    }
    this.$mlProxy = client.createProxy(serviceDeclaration).withFunction({
      "functionName": "read",
      "params": [{
        "name": "uri",
        "datatype": "string",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "profile",
        "datatype": "string",
        "nullable": true,
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false
      }, {
        "name": "lang",
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
      "paramsKind": "multiAtomic",
      "sessionParam": null,
      "returnKind": "single",
      "$jsOutputMode": "promise"
    }, ".mjs");
  }
  /**
  * Invokes the read operation on the database server.
  * @param {string} uri - provides an input value of the string datatype,
  * @param {string} [profile] - provides an input value of the string datatype,
  * @param {string} [lang] - provides an input value of the string datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  read(uri, profile, lang) {
    return this.$mlProxy.execute("read", {
      "uri": uri,
      "profile": profile,
      "lang": lang
    }, arguments.length);
  }
}
module.exports = Document;
