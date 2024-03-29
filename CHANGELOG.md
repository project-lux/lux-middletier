# Changelog

## Marklogic Dependencies

- With v1.1.4, Marklogic clinet code was regenerated against ML v1.11.0 dated 03/04/23
- With v1.1.0, Marklogic client code was regenerated against ML v1.6.0 dated 11/21/23
- With v0.5.0, MarkLogic client code was regenerated against ML v1.0.17 dated 5/30/23.

---

## Unreleased

- Create HAL link for Places page People and Groups Active Here (#19)
- Create HAL link for Places with Type (#21)
- Create HAL link for Events with Type (#34)

## 1.1.4

- Update itemEvents HAL link to sort events (#8)
- Create eventWorksAbout HAL Link (#9)
- Create HAL link for Event's related materials (#10)
- Create HAL link for Agent's related events (#11)
- Create HAL links for Event's object types (#13)
- Create HAL links for Event's subjects (#24)
- Create HAL links for Event's work types (#25)
- Fix gulpfile for public repo name, regenerate ML config

## 1.1.3

- Updated the following endpoints to take scope as a path parameter: facets, search, search-estimate, related-list, translate (#121)
- Updated facets endpoint to accept a parameter called 'name' instead of 'names' (#126)

## 1.1.2

- Upgraded MarkLogic client library to 3.3.0 (#38).

## 1.1.0

- removed facet params from search endpoint (#114)
- changed HAL links to use facets endpoint rather than facets via search endpoint (#115)
- added search estimate endpoint (#116)

## 0.6.4

- Added HAL link lux:placeEvents (#99).

## 0.6.3

- Added HAL link lux:setDepartment (#92).
- Added ML endpoint for slow lane to \_info (#97).

## 0.5.2

- Added HAL link lux:setIncludedWorks (#75).
- Added Support For Multiple Marklogic Proxies, send facet-only searches to the second app server port (#90).

## 0.5.1

- Added Jenkins deployment script under /deploy (#82).
  This doesn't do anything currently but being a backup for what's stored in
  Jenkins, because, for Jenkins to use this script directly, we need to
  figure out how to clone a private git repository into Jenkins.

## 0.5.0

- MarkLogic client code regenerated against v1.0.17 (5/30/23).
- Enabled page, pageLength, relationshipsPerRelation for /api/related-list (#79)
