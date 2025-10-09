#!/bin/bash
# filepath: c:\workspaces\cipher\downloadEndpointReports.sh

# Host-specific configuration
remoteUser="ec2-user"
pemFile=~/.ssh/yale/ch-lux-ssh-dev.pem

# Define hosts and their subdirs
declare -A hosts
hosts["10.5.156.166"]="test-run-2025-09-30_00-54-17 test-run-2025-10-01_01-00-33"
# hosts["10.5.156.211"]="test-run-2025-08-28_22-26-44 test-run-2025-09-02_20-12-23"

# Define test run names for each subdir
declare -A testRunNames
testRunNames["test-run-2025-09-30_00-54-17"]="test-10-4f-baseline"
testRunNames["test-run-2025-10-01_01-00-33"]="test-11-2f"
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