const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_min_32_chars';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

const JwtService = {
  generateToken(payload) {
    try {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
    } catch (err) {
      logger.error('Error generating JWT token', err);
      throw err;
    }
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      logger.error('Error verifying JWT token', err);
      throw err;
    }
  },

  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (err) {
      return null;
    }
  },

  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }
};

module.exports = JwtService;
