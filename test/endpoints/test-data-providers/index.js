/**
 * Test Data Providers Module
 * 
 * Register your TestDataProvider here.
 */

import { TestDataProvider, TestDataProviderFactory, TestCaseStructure } from './interface.js';
import { AdvancedSearchQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/advanced-search-queries/AdvancedSearchQueriesTestDataProvider.js';
import { Prd2PrdTestQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/prd2-prd-test-queries/Prd2PrdTestQueriesTestDataProvider.js';
import { UpdatedAdvancedSearchQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/updated-advanced-search-queries/UpdatedAdvancedSearchQueriesTestDataProvider.js';

// Register all available providers
TestDataProviderFactory.registerProvider(AdvancedSearchQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(Prd2PrdTestQueriesTestDataProvider);
TestDataProviderFactory.registerProvider(UpdatedAdvancedSearchQueriesTestDataProvider);

// Export the main classes and interfaces
export {
  TestDataProvider,
  TestDataProviderFactory,
  TestCaseStructure
};
