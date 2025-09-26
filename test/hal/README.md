## HAL Link Tests

### Usage
`node test-hal-links.js [options]`

Tests that all HAL links in the middle tier have some matches and are being returned successfully

Options:
> -e, --env \<URL>         environment to run the test against

>-i, --ignore \<link...>  space separated list of HAL links to ignore

>-h, --help              display help for command

### Detailed Instructions
1. Determine environment that is to be tested. The environment defaults to https://lux-front-tst.collections.yale.edu, pass in a different base URL if you wish to test a different environment
2. Determine if any HAL links are to be ignored for the test. For example, `lux:agentInfluencedConcepts` can be ignored as of 2025-09-26 ([source](https://teams.microsoft.com/l/message/19:351e0281aaa144d0812b960d216958c6@thread.tacv2/1758895901602?tenantId=dd8cbebb-2139-4df8-b411-4e3e87abeb5c&groupId=4620eac6-0955-4c69-93e8-b493b21f0df6&parentMessageId=1758895901602&teamName=ML%2F%20Cultural%20Heritage%20Support&channelName=1%20-%20LUX_ML&createdTime=1758895901602)). HAL links to ignore may change over time.
3. Run the test with the usage info above.
4. Examine output - The test will output information to stdout and stderr, if any HAL links or documents are not received there will be an error indicating so.
5. If there are any documents that are not returned, this is likely the root cause of some HAL link errors. Try updating the document URI and re-running the test.
6. If any HAL links are failing, determine root cause.
7. Repeat steps 3-7 until issues are resolved.
