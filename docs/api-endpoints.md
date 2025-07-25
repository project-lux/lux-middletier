# API Endpoints

## Table of Contents

### Single Document

- [Document](#document)
  - [Retrieve](#retrieve)
  - [Create](#create)
  - [Update](#update)
  - [Delete](#delete)

### Search and Helpers

- [API Endpoints](#api-endpoints)
  - [Table of Contents](#table-of-contents)
    - [Single Document](#single-document)
    - [Search and Helpers](#search-and-helpers)
    - [Configuration](#configuration)
    - [System](#system)
  - [Advanced Search Config](#advanced-search-config)
  - [Auto Complete](#auto-complete)
  - [Facets](#facets)
  - [Related List](#related-list)
  - [Search](#search)
  - [Search Estimate](#search-estimate)
  - [Search Info](#search-info)
  - [Search Will Match](#search-will-match)
  - [Stats](#stats)
  - [Tenant Status](#tenant-status)
  - [Translate](#translate)
  - [\_info](#_info)
  - [Document](#document)
  - [Health](#health)

### Configuration

- [Search Info](#search-info)
- [Advanced Search Config](#advanced-search-config)

### System

- [Tenant Status](#tenant-status)
- [Stats](#stats)
- [Health](#health)
- [_info](#_info)

---

## Advanced Search Config
Returns configurations that inform the frontend to build the advanced search UI, such as search fields, labels, and help text.
- URL: /api/advanced-search-config
- Method: GET
- Query parameters: None
- See the [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#advanced-search-configuration) for detailed descriptions of output format.
- Example: https://lux.collections.yale.edu/api/advanced-search-config

## Auto Complete
- URL: /api/auto-complete
- Method: GET
- Query parameters:
  - Required: text, context
- NOTE: this is a an experimental endpoint, and is not currently used by LUX in production
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#auto-complete) for detailed descriptions of input parameters and responses.
- Example: https://lux.collections.yale.edu/api/auto-complete?text=oil&context=item.material

## Facets
Provides facets.

- URL: /api/facets/:scope
- Method: GET
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#facets) for detailed description of parameters and responses.
- Example: https://lux.collections.yale.edu/api/facets?names=responsibleUnits&q=%7B%22_scope%22%3A%22item%22%2C%22text%22%3A%22warhol%22%2C%22_lang%22%3A%22en%22%7D

## Related List
Returns items related to the specified entity (document).

- URL: /api/related-list/:scope
- Method: GET
- Query parameters:
  - Required: name, uri
  - Optional: page, pageLength, filterResults, relationshipsPerRelation
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#related-list) for detailed descriptions of parameters and responses.
- Example: https://lux.collections.yale.edu/api/related-list?scope=agent&name=relatedToAgent&uri=https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fperson%2F783e7e6f-6863-4978-8aa3-9e6cd8cd8e83

## Search
The primary means to search LUX's backend.

- URL: /api/search/:scope
- Method: GET
- Query parameters:
  - Required:
    - q - query in JSON search format defined by the backend
  - Optional: mayChangeScope, page, pageLength, pageWith, sort, filterResults, facetsSoon, synonymsEnabled
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#search) for detailed descriptions of parameters and responses.
- Example: https://lux.collections.yale.edu/api/search?q=%7B%22AND%22%3A%5B%7B%22text%22%3A%22any%22%2C%22_lang%22%3A%22en%22%7D%2C%7B%22text%22%3A%22warhol%22%2C%22_lang%22%3A%22en%22%7D%5D%7D&scope=item&page=1

## Search Estimate
Returns estimated number of results for a search.

- URL: /api/search-estimate/:scope
- Method: GET
- Query parameters: q
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#search-estimate) for detailed descriptions of parameters and responses.
- Example: https://lux.collections.yale.edu/api/search-estimate?q=%7B%22_scope%22%3A%22item%22%2C%22carries%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Ftext%2F036a0146-fbd8-4c0b-9c05-6e47d3d3e824%22%7D%7D

## Search Info
Returns search scopes and terms information.

- URL: /api/search-info
- Query parameters: None
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#search-info) for details.
- Example: https://lux.collections.yale.edu/api/search-info

## Search Will Match
Tells whether a search will return at least one result. More efficient than `search-estimate` for this purpose.

- URL: /api/search-will-match
- Method: GET
- Query parameters: q (required)
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#search-will-match) for details of parameters and responses.
- Example:  https://lux.collections.yale.edu/api/search-will-match?q=%7B%22_scope%22%3A%22item%22%2C%22carries%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Ftext%2F036a0146-fbd8-4c0b-9c05-6e47d3d3e824%22%7D%7D

## Stats
Returns number of records per context, in the form of estimates.

- URL: /api/stats
- Method: GET
- Query parameters: None
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#stats) for details of responses.
- Example: https://lux.collections.yale.edu/api/stats

## Tenant Status
Get the status of the tenant, including whether it is production (vs. non-production), in read-only mode, and version information.

- URL: /api/tenant-status
- Method: GET
- Query parameters: None
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#get) for details.
- Example: https://lux.collections.yale.edu/api/tenant-status

## Translate
Translates search string to LUX JSON search grammar.

- URL: /api/translate/:scope
- Method: GET
- Query parameters: q
- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#translate) for details.
- Example: https://lux.collections.yale.edu/api/translate?scope=agent&q=andy%20warhol

## _info
Provides selected information on middle tier configuration and resource status.

- URL: /api/_info
- Example: https://lux.collections.yale.edu/api/_info

## Document

### Retrieve

Returns a JSON document for a single entity. If no `profile` is specified in the request,
the response includes [HAL links](./hal-links.md) based on the entity type.

- URL: /data/{id}
- Method: GET
- Path parameters:
  - id: the part that forms the URI of the entity data, along with the scheme, host, and "/data/"
    - Example: "object/fbe069b3-4d30-4406-a4a0-47303d4fae22" to form the URI "https://lux.collections.yale.edu/data/object/fbe069b3-4d30-4406-a4a0-47303d4fae22"

- Query parameters:

  - profile : (optional) if specified, the response contains filtered (smaller) results.
  - lang: (optional) language. default: "en"

- Response: A Linked Art document

- See [backend documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#read-document) for detailed descriptions of parameters and responses.

- Example: https://lux.collections.yale.edu/data/object/fbe069b3-4d30-4406-a4a0-47303d4fae22

### Create

- URL: /data/ (the trailing slash is required)
- Method: POST
- Data (payload): Document data in JSON
- Headers:
  - Authorization: a base64 encoded JWT access token as a bearer token
- Response: Created document in JSON with id and creator information

### Update

- URL: /data/{id}
- Method: PUT
- Path parameters:
  - id: the part that forms the URI of the entity data, along with the scheme, host, and "/data/"
    - Example: "object/fbe069b3-4d30-4406-a4a0-47303d4fae22" to form the URI "https://lux.collections.yale.edu/data/object/fbe069b3-4d30-4406-a4a0-47303d4fae22"
- Data (payload): Document data in JSON
- Headers:
  - Authorization: a base64 encoded JWT access token as a bearer token
- Response: Updated document in JSON with revision information

### Delete

- URL: /data/{id}
- Method: DELETE
- Path parameters:
  - id: the part that forms the URI of the entity data, along with the scheme, host, and "/data/"
    - Example: "object/fbe069b3-4d30-4406-a4a0-47303d4fae22" to form the URI "https://lux.collections.yale.edu/data/object/fbe069b3-4d30-4406-a4a0-47303d4fae22"
- Headers:
  - Authorization: a base64 encoded JWT access token as a bearer token
- Response: Empty response body

## Health
Health check function that can be called, e.g., by the AWS load balancer.

- URL: /health
- Method: GET
- Response:
  ```json
  {
    "status": "ok"
  }
  ```
