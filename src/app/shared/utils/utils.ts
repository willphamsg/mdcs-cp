import { v4 as uuidv4 } from 'uuid';
// SAMPLE:
// isEmpty({})              // true
// isEmpty([])              // true
// isEmpty(null)            // true
// isEmpty({ key: 1 })      // false
// isEmpty([1, 2, 3])       // false
// isEmpty("")              // false
// isEmpty(123)             // false
export const isEmpty = (obj: any): boolean => {
  return (
    obj === null || // Check for null
    (typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length === 0) || // Empty object
    (Array.isArray(obj) && obj.length === 0) // Empty array
  );
};

/**
 * Generate a unique number ID from UUID
 * Example usage: when element.id is null/undefined, this generates a unique positive integer
 * like: 1745328391, 892745123, etc.
 */
export const generateUniqueNumberId = (): number => {
  const uuid = uuidv4();
  // Convert UUID to a positive integer by taking hash of uuid string
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.codePointAt(i) ?? 0;
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};
