const express = require('express');
const router = express.Router();
const DB = require('../services/database');
const waManager = require('../services/whatsapp');
const logger = require('../utils/logger');

// Middleware para validar API Key
const validateApiKey = async (req, res, next) => {
  const apiKey = req.query.apikey || req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API Key required' });
  }

  try {
    const apiKeyRecord = await DB.verifyApiKey(apiKey);
    if (!apiKeyRecord) {
      return res.status(403).json({ success: false, error: 'Invalid API Key' });
    }

    req.user = { id: apiKeyRecord.user_id };
    req.apiKey = apiKeyRecord;
    next();
  } catch (error) {
    logger.error('API Key validation error', error);
    res.status(500).json({ success: false, error: 'Validation error' });
  }
};

// POST /api/messages/send - Enviar mensaje por WhatsApp
router.post('/messages/send', validateApiKey, async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) {
      return res.status(400).json({ success: false, error: 'Number and message required' });
    }

    const session = await DB.getWhatsappSession(req.user.id);
    if (!session || !session.is_connected) {
      return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
    }

    const chatId = number.includes('@') ? number : `${number}@c.us`;
    await waManager.sendMessage(req.user.id, chatId, message);

    await DB.logAction(req.user.id, 'send_message', 'messages', null, { number, apikey_id: req.apiKey.id }, req.ip);

    res.json({
      success: true,
      message: 'Message sent',
      data: { number, timestamp: new Date() }
    });
  } catch (error) {
    logger.error('Error sending message', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/messages/bulk - Enviar múltiples mensajes
router.post('/messages/bulk', validateApiKey, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages array required' });
    }

    const session = await DB.getWhatsappSession(req.user.id);
    if (!session || !session.is_connected) {
      return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
    }

    const results = [];
    for (const msg of messages) {
      try {
        const chatId = msg.number.includes('@') ? msg.number : `${msg.number}@c.us`;
        await waManager.sendMessage(req.user.id, chatId, msg.message);
        results.push({ number: msg.number, status: 'sent' });
      } catch (err) {
        logger.error(`Error sending to ${msg.number}`, err);
        results.push({ number: msg.number, status: 'failed', error: err.message });
      }
    }

    await DB.logAction(req.user.id, 'send_bulk_messages', 'messages', null, { count: messages.length, apikey_id: req.apiKey.id }, req.ip);

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Error sending bulk messages', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/status - Estado general de la API
router.get('/status', validateApiKey, async (req, res) => {
  try {
    const session = await DB.getWhatsappSession(req.user.id);
    res.json({
      success: true,
      data: {
        whatsapp_connected: session?.is_connected || false,
        api_key_active: req.apiKey.is_active,
        user_id: req.user.id
      }
    });
  } catch (error) {
    logger.error('Error getting API status', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
