# Release Notes

## Release v1.14.1

- IGDD-2881 CVE-2026-4890 - dnsmasq
- IGDD-2883 CVE-2026-2291 - dnsmasq
- IGDD-2884 CVE-2026-4892 - dnsmasq
- IGDD-2894 CVE-2025-14819 - curl
- IGDD-2895 CVE-2026-3783 - curl
- IGDD-2896 CVE-2025-14017 - curl
- IGDD-2897 CVE-2026-1965 - curl
- IGDD-2898 CVE-2025-14524 - curl
- IGDD-2900 CVE-2026-3784 - curl

## Release v1.14.0

- IGDD-2233 Automation tests for save draft,. test, reset buttons
- IGDD-2236 Automation test for overwriting draft of edit connection
- IGDD-2237 Automation tests for test feature while editing connection
- IGDD-2759 Fix UI inconsistencies with Console Colors in dashboard.
- IGDD-2770 IZG CC - JWT tokens being logged, NEXTAUTH_DEBUG not being respected
- IGDD-2773 Configuration Console and Transformation UI Access Log review
- IGDD-2774 CC and XForm UI OAuth2 workflow in nextjs applications

## Release v1.13.3

- Update dependencies and base Docker image
 
## Release v1.13.2

- Update dependencies and base Docker image

## Release v1.13.1

- Update dependencies and base Docker image

## Release v1.13.0

- IGDD-2541 Evaluate displayed metrics and color code/highlight out of range values in status console page
- IGDD-2548 Add manual refresh functionality to re send elastic query
- IGDD-2549 Add Environment filtering along with destination filtering on console page
- IGDD-2550 Configure dev Config Console so that you can configure endpoints for both the dev and test hub endpoints
- IGDD-2582 System Resources widget changes
- IGDD-2586 Update logging for Access Groups in CC
- IGDD-2660 bind version bump in base image
- IGDD-2661 libpng version bump in base image
- IGDD-2678 Update scheduled nightly dependency update workflow

## Release v1.12.1

- Dependency version updates

## Release v1.12.0

- IGDD-2136 - Display System Resources Widget on the Home page
- IGDD-2137 - Create the Inbound Messages Widget and display it in the status page
- IGDD-2138 - Create the Outbound Messages Widget and display it in the status page
- IGDD-2139 - Create the detailed status page and the Destination Widget describing the destination IIS
- IGDD-2546 - Bump version of js-yaml dependency
- IGDD-2557 - Bump version of minimatch
- IGDD-2575 - Enhance deny list loggings


## Release v1.10.1

* Release 1.10.1 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/351

Maintenance release to build from latest IZG base image

**Full Changelog**: https://github.com/IZGateway/izg-configuration-console/compare/v1.10.0...v1.10.1

---


## Release v1.10.0

