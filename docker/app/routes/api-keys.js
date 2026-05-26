const express = require('express');
const router = express.Router();
const DB = require('../services/database');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const keys = await DB.getApiKeysByUser(req.user.id);
    res.json({ status: 'success', keys: keys.map(k => ({ id: k.id, label: k.label, key: k.key.substring(0, 10) + '...', lastUsed: k.last_used, createdAt: k.created_at })) });
  } catch (err) {
    logger.error('Get API keys error', err);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { label } = req.body;
    const existingKeys = await DB.getApiKeysByUser(req.user.id);
    if (existingKeys.length >= 50) {
      return res.status(400).json({ error: 'Maximum API keys reached (50)' });
    }

    const newKey = await DB.createApiKey(req.user.id, label || 'API Key');
    await DB.logAction(req.user.id, 'create_api_key', 'api_keys', newKey.id, { label }, req.ip);
    logger.info(`User ${req.user.username} created API key: ${newKey.label}`);

    res.status(201).json({ status: 'success', message: 'API key created successfully', key: { id: newKey.id, label: newKey.label, key: newKey.key, createdAt: newKey.created_at } });
  } catch (err) {
    logger.error('Create API key error', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.delete('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const key = await DB.deleteApiKey(req.user.id, req.params.id);
    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }
    await DB.logAction(req.user.id, 'delete_api_key', 'api_keys', req.params.id, null, req.ip);
    logger.info(`User ${req.user.username} deleted API key`);
    res.json({ status: 'success', message: 'API key deleted successfully' });
  } catch (err) {
    logger.error('Delete API key error', err);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
