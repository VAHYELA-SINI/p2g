/**
 * Converts a text string into a URL-friendly slug
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word chars with -
    .replace(/^-+|-+$/g, '');   // Trim leading/trailing hyphens
}

module.exports = {
  slugify,
};
