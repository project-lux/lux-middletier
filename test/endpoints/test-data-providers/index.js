/**
 * Test Data Providers Module
 * 
 * This module provides a flexible interface for importing test data from various sources
 * including CSV, JSON, Excel, logs, and generated sample data.
 */

import { TestDataProvider, TestDataProviderFactory, TestCaseStructure } from './interface.js';
import { CsvTestDataProvider, CsvProviderDefaults } from './csv-provider.js';
import { SampleTestDataProvider } from './sample-provider.js';
import { AdvancedSearchQueriesTestDataProvider } from 
  './google-sheets/search-and-query-tasks-and-test-cases/advanced-search-queries/provider.js';

// Register all available providers
TestDataProviderFactory.registerProvider(CsvTestDataProvider);
TestDataProviderFactory.registerProvider(SampleTestDataProvider);
TestDataProviderFactory.registerProvider(AdvancedSearchQueriesTestDataProvider);

/**
 * Convenience function to create test data for an endpoint
 * @param {string|null} dataSource - Path to data source or null for sample data
 * @param {Object} apiDef - API definition object
 * @param {string} endpointKey - Endpoint identifier
 * @param {Array<string>} columns - Column structure
 * @param {Object} options - Provider-specific options
 * @returns {Promise<Array<Array>>} - Test data rows
 */
export async function generateTestData(dataSource, apiDef, endpointKey, columns, options = {}) {
  try {
    // If no data source specified, use sample data
    const source = dataSource || 'sample';
    
    // Create appropriate provider
    const provider = TestDataProviderFactory.createProvider(source, options);
    
    // Extract test data
    const testData = await provider.extractTestData(apiDef, endpointKey, columns);
    
    // Log provider metadata
    const metadata = provider.getSourceMetadata();
    console.log(`Test data provider: ${metadata.type} (${testData.length} test cases)`);
    
    return testData;
    
  } catch (error) {
    console.error(`Error generating test data: ${error.message}`);
    
    // Fallback to sample data if requested
    if (options.fallbackToSample !== false && dataSource !== 'sample') {
      console.log('Falling back to sample data generation...');
      const sampleProvider = new SampleTestDataProvider('sample', options);
      return await sampleProvider.extractTestData(apiDef, endpointKey, columns);
    }
    
    throw error;
  }
}

/**
 * Get list of supported file extensions
 * @returns {Array<string>} - Array of supported file extensions
 */
export function getSupportedExtensions() {
  const extensions = [];
  const providers = TestDataProviderFactory.getRegisteredProviders();
  
  providers.forEach(ProviderClass => {
    // This is a simple check - in practice you might want providers to expose supported extensions
    if (ProviderClass.name.includes('Csv')) extensions.push('.csv');
    if (ProviderClass.name.includes('Json')) extensions.push('.json');
    if (ProviderClass.name.includes('Excel')) extensions.push('.xlsx', '.xls');
    if (ProviderClass.name.includes('Log')) extensions.push('.log', '.txt');
  });
  
  return [...new Set(extensions)]; // Remove duplicates
}

// Export the main classes and interfaces
export {
  TestDataProvider,
  TestDataProviderFactory,
  TestCaseStructure,
  CsvTestDataProvider,
  CsvProviderDefaults,
  SampleTestDataProvider
};
