## _**Middle Tier Endpoint Testing Notes**_

- [Middle Tier Endpoint Testing Notes](#middle-tier-endpoint-testing-notes-1)
  - [Prerequisites](#prerequisites)
  - [Shared Environment](#shared-environment)
  - [Test the Setup](#test-the-setup)
    - [Endpoint specification](#endpoint-specification)
    - [Create Subset of Tests](#create-subset-of-tests)
    - [Run the Small Test](#run-the-small-test)
    - [Files](#files)
    - [Recap](#recap)


# Middle Tier Endpoint Testing Notes

## Prerequisites

1. CPU: This is a single threaded process, so one for the application and one for background processes should be good.  The shared environment for running these tests is start with a t3.large, which has 2 vCPUs and 8GB.
2. RAM: TBD if 8 GB will be enough, especially if we run the tests from days' worth of backend logs.  The peak memory usage is anticipated to be when the application is generating reports for the get-facet endpoint.  That's the endpoint will we have the most requests for and by the time it is generating reports, it will have loaded all the test configurations and results into memory.
3. Storage: The utility writes reports and --when requested-- response bodies to disk.  The shared environment is starting with a 100 GB EBS volume.
4. Node.js.  Version 22.17.0 was used during development but other versions could be just fine.
5. Checkout the `endpoint-testing` branch of the https://github.com/project-lux/lux-middletier.git repo.  In the shared environment, I suggest doing so within `/test-data/`, thereby creating `/test-data/lux-middletier`.
6. Access to the middle tier of the environment/configuration that is to be tested.  This will require being on the VPN.

## Shared Environment

`ssh -i ~/Apps/LUX/ML/ch-lux-ssh-dev.pem ec2-user@10.5.156.166`

EBS volume mounted at `/test-data`

**The node version is old; we may want to upgrade.**

```bash
$ node -v
v18.20.8
$ npm -v
10.8.2
```

## Test the Setup

Let's start with a small test that's quick to run while we work out any kinks.

### Endpoint specification

The version of `endpoints-spec.json` in the repo should be A-OK, but if you wish to regenerate it, run:

`node create-endpoints-spec.js`

Nothing elaborate about this script's output:

```bash
$ node create-endpoints-spec.js
Analyzing [yourPath]\app\app.js
Endpoints specification: [yourPath]\test\endpoints\endpoints-spec.json
```

### Create Subset of Tests

While we could generate all tests at this point and specify a subset to run for our small test, we'd impose the full time it takes to open the larger test configuration spreadsheets.

From your clone's root, cd into the directory we will run all of the utility's commands from:

`cd test/endpoints`

Let's look at all the available options:

```bash
$ node create-tests.js --help
Usage: node create-tests.js [options]

Options:
  --test-count=<number>         Maximum number of test cases to generate per provider
  --no-dedup                    Skip deduplication of test cases for faster processing
  --no-derive-related-tests     Skip generating get-facets, get-search-estimate and
                                get-search-will-match tests unless overridden by individual providers.
  --providers, -p <providers>   Comma-separated list of test data providers to use
                                Use ^ prefix to exclude: ^BackendLogsTestDataProvider
  --endpoints, -e <endpoints>   Comma-separated list of endpoint types to generate
                                Use ^ prefix to exclude: ^get-facets,^get-translate
  --list-options                Show available providers and endpoints for filtering
  --help, -h                    Show this help message

Examples:
  node create-tests.js
  node create-tests.js --no-dedup
  node create-tests.js --no-derive-related-tests
  node create-tests.js --test-count=100
  node create-tests.js --providers AdvancedSearchQueriesTestDataProvider
  node create-tests.js --providers ^BackendLogsTestDataProvider
  node create-tests.js --endpoints get-search,get-auto-complete
  node create-tests.js --endpoints ^get-facets,^get-translate
  node create-tests.js --providers AdvancedSearchQueriesTestDataProvider --endpoints get-search
  node create-tests.js --list-options
```

The following will meet our needs just fine.  It specifies a single test data provider that includes some get-data requests.  That should suffice to work out any issues.

`node create-tests.js --providers SpecificItemTestCasesTestDataProvider --no-derive-related-tests`

Summary: 

```bash
============================================================================================
TEST GENERATION SUMMARY
============================================================================================

Endpoint                      Total Before Dedup  Unique Tests  Duplicates Removed  Duration
--------------------------------------------------------------------------------------------
delete-data                                    0             0                   0       1ms
get-advanced-search-config                     0             0                   0       0ms
get-auto-complete                              0             0                   0       1ms
get-data                                      31            31                   0      77ms
get-facets                                     0             0                   0       0ms
get-health                                     0             0                   0       1ms
get-info                                       0             0                   0       0ms
get-related-list                               0             0                   0       1ms
get-resolve                                    0             0                   0       0ms
get-search                                     1             1                   0     138ms
get-search-estimate                            0             0                   0       1ms
get-search-info                                0             0                   0       0ms
get-search-will-match                          0             0                   0       1ms
get-stats                                      0             0                   0       0ms
get-tenant-status                              0             0                   0       1ms
get-translate                                  0             0                   0       0ms
get-version-info                               0             0                   0       1ms
post-data                                      0             0                   0       1ms
put-data                                       0             0                   0       1ms
--------------------------------------------------------------------------------------------
TOTALS                                        32            32                   0     225ms
```

If you would like to verify the test configuration spreadsheets were created, look in `ls ./configs`.  The output directory is hard-coded --an oversight.

```bash
$ ll ./configs
total 64
-rw-r--r-- 1 ec2-user ec2-user 4096 40708 Aug 26 14:36 get-data-tests.xlsx
-rw-r--r-- 1 ec2-user ec2-user 4096 24325 Aug 26 14:36 get-search-tests.xlsx
```

Still not satisfied?!  `scp` and crack 'em open!

### Run the Small Test

Here too, we can look at the available options:

```base
$ node run-tests.js --help
Usage: node run-tests.js [configDir] [reportsDir] [options]

Arguments:
  configDir    Directory containing test configuration files (default: ./configs)
  reportsDir   Directory for test reports (default: ./reports)

Options:
  --save-responses, -r          Save response bodies to disk
  --embed-responses, -b         Embed response bodies in HTML report
  --name <name>                 Custom name for the test run (appears in HTML title and summary)
  --description <description>   Custom description for the test run (appears in summary)
  --dry-run, -d                 Helpful to see resolved configuration and available filtering options
  --providers, -p <providers>   Comma-separated list of test data providers to use
                                Run in dry-run mode to view available providers.
                                Examples: AdvancedSearchQueriesTestDataProvider,UpdatedAdvancedSearchQueriesTestDataProvider
  --endpoints, -e <endpoints>   Comma-separated list of endpoint types to test
                                Run in dry-run mode to view available endpoints.
                                Use ^ prefix to exclude: ^get-facets excludes get-facets
                                Examples: get-search,get-auto-complete (include only these)
                                          ^get-facets,^get-translate (exclude these)
  --help, -h                    Show this help message

Examples:
  node run-tests.js
  node run-tests.js ./configs ./reports
  node run-tests.js --save-responses
  node run-tests.js --embed-responses
  node run-tests.js --save-responses --embed-responses
  node run-tests.js --name "Production API Test" --description "Weekly API validation"
  node run-tests.js --name="Nightly Tests" --description="Automated nightly validation"
  node run-tests.js --dry-run
  node run-tests.js --providers AdvancedSearchQueriesTestDataProvider,UpdatedAdvancedSearchQueriesTestDataProvider
  node run-tests.js --endpoints get-search,get-auto-complete
  node run-tests.js --endpoints ^get-facets,^get-translate
  node run-tests.js --dry-run --providers csv-provider --endpoints search
```

Presuming the present working directory is `/test-config/lux-middletier/test/endpoints`, the default configs and reports directories are good.

OK, let's give the following a shot.  Since we'll want the response bodies from the real test runs, let's prove that works.  And more for illustrative purposes, let's restrict to the get-data endpoint.

`node run-tests.js --save-responses --endpoints get-data`

Here's the expected output:

```bash
$ node run-tests.js --save-responses --endpoints get-data
Configuration directory: ./configs
Reports directory: ./reports
Response bodies will be saved to disk
Loaded 19 endpoint specifications
Test execution directory: reports\test-run-2025-08-26_18-39-33

Resolved:
  Requested providers:
        All
  Requested endpoints:
        get-data

Filtering options:
  Available providers:
        AdvancedSearchQueriesTestDataProvider
        BackendLogsTestDataProvider
        BenchmarkQueriesTestDataProvider
        Prd2PrdTestQueriesTestDataProvider
        SpecificItemTestCasesTestDataProvider
        UpdatedAdvancedSearchQueriesTestDataProvider
  Available endpoints:
        get-data
        get-search


=== EXECUTING TESTS BY ENDPOINT FILE (1 files) ===
Memory-efficient approach: Processing one spreadsheet at a time

--- Processing endpoint 1/1: get-data (get-data-tests.xlsx) ---
    Loading get-data-tests.xlsx (endpoint: get-data)
Loading config from configs\get-data-tests.xlsx for the get-data endpoint...
  Loaded 31 tests (31 enabled) from get-data-tests.xlsx
    Found 1 providers in get-data: SpecificItemTestCasesTestDataProvider
    Processing SpecificItemTestCasesTestDataProvider: 31 tests
Running test 1 of 31: [Source row 3] as GET https://lux-middle-dev.collections.yale.edu/data/object/437d40f0-bf57-4800-b3f4-ad8c62dc8291

...omitted for brevity

Running test 31 of 31: [Source row 39] as GET https://lux-middle-dev.collections.yale.edu/data/object/c3b35b6c-1e5b-458e-a03e-f77e77ce3a27
      ✓ Accumulated 31 results for SpecificItemTestCasesTestDataProvider (total: 31)
  ✓ Completed endpoint get-data - memory cleared

=== GENERATING CONSOLIDATED REPORTS ===
Generating the JSON report...
Generating the HTML report...

=== Test Summary ===
Providers Included: SpecificItemTestCasesTestDataProvider
Endpoints Included: get-data
Total Tests: 31
Passed: 30
Failed: 1
Errors: 0
Slow: 0
Average Duration: 429ms
Total Duration: 0 minutes

Reports generated in: reports\test-run-2025-08-26_18-39-33\endpoints\get-data
- JSON: endpoint-test-report.json
- HTML: endpoint-test-report.html
- Response bodies: responses/ directory
  ✓ Generated reports for get-data endpoint (31 total tests from 1 providers)

=== CONSOLIDATED TEST SUMMARY ===
Total endpoints processed: 1
Total tests executed: 31
✅ Passed: 30
❌ Failed: 1
⚠️  Errors: 0
🐌 Slow: 0
⏱️  Average duration: 429ms
⏱️  Total duration: 0 minutes

📊 Dashboard report generated: dashboard-report.html
✓ Generated consolidated dashboard reports
✓ Processed 1 endpoints across multiple providers
```

So far, so good?  If so let's press on.  Else, someone is trying to rain on our parade :grrr:

Curious about that failure?  Feel free to check the JSON or HTML report but **--spoiler alert--** https://lux.collections.yale.edu/data/concept/92150a0a-4ade-494d-9554-c548c9c21bd3 doesn't exist in the current dataset.

### Files

The dashboard reports should be found in TODO

### Recap

At this point, we proved out everything we need to have confidence to run a larger test.  True, we didn't test all the endpoints that will be part of a full test, but the mechanics of making the rest