// GENERATED - DO NOT EDIT!
"use strict";
/**
* Provides a set of operations on the database server
*/
class TenantStatus {
  /**
  * A convenience factory that calls the constructor to create the TenantStatus object for executing operations
  * on the database server.
  * @param {DatabaseClient} client - the client for accessing the database server as the user
  * @param {object} [serviceDeclaration] - an optional declaration for a custom implementation of the service
  * @returns {TenantStatus} the object for the database operations
  */
  static on(client, serviceDeclaration) {
    return new TenantStatus(client, serviceDeclaration);
  }
  /**
  * The constructor for creating a TenantStatus object for executing operations on the database server.
  * @param {DatabaseClient} client - the client for accessing the database server as the user
  * @param {object} [serviceDeclaration] - an optional declaration for a custom implementation of the service
  */
  constructor(client, serviceDeclaration) {
    if (client === undefined || client === null) {
      throw new Error("missing required client");
    }
    if (serviceDeclaration === undefined || serviceDeclaration === null) {
      serviceDeclaration = {
        "endpointDirectory": "/ds/lux/tenantStatus",
        "$javaClass": "edu.yale.collections.lux.marklogic.services.TenantStatus"
      };
    }
    this.$mlProxy = client.createProxy(serviceDeclaration).withFunction({
      "functionName": "get",
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
      "functionName": "set",
      "params": [{
        "name": "prod",
        "datatype": "boolean",
        "dataKind": "atomic",
        "mimeType": "text/plain",
        "multiple": false,
        "nullable": false
      }, {
        "name": "readOnly",
        "datatype": "boolean",
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
    }, ".mjs");
  }
  /**
  * Invokes the get operation on the database server.
  * @returns {Promise} object value of the jsonDocument data type
  */
  get() {
    return this.$mlProxy.execute("get", {}, arguments.length);
  }
  /**
  * Invokes the set operation on the database server.
  * @param {boolean|string} prod - provides an input value of the boolean datatype,
  * @param {boolean|string} readOnly - provides an input value of the boolean datatype
  * @returns {Promise} object value of the jsonDocument data type
  */
  set(prod, readOnly) {
    return this.$mlProxy.execute("set", {
      "prod": prod,
      "readOnly": readOnly
    }, arguments.length);
  }
}
module.exports = TenantStatus;
