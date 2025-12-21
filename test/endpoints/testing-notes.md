## _**Middle Tier Endpoint Testing Notes**_

- [Middle Tier Endpoint Testing Notes](#middle-tier-endpoint-testing-notes-1)
  - [Prerequisites](#prerequisites)
  - [Shared Environments](#shared-environments)
    - [Environments to RUN the tests from](#environments-to-run-the-tests-from)
    - [Environments to TEST](#environments-to-test)
  - [Starting Positions!](#starting-positions)
  - [Test the Setup](#test-the-setup)
    - [Endpoint specification](#endpoint-specification)
    - [Create Subset of Tests](#create-subset-of-tests)
    - [Run the Small Test](#run-the-small-test)
    - [Reports and Response Bodies](#reports-and-response-bodies)
    - [Recap](#recap)
  - [Run the Full Test](#run-the-full-test)
    - [Create All Test Configurations](#create-all-test-configurations)
    - [Pre Flight](#pre-flight)
      - [Start Tracking the Test](#start-tracking-the-test)
      - [Check Disk Space](#check-disk-space)
      - [Backend Settings](#backend-settings)
      - [Clear Caches](#clear-caches)
        - [MarkLogic](#marklogic)
        - [QLever](#qlever)
    - [Run All Tests](#run-all-tests)
    - [Post Flight](#post-flight)


# Middle Tier Endpoint Testing Notes

## Prerequisites

1. CPU: This is a single threaded process, so one for the application and one for background processes should be good.  The shared environment for running these tests is start with a t3.large, which has 2 vCPUs and 8GB.
2. RAM: TBD if 8 GB will be enough, especially if we run the tests from days' worth of backend logs.  The peak memory usage is anticipated to be when the application is generating reports for the get-facet endpoint.  That's the endpoint will we have the most requests for and by the time it is generating reports, it will have loaded all the test configurations and results into memory.
3. Storage: The utility writes reports and --when requested-- response bodies to disk.  The shared environment is starting with a 100 GB EBS volume.
4. Node.js.  Version 22.17.0 was used during development but other versions could be just fine.
5. Checkout the `endpoint-testing` branch of the https://github.com/project-lux/lux-middletier.git repo.  In the shared environment, I suggest doing so within `/test-data/`, thereby creating `/test-data/lux-middletier`.
6. Run `npm install` within the branch.
7. Access to the middle tier of the environment/configuration that is to be tested.  This will require being on the VPN.

## Shared Environments

### Environments to RUN the tests from

| IP Address     | EBS Volume   | Node Version | Web Access                     |
|----------------|--------------|--------------|--------------------------------|
| `10.5.156.166` | `/test-data` | v22.18.0     | http://10.5.156.166/endpoints/ |
| `10.5.156.211` | `/test-data` | v22.18.0     | http://10.5.156.211/endpoints/ |

To install git:

```bash
sudo dnf update
sudo dnf install git -y
```

### Environments to TEST

**Mini MarkLogic:**

* Middle tier: https://lux-front-sbx.collections.yale.edu --We're borrowing SBX's middle tier, which shares its URL with SBX's frontend.
* Admin Console: https://lux-ml-sbxa.collections.yale.edu:8001
* Query Console: https://lux-ml-sbxa.collections.yale.edu:8000/qconsole
* Monitoring Console: https://lux-ml-sbxa.collections.yale.edu:8002/history/

Or you can use Mini MarkLogic's IP address for the consoles: 10.5.156.95

**MarkLogic Full:**

Use whichever environment is presently configured to TST.  Find out at https://tman-api-tst.collections.yale.edu/lux-env.

**QLever:**

TODO

## Starting Positions!

Racers, get into your starting position:

`cd /test-data/lux-middletier/test/endpoints`

All endpoint testing commands are issued from this directory.

If you have a different path to your clone, update accordingly.

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

Let's look at all the available options:

```bash
$ node create-tests.js --help
Usage: node create-tests.js [options]

Options:
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
  node create-tests.js --providers AdvancedSearchQueriesTestDataProvider
  node create-tests.js --providers ^BackendLogsTestDataProvider
  node create-tests.js --endpoints get-search,get-auto-complete
  node create-tests.js --endpoints ^get-facets,^get-translate
  node create-tests.js --providers AdvancedSearchQueriesTestDataProvider --endpoints get-search
  node create-tests.js --list-options
```

The following will meet our needs just fine.  It specifies a single test data provider that includes some get-data requests.  That should suffice to work out any issues.

`node create-tests.js --providers GetDataTestDataProvider --no-derive-related-tests`

Summary: 

```bash
TODO
```

If you would like to verify the test configuration spreadsheets were created, look in `ls ./configs`.  The output directory is hard-coded --an oversight.

```bash
$ ll ./configs
total 64
-rw-r--r-- 1 ec2-user ec2-user 4096 40708 Aug 26 14:36 get-data-tests.xlsx
-rw-r--r-- 1 ec2-user ec2-user 4096 24325 Aug 26 14:36 get-search-tests.xlsx
```

Still not satisfied?!  Find your shared environment's web access URL in [Shared Environments](#shared-environments) and click on the configs directory.

### Run the Small Test

Here too, we can look at the available options:

```base
$ node run-tests.js --help
Usage: node run-tests.js --base-url <url> [configDir] [reportsDir] [options]

Arguments:
  configDir    Directory containing test configuration files (default: ./configs)
  reportsDir   Directory for test reports (default: ./reports)

Options:
  --base-url <url>               Base URL for API requests (REQUIRED)
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
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu ./configs ./reports
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --save-responses
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --embed-responses
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --save-responses --embed-responses
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --name "Production API Test" --description "Weekly API validation"
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --name="Nightly Tests" --description="Automated nightly validation"
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --dry-run
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --providers AdvancedSearchQueriesTestDataProvider,UpdatedAdvancedSearchQueriesTestDataProvider
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --endpoints get-search,get-auto-complete
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --endpoints ^get-facets,^get-translate
  node run-tests.js --base-url https://lux-middle-???.collections.yale.edu --dry-run --providers csv-provider --endpoints search
```

Presuming the present working directory is `/test-config/lux-middletier/test/endpoints`, the default configs and reports directories are good.

Time to select an environment, which must be specified using the `--base-url` argument.  Find the middle tier base URL you need in [Environments to TEST](#environments-to-test).

For our examples, we'll use Mini MarkLogic.  Since we'll want the response bodies from the real test runs, let's prove that works.  And more for illustrative purposes, let's restrict to the get-data endpoint.

`node run-tests.js --base-url https://lux-front-sbx.collections.yale.edu --save-responses --endpoints get-data`

Here's the expected output:

```bash
$ node run-tests.js --base-url https://lux-front-sbx.collections.yale.edu --save-responses --endpoints get-data
TODO
```

If all went well, you can open your shared environment's web access URL and find your report in the reports directory.

Curious about that failure?  Feel free to check the JSON or HTML report but **--spoiler alert--** https://lux.collections.yale.edu/data/concept/92150a0a-4ade-494d-9554-c548c9c21bd3 doesn't exist in the current dataset.

### Reports and Response Bodies

The dashboard reports should be found in `./reports/test-run-[timestamp]/`.  Example:

```bash
-rw-r--r-- 1 ec2-user ec2-user 4096 6541 Aug 26 14:39 dashboard-report.html
-rw-r--r-- 1 ec2-user ec2-user 4096 1456 Aug 26 14:39 dashboard-report.json
drwxr-xr-x 1 ec2-user ec2-user 4096    0 Aug 26 14:39 endpoints/
drwxr-xr-x 1 ec2-user ec2-user 4096    0 Aug 26 14:39 responses/
```

The dashboard reports contain links to the individual endpoint reports: `endpoints/[endpointKey]/endpoint-test-report.*`.  So long as the `--save-responses` option was used, the response bodies will be available in one form or another within the HTML reports.

The response bodies are within the `responses` sub-dir, with paths that identify the endpoint and provider.  For our small test:

```bash
$ ll responses/get-data-tests/GetDataTestDataProvider/
total 804
-rw-r--r-- 1 ec2-user ec2-user 4096 13963 Aug 26 14:39 confRow02_sourceRow3.json
-rw-r--r-- 1 ec2-user ec2-user 4096 15812 Aug 26 14:39 confRow03_sourceRow4.json
-rw-r--r-- 1 ec2-user ec2-user 4096 23411 Aug 26 14:39 confRow04_sourceRow5.json
-rw-r--r-- 1 ec2-user ec2-user 4096   843 Aug 26 14:39 confRow05_sourceRow6.json
-rw-r--r-- 1 ec2-user ec2-user 4096 31897 Aug 26 14:39 confRow06_sourceRow7.json
-rw-r--r-- 1 ec2-user ec2-user 4096 57915 Aug 26 14:39 confRow07_sourceRow8.json
-rw-r--r-- 1 ec2-user ec2-user 4096 45437 Aug 26 14:39 confRow08_sourceRow10.json
-rw-r--r-- 1 ec2-user ec2-user 4096 12554 Aug 26 14:39 confRow09_sourceRow11.json
-rw-r--r-- 1 ec2-user ec2-user 4096 18145 Aug 26 14:39 confRow10_sourceRow12.json
-rw-r--r-- 1 ec2-user ec2-user 4096 27244 Aug 26 14:39 confRow11_sourceRow13.json
-rw-r--r-- 1 ec2-user ec2-user 4096 12860 Aug 26 14:39 confRow12_sourceRow14.json
-rw-r--r-- 1 ec2-user ec2-user 4096 28164 Aug 26 14:39 confRow13_sourceRow18.json
-rw-r--r-- 1 ec2-user ec2-user 4096 32865 Aug 26 14:39 confRow14_sourceRow19.json
-rw-r--r-- 1 ec2-user ec2-user 4096 23285 Aug 26 14:39 confRow15_sourceRow20.json
-rw-r--r-- 1 ec2-user ec2-user 4096 28962 Aug 26 14:39 confRow16_sourceRow22.json
-rw-r--r-- 1 ec2-user ec2-user 4096 22826 Aug 26 14:39 confRow17_sourceRow23.json
-rw-r--r-- 1 ec2-user ec2-user 4096 67936 Aug 26 14:39 confRow18_sourceRow24.json
-rw-r--r-- 1 ec2-user ec2-user 4096 14377 Aug 26 14:39 confRow19_sourceRow25.json
-rw-r--r-- 1 ec2-user ec2-user 4096 13678 Aug 26 14:39 confRow20_sourceRow26.json
-rw-r--r-- 1 ec2-user ec2-user 4096 19328 Aug 26 14:39 confRow21_sourceRow27.json
-rw-r--r-- 1 ec2-user ec2-user 4096 15202 Aug 26 14:39 confRow22_sourceRow28.json
-rw-r--r-- 1 ec2-user ec2-user 4096 11709 Aug 26 14:39 confRow23_sourceRow29.json
-rw-r--r-- 1 ec2-user ec2-user 4096 22387 Aug 26 14:39 confRow24_sourceRow30.json
-rw-r--r-- 1 ec2-user ec2-user 4096 25670 Aug 26 14:39 confRow25_sourceRow31.json
-rw-r--r-- 1 ec2-user ec2-user 4096 18173 Aug 26 14:39 confRow26_sourceRow32.json
-rw-r--r-- 1 ec2-user ec2-user 4096 15823 Aug 26 14:39 confRow27_sourceRow34.json
-rw-r--r-- 1 ec2-user ec2-user 4096 38519 Aug 26 14:39 confRow28_sourceRow35.json
-rw-r--r-- 1 ec2-user ec2-user 4096 19390 Aug 26 14:39 confRow29_sourceRow36.json
-rw-r--r-- 1 ec2-user ec2-user 4096 41478 Aug 26 14:39 confRow30_sourceRow37.json
-rw-r--r-- 1 ec2-user ec2-user 4096 19758 Aug 26 14:39 confRow31_sourceRow38.json
-rw-r--r-- 1 ec2-user ec2-user 4096 17765 Aug 26 14:39 confRow32_sourceRow39.json
```

### Recap

At this point, we proved out everything we need to have confidence to run a larger test.  True, we didn't test all the endpoints that will be part of a full test, but the mechanics of making and processing the requests has.

## Run the Full Test

### Create All Test Configurations

Alright, we can use the same endpoint specification, but we do need to create all of the test configurations.

We want:

1. To derive get-facets, get-search-estimate, and get-search-will-match requests from get-search requests.
2. De-duplicate the request.
3. Not restrict by provider or endpoint.

To that end, all of the defaults are perfect and we can go parameter-less (We're so wild!):

`node create-tests.js`

This one will take a little longer to complete.  Here's the output for including part of a days' worth of production logs (20 Aug 25, 00:00 - 14:30 server time):

```bash
============================================================================================
TEST GENERATION SUMMARY
============================================================================================

Endpoint                      Total Before Dedup  Unique Tests  Duplicates Removed  Duration
--------------------------------------------------------------------------------------------
delete-data                                    0             0                   0       1ms
get-advanced-search-config                     0             0                   0       3ms
get-auto-complete                              0             0                   0       1ms
get-data                                  75,183        75,183                   0      3.3s
get-facets                               270,814       270,619                 195     22.5s
get-health                                     0             0                   0       1ms
get-info                                       0             0                   0       1ms
get-related-list                          37,993        37,993                   0      2.5s
get-resolve                                    0             0                   0       1ms
get-search                                17,751        17,708                  43      1.7s
get-search-estimate                       17,708        17,693                  15     995ms
get-search-info                                0             0                   0       4ms
get-search-will-match                     17,708        17,693                  15     870ms
get-stats                                      0             0                   0       2ms
get-tenant-status                              0             0                   0       2ms
get-translate                                  0             0                   0       1ms
get-version-info                               0             0                   0       1ms
post-data                                      0             0                   0       2ms
put-data                                       0             0                   0       1ms
--------------------------------------------------------------------------------------------
TOTALS                                   437,157       436,889                 268     31.9s
```

And the updated configs dir:

```bash
$ ll ./configs
total 454484
-rw-r--r-- 1 ec2-user ec2-user 4096  54137117 Aug 26 15:16 get-data-tests.xlsx
-rw-r--r-- 1 ec2-user ec2-user 4096 323485854 Aug 26 15:16 get-facets-tests.xlsx
-rw-r--r-- 1 ec2-user ec2-user 4096  32695542 Aug 26 15:16 get-related-list-tests.xlsx
-rw-r--r-- 1 ec2-user ec2-user 4096  17124723 Aug 26 15:16 get-search-estimate-tests.xlsx
-rw-r--r-- 1 ec2-user ec2-user 4096  20781438 Aug 26 15:15 get-search-tests.xlsx
-rw-r--r-- 1 ec2-user ec2-user 4096  17153122 Aug 26 15:16 get-search-will-match-tests.xlsx
```

### Pre Flight

#### Start Tracking the Test

Crack open the [Endpoint Tests](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit?gid=981515063#gid=981515063) spreadsheet and assign a unique number to this test.  Fill out the other columns that you can at this time.  Remember the test's number as there's a couple places to use it in the next section.

#### Check Disk Space

Run `df -h` and make sure `/test-data` has sufficient space.

#### Backend Settings

If system resource levels have changed between tests, consider if any backend settings should change.

For MarkLogic:

1. When adjusting the amount of memory, the group level cache settings should be reviewed.
2. When adjusting the amount of vCPUs, the number of forests should be reviewed and, if changed:
    * The amount of forest reserve should be recalculated.
    * The data will either need to be reloaded or rebalanced.

See [this CF 124 comment](https://git.yale.edu/lux-its/ml-cluster-formation/issues/124#issuecomment-31453) for a summary of changes made when changing the instance type.

For Qlever:
  * The following settings in the Qleverfile should be changed based on memory, CPU available:
    * STXXL_MEMORY
    * MEMORY_FOR_QUERIES
    * CACHE_MAX_SIZE 
    * NUM_THREADS


#### Clear Caches

##### MarkLogic

Look up the Query Console URL in [Shared Environments](#shared-environments), and run the following script there.

```javascript
xdmp.programCacheClear();
xdmp.groupCacheClear(xdmp.group("Default"), [
  "compressed-tree-cache",
  "expanded-tree-cache",
  "list-cache",
]);
```

##### QLever

QLever Cache can be cleared via QLever UI

### Run All Tests

We don't know how long it is going to take to run these tests, or if it is even a good idea to do so!  Convenience and the dashboard reports may be the only reasons to do so.  Let's see if we can get away with it.  

We want:

1. Specify `--base-url` to _the_ environment we want to test.
2. Specify `--name` and `--description` to values that align with the environment and configuration being tested.  Include the test's number in the description.
3. Use `nohup` to prevent the process terminating upon logging off the instance / losing VPN connection.  The emerging convention is to name the file `test-[testNumber].out`.
4. Use `disown` to help prevent the process being stopped by ending or resuming a VPN session.  _Shouldn't be necessary with `nohup` but appears to be for us.
5. Save the response bodies but *not* embed them into the HTML report as that's asking too much.
6. Not restrict by provider or endpoint.
7. Do a dry run to verify we like our settings.
8. *Potentially* capture STDERR and STDOUT to a file
    * We could do so by adding `> nohup.txt 2>&1` in front of the ampersand.
    * If we do, consider using a test-specific filename.
    * The concern is this file will get very large as the URL of every request is sent to STDOUT.

Dry run (no `nohup`) example pre-configured for the MarkLogic 1/3rd test:

```bash
$ node run-tests.js \
    --base-url https://lux-front-sbx.collections.yale.edu \
    --name "ML 1/3rd" \
    --description "MarkLogic with 1/3rd the resources PRD has." \
    --save-responses \
    --dry-run
```

Even though it is a dry run, it will still take a while to process all of the test configuration spreadsheets.

Anticipated output:

```bash
TODO
```

Let's hope the estimated execution time of 10 - 15 days is waaaaaaaaaaaaay off.

Ready to run the actual test?  Here's a modified version of the last command.  It uses `nohup`, writes STDERR and STDOUT to a file, and is not in dry run mode.  It's go time!

Before copying and pasting the following command:

1. **Verify the value of the base URL**
2. Update the test's name
3. Update the description, including the test number
4. Update the test number in the output file

Double check the base URL.

```bash
$ nohup node run-tests.js \
    --base-url https://lux-front-sbx.collections.yale.edu \
    --name "ML 1/3rd" \
    --description "Take 3: MarkLogic with 1/3rd the resources PRD has." \
    --save-responses \
    > take-03.out 2>&1 &
```

**IMPORTANT**

Also disown the process:

`disown`

OK, now you can see how it's going:

`tail -f take-03.out`

After the test configuration spreadsheets are read, you should start seeing tests executing.  It's at this time that the test's reports directory is created and can be added to the [Endpoint Tests](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit?gid=981515063#gid=981515063) spreadsheet.

### Post Flight

Protect `test-[testNumber].out` from accidental deletion or overwrite (e.g., `chmod 444 test-06.out`).

Fill out the rest of this test's row in the [Endpoint Tests](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit?gid=981515063#gid=981515063) spreadsheet.

For MarkLogic:

1. Download the logs.
    * ErrorLog.txt and 8003*.txt for all applicable days.
    * collectBackendLogs.sh is useful.
    * If you're planning on diving in these logs, be aware they should be trimmed to the testing period, which trimBackendLogs.sh can help with.  After that, you can also use mineBackendLogs
2. Export the monitoring data.
3. Take screenshots of the key monitoring aspects (minutely data, a.k.a., "raw").

What artifacts should we get from QLever?

