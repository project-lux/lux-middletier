#!/bin/bash
# filepath: c:\workspaces\cipher\downloadEndpointReports.sh

# Host-specific configuration
remoteUser="ec2-user"
pemFile=~/.ssh/yale/ch-lux-ssh-dev.pem

# Define hosts and their subdirs
declare -A hosts
hosts["10.5.156.166"]="test-run-2025-08-28_22-26-37 test-run-2025-08-29_17-53-49 test-run-2025-09-02_21-29-11"
hosts["10.5.156.211"]="test-run-2025-08-28_22-26-44 test-run-2025-09-02_20-12-23"

# Define test run names for each subdir
declare -A testRunNames
testRunNames["test-run-2025-08-28_22-26-37"]="test-05-ml-1-3rd"
testRunNames["test-run-2025-08-28_22-26-44"]="test-06-ml-3-3rds"
testRunNames["test-run-2025-08-29_17-53-49"]="test-07-ml-2-3rds"
testRunNames["test-run-2025-09-02_20-12-23"]="test-08-ql-pipeline"
testRunNames["test-run-2025-09-02_21-29-11"]="test-09-ql-mini"

remoteBasePath="/test-data/lux-middletier/test/endpoints/reports"

# Iterate through all hosts and their subdirs
for host in "${!hosts[@]}"; do
  subDirs=( ${hosts[$host]} )
  for subDir in "${subDirs[@]}"; do
    runName="${testRunNames[$subDir]}"
    remoteFullPath="$remoteBasePath/$subDir/endpoints"
    localDir="./reports/${runName}/${subDir}"

    mkdir -p "$localDir"
    echo "Downloading files within $host:$remoteFullPath/ ..."
    scp -i "$pemFile" -r "$remoteUser@$host:$remoteFullPath/" "$localDir/"
  done
done

echo "Download complete."