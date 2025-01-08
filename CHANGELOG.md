# Changelog

## Marklogic Dependencies

- With v1.1.18 Marklogic client code was regenerated against ML v1.25.0 dated 09/23/24
- With v1.1.12, Marklogic client code was regenerated against ML v1.20.0 dated 07/08/24
- With v1.1.4, Marklogic client code was regenerated against ML v1.11.0 dated 03/04/23
- With v1.1.0, Marklogic client code was regenerated against ML v1.6.0 dated 11/21/23
- With v0.5.0, MarkLogic client code was regenerated against ML v1.0.17 dated 5/30/23.

---

## 1.2.1

- Added HAL link for Works Caused By or Influenced By on event pages ([#90](https://github.com/project-lux/lux-middletier/pull/90)).

## 1.2.0

- Added HAL link for Part Of inverse ([#79](https://github.com/project-lux/lux-middletier/pull/79)).

## 1.1.19

- Fixed typos causing 500 errors ([#104](https://github.com/project-lux/lux-middletier/pull/104)).

## 1.1.18

- Added endpoint to get ML version info (#94)
- Removed duplicates from estimates queries for HAL links (#4)

## 1.1.17

- Fixed resolve endpoint to redirect to /view rather than /data (#93)

## 1.1.16

- Added HAL links for objects/works that are subject of other objects/works (#28)
- Added resolve endpoint to help units provide links to LUX while using their internal indentifiers instead of LUX IRIs (#93)

## 1.1.15

- Removed the data constants endpoint (#18)
- Add support for the component term HAL link to worksRelatedToConcepts (#85)

## 1.1.14

- Changed the HAL link for placeWorkAbout (#41)
- Changed HAL link for objects in collection (#40)
- Update HAL link for a set's items with images such that it only looks for items in archives (#77)
- Update Data Constants and Advanced Search Config to use mlProxy2 (#78)

## 1.1.13

- Create HAL link for sets with events (#40)

## 1.1.12

- Add parameters for 'page', 'pageLength', and 'sort' to the facets endpoint. (#65)
- Update gulpfile to handle new MarkLogic repo structure.
- Regenerate Marklogic client code, which allows for new facets parameters, and removes personRoles endpoint

## 1.1.11

- Change HAL links such that influencing Creation/Production is integrated into existing links (#27)

## 1.1.10

- Add HAL links for Agents Influencing Creation/Production of Works/Objects (#27)
- Remove workShownBy HAL link (#15)
- Removed hierarchy endpoints (#6)

## 1.1.9

- Create HAL link for objects with images in an archive (#14)
- Update HAL links for updated memberOf / containing fields (#60)

## 1.1.8

- Create HAL link for Concepts Related to Events (#51)
- Remove HAL link for Events' Related Subjects - replaced by related list (#51)
- Update HAL link for Archives' Included Items/Works to Sort By Sort ID (#47)

## 1.1.7

- Create HAL link for Related People and Groups on events (#29)
- Create HAL link for Related Locations on events (#45)

## 1.1.6

- Removed HAL link for Works Depicting or About People or Groups on concepts (#46)

## 1.1.5

- Create HAL link for Places page People and Groups Active Here (#19)
- Create HAL link for Places with Type (#21)
- Create HAL link for Events with Type (#34)
- Create HAL link for Agents Founded By Agent (#16)

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
