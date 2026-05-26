const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const waManager = require('../services/whatsapp');
const DB = require('../services/database');
const logger = require('../utils/logger');

// GET /whatsapp/qr - Obtener QR code actual
router.get('/qr', auth.verifySession, async (req, res) => {
  try {
    const session = await DB.getWhatsappSession(req.user.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'No WhatsApp session' });
    }
    res.json({ success: true, data: session });
  } catch (error) {
    logger.error('Error getting QR', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /whatsapp/init - Iniciar sesión WhatsApp
router.post('/init', auth.verifySession, async (req, res) => {
  try {
    const sessionPath = `/root/gapy-sessions/${req.user.id}`;
    const client = await waManager.initializeClient(req.user.id, sessionPath);

    res.json({ success: true, message: 'WhatsApp client initializing' });
  } catch (error) {
    logger.error('Error initializing WhatsApp', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /whatsapp/disconnect - Desconectar WhatsApp
router.post('/disconnect', auth.verifySession, async (req, res) => {
  try {
    await waManager.disconnectClient(req.user.id);
    await DB.logAction(req.user.id, 'disconnect_whatsapp', 'whatsapp_sessions', null, {}, req.ip);

    res.json({ success: true, message: 'WhatsApp disconnected' });
  } catch (error) {
    logger.error('Error disconnecting WhatsApp', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /whatsapp/status - Estado de la conexión
router.get('/status', auth.verifySession, async (req, res) => {
  try {
    const session = await DB.getWhatsappSession(req.user.id);
    const isConnected = session ? session.is_connected : false;

    res.json({
      success: true,
      data: {
        is_connected: isConnected,
        phone_number: session?.phone_number || null
      }
    });
  } catch (error) {
    logger.error('Error getting WhatsApp status', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
