/**
 * Unified filtering utilities for providers and endpoints
 */

/**
 * Determine if an item should be included based on filter criteria
 * Supports inclusion (default) and exclusion (with ^ prefix)
 * @param {string} itemId - The ID of the item to check
 * @param {Array<string>} itemFilter - Array of filter strings
 * @returns {boolean} - Whether the item should be included
 */
export function shouldIncludeItem(itemId, itemFilter) {
  if (!itemFilter || itemFilter.length === 0) {
    return true; // No filter means include all
  }

  // Separate inclusion and exclusion filters
  const inclusionFilters = [];
  const exclusionFilters = [];

  for (const filter of itemFilter) {
    if (filter.startsWith("^")) {
      exclusionFilters.push(filter.substring(1)); // Remove ^ prefix
    } else {
      inclusionFilters.push(filter);
    }
  }

  // If item matches any exclusion filter, exclude it
  if (exclusionFilters.length > 0 && exclusionFilters.includes(itemId)) {
    return false;
  }

  // If there are inclusion filters, item must match at least one
  if (inclusionFilters.length > 0) {
    return inclusionFilters.includes(itemId);
  }

  // If only exclusion filters exist and item wasn't excluded, include it
  return true;
}

/**
 * Determine if a provider should be included based on filter criteria
 * @param {string} providerId - The provider ID to check
 * @param {Array<string>} providerFilter - Array of provider filter strings
 * @returns {boolean} - Whether the provider should be included
 */
export function shouldIncludeProvider(providerId, providerFilter) {
  return shouldIncludeItem(providerId, providerFilter);
}

/**
 * Determine if an endpoint should be included based on filter criteria
 * @param {string} endpointKey - The endpoint key to check
 * @param {Array<string>} endpointFilter - Array of endpoint filter strings
 * @returns {boolean} - Whether the endpoint should be included
 */
export function shouldIncludeEndpoint(endpointKey, endpointFilter) {
  return shouldIncludeItem(endpointKey, endpointFilter);
}

/**
 * Apply filtering to a list of providers
 * @param {Array} providers - Array of provider instances
 * @param {Array<string>} providerFilter - Array of provider filter strings
 * @returns {Array} - Filtered array of provider instances
 */
export function filterProviders(providers, providerFilter) {
  if (!providerFilter || providerFilter.length === 0) {
    return providers;
  }

  return providers.filter((provider) =>
    shouldIncludeProvider(provider.getProviderId(), providerFilter)
  );
}

/**
 * Apply filtering to a list of endpoint keys
 * @param {Array<string>} endpointKeys - Array of endpoint keys
 * @param {Array<string>} endpointFilter - Array of endpoint filter strings
 * @returns {Array<string>} - Filtered array of endpoint keys
 */
export function filterEndpoints(endpointKeys, endpointFilter) {
  if (!endpointFilter || endpointFilter.length === 0) {
    return endpointKeys;
  }

  return endpointKeys.filter((key) =>
    shouldIncludeEndpoint(key, endpointFilter)
  );
}
