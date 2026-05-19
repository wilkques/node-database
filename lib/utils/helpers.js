/**
 * Helper functions for database operations
 */

/**
 * Check if a value is empty
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  return false;
}

/**
 * Check if a value is not empty
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if not empty
 */
export function isNotEmpty(value) {
  return !isEmpty(value);
}

/**
 * Flatten an array of arrays
 *
 * @param {Array} array - Array to flatten
 * @returns {Array} Flattened array
 */
export function flatten(array) {
  return array.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
}

/**
 * Get a value from an object using dot notation
 *
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Value or default
 */
export function getValue(obj, path, defaultValue = null) {
  const keys = path.split(".");
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined || !(key in result)) {
      return defaultValue;
    }
    result = result[key];
  }

  return result;
}

/**
 * Set a value in an object using dot notation
 *
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {any} value - Value to set
 * @returns {Object} Modified object
 */
export function setValue(obj, path, value) {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * Deep clone an object
 *
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item));
  }

  if (typeof obj === "object") {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Merge multiple objects
 *
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
export function merge(...objects) {
  const result = {};

  for (const obj of objects) {
    if (obj && typeof obj === "object") {
      Object.assign(result, obj);
    }
  }

  return result;
}

/**
 * Check if a value is a plain object
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if plain object
 */
export function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}

/**
 * Convert camelCase to snake_case
 *
 * @param {string} str - String to convert
 * @returns {string} snake_case string
 */
export function camelToSnake(str) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/**
 * Convert snake_case to camelCase
 *
 * @param {string} str - String to convert
 * @returns {string} camelCase string
 */
export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Escape SQL string
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeSqlString(str) {
  if (typeof str !== "string") {
    return str;
  }
  return str.replace(/'/g, "''");
}

/**
 * Generate a random string
 *
 * @param {number} length - Length of string
 * @param {string} chars - Characters to use
 * @returns {string} Random string
 */
export function randomString(
  length = 10,
  chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format file size in human readable format
 *
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Debounce function execution
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @param {boolean} immediate - Execute immediately
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(this, args);
      }
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(this, args);
    }
  };
}

/**
 * Throttle function execution
 *
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;

  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
