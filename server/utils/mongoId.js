const mongoose = require('mongoose');

/**
 * Strict ObjectId check (avoids 12-char strings that are not valid hex).
 * @param {unknown} id
 * @returns {boolean}
 */
function isValidObjectId(id) {
  if (id == null || typeof id !== 'string') return false;
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return String(new mongoose.Types.ObjectId(id)) === id;
}

module.exports = { isValidObjectId };
