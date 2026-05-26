const { Client, LocalAuth, Events } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class WhatsAppManager {
  constructor(io) {
    this.clients = {};
    this.io = io;
  }

  async initializeClient(userId, sessionPath) {
    if (this.clients[userId]) {
      return this.clients[userId];
    }

    logger.info(`Initializing WhatsApp client for user ${userId}`);

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: `user_${userId}` }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    client.on(Events.QR_RECEIVED, async (qr) => {
      logger.info(`QR received for user ${userId}`);
      const qrImage = await QRCode.toDataURL(qr);
      this.io.to(`user:${userId}`).emit('whatsapp:qr', { qr: qrImage });
    });

    client.on(Events.READY, async () => {
      logger.info(`WhatsApp ready for user ${userId}`);
      const info = await client.getWWebVersion();
      this.io.to(`user:${userId}`).emit('whatsapp:ready', {
        message: 'WhatsApp connected',
        version: info
      });
    });

    client.on(Events.AUTHENTICATED, () => {
      logger.info(`WhatsApp authenticated for user ${userId}`);
    });

    client.on(Events.AUTH_FAILURE, (msg) => {
      logger.error(`WhatsApp auth failure for user ${userId}: ${msg}`);
      this.io.to(`user:${userId}`).emit('whatsapp:auth_failure', { error: msg });
    });

    client.on(Events.DISCONNECTED, (reason) => {
      logger.warn(`WhatsApp disconnected for user ${userId}: ${reason}`);
      delete this.clients[userId];
      this.io.to(`user:${userId}`).emit('whatsapp:disconnected', { reason });
    });

    try {
      await client.initialize();
      this.clients[userId] = client;
      logger.info(`WhatsApp client initialized for user ${userId}`);
      return client;
    } catch (error) {
      logger.error(`Error initializing WhatsApp client: ${error.message}`);
      throw error;
    }
  }

  async getClient(userId) {
    if (this.clients[userId]) {
      return this.clients[userId];
    }
    return null;
  }

  async sendMessage(userId, chatId, message) {
    const client = await this.getClient(userId);
    if (!client) {
      throw new Error('WhatsApp client not initialized');
    }

    try {
      const result = await client.sendMessage(chatId, message);
      logger.info(`Message sent from user ${userId} to ${chatId}`);
      return result;
    } catch (error) {
      logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  async disconnectClient(userId) {
    const client = this.clients[userId];
    if (!client) {
      return;
    }

    try {
      await client.destroy();
      delete this.clients[userId];
      logger.info(`WhatsApp client destroyed for user ${userId}`);
    } catch (error) {
      logger.error(`Error destroying client: ${error.message}`);
    }
  }
}

module.exports = WhatsAppManager;
