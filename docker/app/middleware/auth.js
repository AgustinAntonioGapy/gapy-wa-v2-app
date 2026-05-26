const JwtService = require('../services/jwt');
const DB = require('../services/database');
const logger = require('../utils/logger');

const authMiddleware = {
  async verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = JwtService.verifyToken(token);

      const user = await DB.getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      };

      next();
    } catch (err) {
      if (err.message === 'Token expired') {
        return res.status(401).json({ error: 'Token expired' });
      }
      logger.error('Token verification failed', err);
      res.status(401).json({ error: 'Invalid token' });
    }
  },

  async verifySession(req, res, next) {
    try {
      const token = req.cookies?.authToken;
      if (!token) {
        return res.redirect('/');
      }

      const decoded = JwtService.verifyToken(token);
      const user = await DB.getUserById(decoded.userId);
      if (!user) {
        res.clearCookie('authToken');
        return res.redirect('/');
      }

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      };

      next();
    } catch (err) {
      res.clearCookie('authToken');
      res.redirect('/');
    }
  },

  requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },

  async verifyApiKey(req, res, next) {
    try {
      const apiKey = req.query.apikey || req.body.apikey || req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(403).json({ status: 'error', message: '❌ API Key required' });
      }

      const keyData = await DB.verifyApiKey(apiKey);
      if (!keyData) {
        return res.status(403).json({ status: 'error', message: '❌ Invalid API Key' });
      }

      await DB.updateApiKeyLastUsed(keyData.id);

      req.user = {
        id: keyData.user_id,
        username: keyData.username,
        apiKeyId: keyData.id
      };

      next();
    } catch (err) {
      logger.error('API Key verification failed', err);
      res.status(500).json({ status: 'error', message: 'Authentication error' });
    }
  }
};

module.exports = authMiddleware;
