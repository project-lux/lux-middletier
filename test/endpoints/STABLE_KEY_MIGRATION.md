# Stable Key Migration Plan

## Overview
This document outlines the changes needed in `compare-reports.js` once unique test IDs are added to the test data format.

## Current Complex Implementation
The current system uses a sophisticated `extractStableKey()` method that:
- Parses `response_body_file` paths to extract stable portions
- Falls back to composite keys using multiple fields
- Includes parameter hashing and URL normalization
- Handles edge cases like missing files and duplicate test names

## Target Simple Implementation
Once test data includes a unique `test_id` field, the implementation becomes trivial.

## Code Changes Required

### 1. Simplify `extractStableKey()` Method
**Location:** Lines ~89-130 in `compare-reports.js`

**Current:** Complex 40-line method with path parsing and fallback logic

**New Implementation:**
```javascript
extractStableKey(test) {
  // Use the simple unique test ID
  if (test.test_id) {
    return test.test_id;
  }
  
  // Fallback for old test data format (can be removed eventually)
  // [Keep existing complex logic temporarily for backward compatibility]
}
```

### 2. Remove Unused Helper Method
**Location:** Lines ~140-150 in `compare-reports.js`

**Method to Remove:** `simpleHash(str)` - No longer needed with simple IDs

### 3. Update Comments and Documentation
**Locations:** 
- Method comments for `extractStableKey()` (line ~85)
- Class-level documentation about stable key strategy

**Updates:**
- Remove references to "complex composite keys"
- Update comments to reflect simple ID-based matching
- Remove parameter hashing documentation

### 4. No Changes Needed
These methods will work unchanged with simple IDs:
- `addStableKeys(results)` - Just calls `extractStableKey()`
- `createTestMap(results)` - Uses `stableKey` regardless of format
- `generateSlowestBaselineAnalysis()` - Uses stable key lookup
- `generateSlowestCurrentAnalysis()` - Uses stable key lookup
- Chronological chart generation - Independent of stable key format

## Benefits After Migration
- **Reduced Complexity:** ~40 lines of complex logic → ~5 lines
- **Better Performance:** No string manipulation or hashing
- **Easier Debugging:** Clear 1:1 ID mapping instead of composite keys
- **Future-Proof:** No dependency on file paths or field combinations
- **Reliability:** Eliminates edge cases from path parsing

## Testing Recommendations
1. **Backward Compatibility:** Test with old format data to ensure fallback works
2. **Duplicate ID Detection:** Verify system handles duplicate IDs gracefully
3. **Missing ID Handling:** Ensure fallback logic works for incomplete data
4. **Performance Testing:** Verify improved speed with large datasets

## Migration Strategy
1. Add unique `test_id` to test data generation
2. Update `extractStableKey()` to prioritize `test_id`
3. Test with mixed old/new data formats
4. Remove fallback logic once all test data has IDs
5. Remove `simpleHash()` method
6. Update documentation

## Current State
- ✅ Complex stable key system working correctly
- ✅ Handles all edge cases (duplicates, missing files, etc.)
- ✅ Ready for simple migration when IDs available
- 🔄 Waiting for test data format update with unique IDs