* [IGDD-2231](https://izgateway.atlassian.net/browse/IGDD-2231) - Update to use FormHelperTextProps to set id's for helper text insteadGǪ by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/297
* [IGDD-2231](https://izgateway.atlassian.net/browse/IGDD-2231) - 12->h->iii e2e tests by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/299
* [IGDD-2204](https://izgateway.atlassian.net/browse/IGDD-2204): Add automation tests for change request page by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/300
* Add E2E test for password visibility toggle by @ebrockainq in https://github.com/IZGateway/izg-configuration-console/pull/305
* Bump version of Playwright for medium vulnerability scan results. by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/302
* Add cancel and reschedule cr feature test by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/304
* Igdd 2119 by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/307
* Add e2e test for deploy change request workflow by @akanuri9 in https://github.com/IZGateway/izg-configuration-console/pull/310
* Igdd 2116 by @akanuri9 in https://github.com/IZGateway/izg-configuration-console/pull/311
* removed editing of url as it was conflicting with the hub build by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/312
* Change destination ID from 'devwup' to 'ct' for deploy e2e test by @akanuri9 in https://github.com/IZGateway/izg-configuration-console/pull/314
* Remove destination URI verification from test by @akanuri9 in https://github.com/IZGateway/izg-configuration-console/pull/315
* build(deps): bump validator from 13.11.0 to 13.15.20 by @dependabot[bot] in https://github.com/IZGateway/izg-configuration-console/pull/306
* [IGDD-2308](https://izgateway.atlassian.net/browse/IGDD-2308) - Prevent 500 status when there aren't errors by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/316
* build(deps): bump next-auth from 4.24.11 to 4.24.12 by @dependabot[bot] in https://github.com/IZGateway/izg-configuration-console/pull/309
* feat: Display AccessGroup list from the api by @akanuri9 in https://github.com/IZGateway/izg-configuration-console/pull/317
* Igdd 2134 denylist by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/318
* [IGDD-2296](https://izgateway.atlassian.net/browse/IGDD-2296): Add resizable columns with persistence and tooltips to Connection Table by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/319
* Menu dropdown ui fix by @mattystank in https://github.com/IZGateway/izg-configuration-console/pull/321
* fix: use uncrypted password for qbp test on deploy page health check GǪ by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/320
* [IGDD-2365](https://izgateway.atlassian.net/browse/IGDD-2365) - Update to bump node-forge version for dependency finding by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/325
* fix: Added delete and add ads file type logic by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/324
* Access Control feature by @akanuri9 in https://github.com/IZGateway/izg-configuration-console/pull/322
* Igdd 2133 by @akanuri9 in https://github.com/IZGateway/izg-configuration-console/pull/328
* Update next via npm install next@15.5.7 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/329
* Add environment icons to AccessGroups component & change color to secondary for chip by @mattystank in https://github.com/IZGateway/izg-configuration-console/pull/330
* Bump next to 15.5.9 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/333
* [IGDD-2274](https://izgateway.atlassian.net/browse/IGDD-2274): Remove prisma and cypress related unused files by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/331
* [IGDD-2130](https://izgateway.atlassian.net/browse/IGDD-2130) - Sender Onboarding Enhancements by @pcahillai in https://github.com/IZGateway/izg-configuration-console/pull/336
* [IGDD-2343](https://izgateway.atlassian.net/browse/IGDD-2343) - add js-yaml override for mitigation by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/339
* Fix duplicate sender validation logic by @ebrockainq in https://github.com/IZGateway/izg-configuration-console/pull/338
* [IGDD-2370](https://izgateway.atlassian.net/browse/IGDD-2370) enable audit data reporting by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/337
* Pass session object instead of username string to hasAccessToDestId by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/340
* [IGDD-2432](https://izgateway.atlassian.net/browse/IGDD-2432) - Bump preact version by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/342
* Remove v2 (old) AWS-SDK dependency that is not used. by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/343
* [IGDD-2415](https://izgateway.atlassian.net/browse/IGDD-2415): Add missing new and old values in logs by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/344

## New Contributors
* @ebrockainq made their first contribution in https://github.com/IZGateway/izg-configuration-console/pull/305
* @pcahillai made their first contribution in https://github.com/IZGateway/izg-configuration-console/pull/336

**Full Changelog**: https://github.com/IZGateway/izg-configuration-console/compare/v1.8.1...v1.10.0

---


## Release v1.9.2

* Release/1.9.2 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/334

**Full Changelog**: https://github.com/IZGateway/izg-configuration-console/compare/v1.9.1...v1.9.2

---


## Release v1.9.1

* [IGDD-2231](https://izgateway.atlassian.net/browse/IGDD-2231) - Update to use FormHelperTextProps to set id's for helper text insteadGǪ by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/297
* [IGDD-2231](https://izgateway.atlassian.net/browse/IGDD-2231) - 12->h->iii e2e tests by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/299
* [IGDD-2204](https://izgateway.atlassian.net/browse/IGDD-2204): Add automation tests for change request page by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/300
* Add E2E test for password visibility toggle by @ebrockainq in https://github.com/IZGateway/izg-configuration-console/pull/305
* Bump version of Playwright for medium vulnerability scan results. by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/302
* Add cancel and reschedule cr feature test by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/304
* Igdd 2119 by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/307
* Add e2e test for deploy change request workflow by @akanuri9 in https://github.com/IZGateway/izg-configuration-console/pull/310
* Igdd 2116 by @akanuri9 in https://github.com/IZGateway/izg-configuration-console/pull/311
* removed editing of url as it was conflicting with the hub build by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/312
* Release 1.9.1 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/327

## New Contributors
* @ebrockainq made their first contribution in https://github.com/IZGateway/izg-configuration-console/pull/305

**Full Changelog**: https://github.com/IZGateway/izg-configuration-console/compare/v1.9.0...v1.9.1

---


## Release v1.9.0

* Release 1.9.0 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/326


**Full Changelog**: https://github.com/IZGateway/izg-configuration-console/compare/v1.8.1...v1.9.0

---


## Release v1.8.1

* [IGDD-2212](https://izgateway.atlassian.net/browse/IGDD-2212) - Nightly E2E test fix for width test in navbar by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/280
* IGDD_2205: Add poc on jira approval through api for end to end testing by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/285
* Add automation test for edit connection workflow by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/286
* [IGDD-2243](https://izgateway.atlassian.net/browse/IGDD-2243): Update GitHub Actions to Node 24 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/287
* [IGDD-2004](https://izgateway.atlassian.net/browse/IGDD-2004): Add structured logging instead of error messages by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/288
* [IGDD-2254](https://izgateway.atlassian.net/browse/IGDD-2254) Config Console not Masking Password in change history by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/290
* Release/1.7.3 by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/294
* fix: change log message by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/295
* [IGDD-1231](https://izgateway.atlassian.net/browse/IGDD-1231): Add shutdown logs by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/289


**Full Changelog**: https://github.com/IZGateway/izg-configuration-console/compare/v1.7.1...v1.8.1

---


## Release v1.7.1

* fix: Add logging for changed values back by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/278
* Hotfix 1.7.1 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/283
* Release 1.7.1 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/284


**Full Changelog**: https://github.com/IZGateway/izg-configuration-console/compare/v1.7.0...v1.7.1

---


## Release v1.7.0

* [IGDD-2054](https://izgateway.atlassian.net/browse/IGDD-2054) encrypt and decrypt passwords by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/255
* [IGDD-1826](https://izgateway.atlassian.net/browse/IGDD-1826): Update request support link by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/258
* [IGDD-1843](https://izgateway.atlassian.net/browse/IGDD-1843): Update width of columns on my connections table by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/256
* [IGDD-2182](https://izgateway.atlassian.net/browse/IGDD-2182) UI testing nightly failures by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/260
* [IGDD-2055](https://izgateway.atlassian.net/browse/IGDD-2055) UI Update by @mattystank in https://github.com/IZGateway/izg-configuration-console/pull/262
* fix: fix for failed tests by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/263
* [IGDD-1198](https://izgateway.atlassian.net/browse/IGDD-1198) Mobile-Clean-Up by @mattystank in https://github.com/IZGateway/izg-configuration-console/pull/259
* [IGDD-2181](https://izgateway.atlassian.net/browse/IGDD-2181) - Update Github Action to push to APHL with new name by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/261
* [IGDD-2189](https://izgateway.atlassian.net/browse/IGDD-2189) - Override sha.js to 2.4.12 for vulnerability by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/266
* [IGDD-2055](https://izgateway.atlassian.net/browse/IGDD-2055) Updated DbCrypto to support encrypt/decrypt/reset of database by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/267
* Igdd 2055 password encryption by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/268
* Igdd 2055 password encryption by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/270
* Bump version to 1.7.0 for release by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/273
* [IGDD-2207](https://izgateway.atlassian.net/browse/IGDD-2207) - Update next to latest 15.5.2 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/274
* [IGDD-2055](https://izgateway.atlassian.net/browse/IGDD-2055) Fix Encryption Wrapper for fetch of Change Request by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/271
* [IGDD-2169](https://izgateway.atlassian.net/browse/IGDD-2169) - Update nginx.conf to set read timeout via environment variable by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/269
* [IGDD-1836](https://izgateway.atlassian.net/browse/IGDD-1836): Add custom fields for jira to send email notification by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/275
* Release 1.7.0 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/279


**Full Changelog**: https://github.com/IZGateway/izg-configuration-console/compare/v1.6.0...v1.7.0

---


## Release v1.6.0


* Update package.json for 1.6.0 by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/230
* [IGDD-2112](https://izgateway.atlassian.net/browse/IGDD-2112) navigation tests by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/233
* IGDD- 2082 manage connections automation by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/235
* Igdd 2117 home page automation by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/237
* [IGDD-2113](https://izgateway.atlassian.net/browse/IGDD-2113) test connection tests by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/238
* [IGDD-2113](https://izgateway.atlassian.net/browse/IGDD-2113) test connection tests fixes by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/240
* [IGDD-2113](https://izgateway.atlassian.net/browse/IGDD-2113) test connection tests by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/239
* [IGDD-2113](https://izgateway.atlassian.net/browse/IGDD-2113) test connection tests: Fix test names by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/242
* More name fixes for connection tests by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/243
* Fix for DNS.name by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/244
* [IGDD-2111](https://izgateway.atlassian.net/browse/IGDD-2111) - login logout playwright by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/236
* [IGDD-2175](https://izgateway.atlassian.net/browse/IGDD-2175) - update form-data by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/247
* [IGDD-2113](https://izgateway.atlassian.net/browse/IGDD-2113) Test Connectivity Page Tests by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/245
* [IGDD-2111](https://izgateway.atlassian.net/browse/IGDD-2111) - Update playwright-nightly.yml to include nonadmin environment variables. by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/248
* [IGDD-2172](https://izgateway.atlassian.net/browse/IGDD-2172): Update pipeline to push to develop on PR by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/246
* Update testcon.spec.ts by @palakpatel311 in https://github.com/IZGateway/izg-configuration-console/pull/251
* [IGDD-2157](https://izgateway.atlassian.net/browse/IGDD-2157) - Update GitHub Action for east/west region setup by @austinmoody in https://github.com/IZGateway/izg-configuration-console/pull/253
* [IGDD-2169](https://izgateway.atlassian.net/browse/IGDD-2169) Test Report uses wrong username and password by @keithboone in https://github.com/IZGateway/izg-configuration-console/pull/254


**Full Changelog**: https://github.com/IZGateway/izg-configuration-console/compare/1.3.0...v1.6.0

---


## Release v0.0.1


---

