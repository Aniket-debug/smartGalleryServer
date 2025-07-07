const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET environment variable not set");
}

/**
 * Generate a JWT for the given user
 * @param {Object} user - user object with _id, email, etc.
 * @param {Object} options - optional config (e.g., expiresIn)
 * @returns {String} token
 */
function createToken(user, options = {}) {
  const payload = {
    _id: user._id,
    email: user.email
  };

  // Default expiration = 1 hour
  const token = jwt.sign(payload, secret, {
    expiresIn: options.expiresIn || "1h",
  });

  return token;
}

/**
 * Validates a JWT and returns decoded payload
 * @param {String} token - JWT token string
 * @returns {Object|null} payload or null if invalid
 */
function validateToken(token) {
  try {
    const payload = jwt.verify(token, secret);
    return payload;
  } catch (err) {
    // Log error for debugging if needed
    console.error("JWT Validation Error:", err.message);
    return null;
  }
}

module.exports = {
  createToken,
  validateToken,
};
