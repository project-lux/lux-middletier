@echo off
setlocal EnableDelayedExpansion

REM run-tests-by-endpoint.bat
REM Script to run endpoint tests by endpoint file with memory management (Windows)

REM Default values
set CONFIG_DIR=./configs
set REPORTS_DIR=./reports
set DRY_RUN=
set ENDPOINTS_FILTER=
set PROVIDERS_FILTER=
set MEMORY_LIMIT=8192
set SHOW_HELP=

REM Parse command line arguments
:parse_args
if "%~1"=="" goto end_parse
if "%~1"=="--help" (
    set SHOW_HELP=1
    goto end_parse
)
if "%~1"=="--providers" (
    set PROVIDERS_FILTER=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--endpoints" (
    set ENDPOINTS_FILTER=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--memory-limit" (
    set MEMORY_LIMIT=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--dry-run" (
    set DRY_RUN=--dry-run
    shift
    goto parse_args
)
if "%~1" NEQ "" (
    if "!CONFIG_DIR!"=="./configs" (
        set CONFIG_DIR=%~1
    ) else if "!REPORTS_DIR!"=="./reports" (
        set REPORTS_DIR=%~1
    )
    shift
    goto parse_args
)
shift
goto parse_args
:end_parse

REM Show help if requested
if "%SHOW_HELP%"=="1" (
    echo LUX Endpoint Testing - Endpoint-Based Execution ^(Windows^)
    echo.
    echo Usage: %~nx0 [CONFIG_DIR] [REPORTS_DIR] [OPTIONS]
    echo.
    echo Arguments:
    echo   CONFIG_DIR      Directory containing test configuration files ^(default: ./configs^)
    echo   REPORTS_DIR     Directory to store test reports ^(default: ./reports^)
    echo.
    echo Options:
    echo   --providers PROVIDER1,PROVIDER2    Run tests only for specified providers
    echo   --endpoints ENDPOINT1,ENDPOINT2    Run tests only for specified endpoints
    echo   --memory-limit MB                  Set Node.js heap size limit ^(default: 8192^)
    echo   --dry-run                         Show what would be executed without running tests
    echo   --help                            Show this help message
    echo.
    echo Examples:
    echo   %~nx0                                          # Run all tests with default settings
    echo   %~nx0 ./configs ./reports                      # Run with specific directories
    echo   %~nx0 --providers provider1,provider2         # Run only specific providers
    echo   %~nx0 --endpoints get-search,get-facets       # Run only specific endpoints
    echo   %~nx0 --dry-run                               # Preview what would be executed
    echo   %~nx0 --memory-limit 16384                    # Use 16GB memory limit
    echo.
    echo Endpoint-based execution benefits:
    echo   - 33%% memory reduction ^(loads one spreadsheet at a time^)
    echo   - Peak usage: ~336K tests ^(largest file^) vs 503K tests ^(all files^)
    echo   - Better error isolation per endpoint file
    echo   - Individual provider reports with full details
    echo   - Consolidated dashboard report combining all results
    echo   - Support for very large test suites ^(500K+ tests^)
    goto :eof
)

REM Validate required directories exist (skip for dry-run)
if "%DRY_RUN%"=="" (
    if not exist "%CONFIG_DIR%" (
        echo Error: Configuration directory '%CONFIG_DIR%' not found
        echo Use --help for usage information
        exit /b 1
    )
)

REM Display configuration
echo ======================================
echo LUX Endpoint Testing - Endpoint Mode
echo ======================================
echo Configuration directory: %CONFIG_DIR%
echo Reports directory: %REPORTS_DIR%
echo Memory limit: %MEMORY_LIMIT%MB

if not "%PROVIDERS_FILTER%"=="" (
    echo Providers filter: %PROVIDERS_FILTER%
)

if not "%ENDPOINTS_FILTER%"=="" (
    echo Endpoints filter: %ENDPOINTS_FILTER%
)

if not "%DRY_RUN%"=="" (
    echo Mode: DRY RUN ^(no tests will be executed^)
) else (
    echo Mode: FULL EXECUTION
)

echo ======================================

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    exit /b 1
)

REM Set memory limit
set NODE_OPTIONS=--max-old-space-size=%MEMORY_LIMIT%

echo.
echo Starting provider-based test execution...
echo Node.js memory limit: %MEMORY_LIMIT%MB
echo.

REM Build command
set CMD_ARGS=%CONFIG_DIR% %REPORTS_DIR%

if not "%DRY_RUN%"=="" (
    set CMD_ARGS=%CMD_ARGS% %DRY_RUN%
)

if not "%PROVIDERS_FILTER%"=="" (
    set CMD_ARGS=%CMD_ARGS% --providers "%PROVIDERS_FILTER%"
)

if not "%ENDPOINTS_FILTER%"=="" (
    set CMD_ARGS=%CMD_ARGS% --endpoints "%ENDPOINTS_FILTER%"
)

REM Execute the test runner
node run-tests.js %CMD_ARGS%

if %errorlevel% equ 0 (
    echo.
    echo ✅ Test execution completed successfully!
    
    if "%DRY_RUN%"=="" (
        echo.
        echo 📊 Reports generated in: %REPORTS_DIR%
        echo   Dashboard: dashboard-report.html
        echo   Provider reports: providers/ directory
        echo.
        echo 🌐 To view results, open dashboard-report.html in your browser
    )
) else (
    echo.
    echo ❌ Test execution failed!
    exit /b 1
)
