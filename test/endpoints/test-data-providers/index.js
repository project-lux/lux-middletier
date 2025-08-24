/**
 * Test Data Providers Module
 * 
 * Register your TestDataProvider here.
 */

import { TestDataProvider, TestDataProviderFactory } from './interface.js';
import { AdvancedSearchQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/advanced-search-queries/AdvancedSearchQueriesTestDataProvider.js';
import { BenchmarkQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/benchmark-queries/BenchmarkQueriesTestDataProvider.js';
import { Prd2PrdTestQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/prd2-prd-test-queries/Prd2PrdTestQueriesTestDataProvider.js';
import { SpecificItemTestCasesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/specific-item-test-cases/SpecificItemTestCasesTestDataProvider.js';
import { UpdatedAdvancedSearchQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/updated-advanced-search-queries/UpdatedAdvancedSearchQueriesTestDataProvider.js';
import { AtLeastOneRelatedListItemTestDataProvider } from 
  './backend-logs/atLeastOneRelatedListItem/AtLeastOneRelatedListItemTestDataProvider.js';

// Register all available providers
TestDataProviderFactory.registerProvider(AdvancedSearchQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(BenchmarkQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(Prd2PrdTestQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(SpecificItemTestCasesTestDataProvider);
TestDataProviderFactory.registerProvider(UpdatedAdvancedSearchQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(AtLeastOneRelatedListItemTestDataProvider);

// Export the main classes and interfaces
export {
  TestDataProvider,
  TestDataProviderFactory,
};
