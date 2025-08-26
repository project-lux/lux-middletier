#!/bin/bash

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
HELP=""

# Function to display help
show_help() {
    cat << EOF
LUX Endpoint Testing - Endpoint-Based Execution

Usage: ./run-tests-by-endpoint.sh [CONFIG_DIR] [REPORTS_DIR] [OPTIONS]

Arguments:
  CONFIG_DIR      Directory containing test configuration files (default: ./configs)
  REPORTS_DIR     Directory to store test reports (default: ./reports)

Options:
  --providers PROVIDER1,PROVIDER2    Run tests only for specified providers
  --endpoints ENDPOINT1,ENDPOINT2    Run tests only for specified endpoints
  --memory-limit MB                  Set Node.js heap size limit (default: 8192)
  --dry-run                         Show what would be executed without running tests
  --help                            Show this help message

Examples:
  ./run-tests-by-endpoint.sh                                              # Run all tests with default settings
  ./run-tests-by-endpoint.sh ./configs ./reports                          # Run with specific directories
  ./run-tests-by-endpoint.sh --providers provider1,provider2             # Run only specific providers
  ./run-tests-by-endpoint.sh --endpoints get-search,get-facets           # Run only specific endpoints
  ./run-tests-by-endpoint.sh --dry-run                                   # Preview what would be executed
  ./run-tests-by-endpoint.sh --memory-limit 16384                        # Use 16GB memory limit 

Endpoint-based execution benefits:
  - 33% memory reduction (loads one spreadsheet at a time)
  - Peak usage: ~336K tests (largest file) vs 503K tests (all files)
  - Better error isolation per endpoint file
  - Individual provider reports with full details
  - Consolidated dashboard report combining all results
  - Support for very large test suites (500K+ tests)File Structure Created:
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
        --providers)
            PROVIDERS_FILTER="$2"
            shift 2
            ;;
        --endpoints)
            ENDPOINTS_FILTER="$2"
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
echo "Configuration directory: $CONFIG_DIR"
echo "Reports directory: $REPORTS_DIR"
echo "Memory limit: ${MEMORY_LIMIT}MB"

if [ -n "$PROVIDERS_FILTER" ]; then
    echo "Providers filter: $PROVIDERS_FILTER"
fi

if [ -n "$ENDPOINTS_FILTER" ]; then
    echo "Endpoints filter: $ENDPOINTS_FILTER"
fi

if [ -n "$DRY_RUN" ]; then
    echo "Mode: DRY RUN (no tests will be executed)"
else
    echo "Mode: FULL EXECUTION"
fi

echo "======================================"

# Build command arguments
CMD_ARGS=("$CONFIG_DIR" "$REPORTS_DIR")

if [ -n "$DRY_RUN" ]; then
    CMD_ARGS+=("$DRY_RUN")
fi

if [ -n "$PROVIDERS_FILTER" ]; then
    CMD_ARGS+=("--providers" "$PROVIDERS_FILTER")
fi

if [ -n "$ENDPOINTS_FILTER" ]; then
    CMD_ARGS+=("--endpoints" "$ENDPOINTS_FILTER")
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
