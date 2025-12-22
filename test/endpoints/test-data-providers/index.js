/**
 * Test Data Providers Module
 * 
 * Register your TestDataProvider here.
 */

import { TestDataProvider, TestDataProviderFactory } from './interface.js';
import { GetDataTestDataProvider } from 
  './uri-lists/GetDataTestDataProvider.js';
import { AdvancedSearchQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/advanced-search-queries/AdvancedSearchQueriesTestDataProvider.js';
import { BenchmarkQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/benchmark-queries/BenchmarkQueriesTestDataProvider.js';
import { Prd2PrdTestQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/prd2-prd-test-queries/Prd2PrdTestQueriesTestDataProvider.js';
import { UpdatedAdvancedSearchQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/updated-advanced-search-queries/UpdatedAdvancedSearchQueriesTestDataProvider.js';
import { BackendLogsTestDataProvider } from 
  './backend-logs/BackendLogsTestDataProvider.js';

// Register all available providers
TestDataProviderFactory.registerProvider(GetDataTestDataProvider);
TestDataProviderFactory.registerProvider(AdvancedSearchQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(BenchmarkQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(Prd2PrdTestQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(UpdatedAdvancedSearchQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(BackendLogsTestDataProvider);

// Export the main classes and interfaces
export {
  TestDataProvider,
  TestDataProviderFactory,
};
