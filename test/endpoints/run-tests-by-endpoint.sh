#!/bin/bash

#
# WARNING: DOES NOT DO WHAT IT ADVERTISES IT DOES.
#
# IF WE NEED TO RESTRICT EACH NODE PROCESS TO ONE ENDPOINT, WE CAN SEE IF THIS IS A GOOD STARTING POINT.
#

# run-tests-by-endpoint.sh
# Script to run endpoint tests by endpoint file with memory management

set -e

# Default values
CONFIG_DIR="./configs"
REPORTS_DIR="./reports"
DRY_RUN=""
ENDPOINTS_FILTER=""
PROVIDERS_FILTER=""
MEMORY_LIMIT="8192"
BASE_URL=""
SAVE_RESPONSES=""
EMBED_RESPONSES=""
TEST_NAME=""
TEST_DESCRIPTION=""
HELP=""

# Function to display help
show_help() {
    cat << EOF
LUX Endpoint Testing - Endpoint-Based Execution

Usage: ./run-tests-by-endpoint.sh --base-url <url> [CONFIG_DIR] [REPORTS_DIR] [OPTIONS]

Arguments:
  CONFIG_DIR      Directory containing test configuration files (default: ./configs)
  REPORTS_DIR     Directory to store test reports (default: ./reports)

Options:
  --base-url <url>                   Base URL for API requests (REQUIRED)
  --providers PROVIDER1,PROVIDER2    Run tests only for specified providers
  --endpoints ENDPOINT1,ENDPOINT2    Run tests only for specified endpoints
  --save-responses                   Save response bodies to disk
  --embed-responses                  Embed response bodies in HTML report
  --name <name>                      Custom name for the test run (appears in HTML title and summary)
  --description <description>        Custom description for the test run (appears in summary)
  --memory-limit MB                  Set Node.js heap size limit (default: 8192)
  --dry-run                         Show what would be executed without running tests
  --help                            Show this help message

Examples:
  ./run-tests-by-endpoint.sh --base-url https://lux-middle-???.collections.yale.edu
  ./run-tests-by-endpoint.sh --base-url https://lux-middle-???.collections.yale.edu ./configs ./reports
  ./run-tests-by-endpoint.sh --base-url https://lux-middle-???.collections.yale.edu --providers provider1,provider2
  ./run-tests-by-endpoint.sh --base-url https://lux-middle-???.collections.yale.edu --endpoints get-search,get-facets
  ./run-tests-by-endpoint.sh --base-url https://lux-middle-???.collections.yale.edu --save-responses --embed-responses
  ./run-tests-by-endpoint.sh --base-url https://lux-middle-???.collections.yale.edu --name "Production API Test"
  ./run-tests-by-endpoint.sh --base-url https://lux-middle-???.collections.yale.edu --dry-run
  ./run-tests-by-endpoint.sh --base-url https://lux-middle-???.collections.yale.edu --memory-limit 16384

Endpoint-based execution benefits:
  - 33% memory reduction (loads one spreadsheet at a time)
  - Peak usage: ~336K tests (largest file) vs 503K tests (all files)
  - Better error isolation per endpoint file
  - Individual provider reports with full details
  - Consolidated dashboard report combining all results
  - Support for very large test suites (500K+ tests)

File Structure Created:
  reports/test-run-TIMESTAMP/
  ├── dashboard-report.html          # Main consolidated dashboard
  ├── dashboard-report.json          # Consolidated data
  └── providers/                     # Individual provider results
      ├── provider1/
      │   ├── endpoint-test-report.html
      │   ├── endpoint-test-report.json
      │   └── responses/
      └── provider2/
          ├── endpoint-test-report.html
          ├── endpoint-test-report.json
          └── responses/

EOF
}

# Parse command line arguments
POSITIONAL=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        --providers)
            PROVIDERS_FILTER="$2"
            shift 2
            ;;
        --endpoints)
            ENDPOINTS_FILTER="$2"
            shift 2
            ;;
        --save-responses)
            SAVE_RESPONSES="--save-responses"
            shift
            ;;
        --embed-responses)
            EMBED_RESPONSES="--embed-responses"
            shift
            ;;
        --name)
            TEST_NAME="$2"
            shift 2
            ;;
        --description)
            TEST_DESCRIPTION="$2"
            shift 2
            ;;
        --memory-limit)
            MEMORY_LIMIT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="--dry-run"
            shift
            ;;
        --*)
            echo "Unknown option $1"
            echo "Use --help for available options"
            exit 1
            ;;
        *)
            POSITIONAL+=("$1")
            shift
            ;;
    esac
done

