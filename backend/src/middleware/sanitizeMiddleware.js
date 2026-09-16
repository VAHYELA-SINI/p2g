/**
 * Sanitization & Anti-Injection Middleware
 * Protects MongoDB queries from NoSQL injection ($ and . operator injection)
 * and provides regex escaping to prevent ReDoS / RegExp injection in search filters.
 */

/**
 * Escapes regex special characters to prevent ReDoS or unintended pattern matching
 * @param {string} str - Raw input search string
 * @returns {string} - Escaped regex-safe string
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Recursively removes MongoDB operator keys starting with '$' or containing '.'
 * @param {*} obj
 * @returns {*}
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const cleanObj = {};
  for (const key of Object.keys(obj)) {
    // Strip keys starting with $ or containing .
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleanObj[key] = sanitizeObject(obj[key]);
  }

  return cleanObj;
}

/**
 * Express middleware to sanitize req.body, req.query, and req.params
 */
function mongoSanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

module.exports = {
  escapeRegex,
  sanitizeObject,
  mongoSanitize,
};