# Restore positional parameters
set -- "${POSITIONAL[@]}"

# Set directories from positional arguments
if [ $# -ge 1 ]; then
    CONFIG_DIR="$1"
fi

if [ $# -ge 2 ]; then
    REPORTS_DIR="$2"
fi

# Validate required base URL
if [ -z "$BASE_URL" ]; then
    echo "Error: --base-url is required"
    echo "Use --help for usage information"
    exit 1
fi

# Validate required directories exist (skip for dry-run)
if [ -z "$DRY_RUN" ] && [ ! -d "$CONFIG_DIR" ]; then
    echo "Error: Configuration directory '$CONFIG_DIR' not found"
    echo "Use --help for usage information"
    exit 1
fi

# Display configuration
echo "======================================"
echo "LUX Endpoint Testing - Endpoint Mode"
echo "======================================"
echo "Base URL: $BASE_URL"
echo "Configuration directory: $CONFIG_DIR"
echo "Reports directory: $REPORTS_DIR"
echo "Memory limit: ${MEMORY_LIMIT}MB"

if [ -n "$PROVIDERS_FILTER" ]; then
    echo "Providers filter: $PROVIDERS_FILTER"
fi

if [ -n "$ENDPOINTS_FILTER" ]; then
    echo "Endpoints filter: $ENDPOINTS_FILTER"
fi

if [ -n "$SAVE_RESPONSES" ]; then
    echo "Save responses: enabled"
fi

if [ -n "$EMBED_RESPONSES" ]; then
    echo "Embed responses: enabled"
fi

if [ -n "$TEST_NAME" ]; then
    echo "Test name: $TEST_NAME"
fi

if [ -n "$TEST_DESCRIPTION" ]; then
    echo "Test description: $TEST_DESCRIPTION"
fi

if [ -n "$DRY_RUN" ]; then
    echo "Mode: DRY RUN (no tests will be executed)"
else
    echo "Mode: FULL EXECUTION"
fi

echo "======================================"

# Build command arguments
CMD_ARGS=("--base-url" "$BASE_URL" "$CONFIG_DIR" "$REPORTS_DIR")

if [ -n "$DRY_RUN" ]; then
    CMD_ARGS+=("$DRY_RUN")
fi

if [ -n "$SAVE_RESPONSES" ]; then
    CMD_ARGS+=("$SAVE_RESPONSES")
fi

if [ -n "$EMBED_RESPONSES" ]; then
    CMD_ARGS+=("$EMBED_RESPONSES")
fi

if [ -n "$PROVIDERS_FILTER" ]; then
    CMD_ARGS+=("--providers" "$PROVIDERS_FILTER")
fi

if [ -n "$ENDPOINTS_FILTER" ]; then
    CMD_ARGS+=("--endpoints" "$ENDPOINTS_FILTER")
fi

if [ -n "$TEST_NAME" ]; then
    CMD_ARGS+=("--name" "$TEST_NAME")
fi

if [ -n "$TEST_DESCRIPTION" ]; then
    CMD_ARGS+=("--description" "$TEST_DESCRIPTION")
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check Node.js version (require at least v14)
NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "Warning: Node.js version $NODE_VERSION detected. Version 14+ recommended for large memory operations."
fi

# Set memory limit and execute
export NODE_OPTIONS="--max-old-space-size=$MEMORY_LIMIT"

echo ""
echo "Starting provider-based test execution..."
echo "Node.js memory limit: ${MEMORY_LIMIT}MB"
echo ""

# Execute the test runner
if node run-tests.js "${CMD_ARGS[@]}"; then
    echo ""
    echo "✅ Test execution completed successfully!"
    
    # Show report locations if not dry run
    if [ -z "$DRY_RUN" ]; then
        # Find the most recent test run directory
        LATEST_DIR=$(ls -td "$REPORTS_DIR"/test-run-* 2>/dev/null | head -n1)
        
        if [ -n "$LATEST_DIR" ] && [ -d "$LATEST_DIR" ]; then
            echo ""
            echo "📊 Reports generated:"
            echo "  Dashboard: $LATEST_DIR/dashboard-report.html"
            
            # List provider-specific reports
            if [ -d "$LATEST_DIR/providers" ]; then
                PROVIDER_COUNT=$(find "$LATEST_DIR/providers" -maxdepth 1 -type d | tail -n +2 | wc -l)
                echo "  Provider reports: $PROVIDER_COUNT individual reports in $LATEST_DIR/providers/"
            fi
            
            echo ""
            echo "🌐 To view results, open dashboard-report.html in your browser"
        fi
    fi
else
    echo ""
    echo "❌ Test execution failed!"
    exit 1
fi
