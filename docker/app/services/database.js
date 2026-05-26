const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

const DB = {
  async createUser(username, password, email = null, isAdmin = false) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, email, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, email, is_admin, created_at',
      [username, hashedPassword, email, isAdmin]
    );
    return result.rows[0];
  },

  async getUserByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  },

  async getUserById(userId) {
    const result = await pool.query('SELECT id, username, email, is_admin, is_active, created_at, updated_at FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  },

  async getAllUsers() {
    const result = await pool.query('SELECT id, username, email, is_admin, is_active, created_at FROM users ORDER BY created_at DESC');
    return result.rows;
  },

  async updateUser(userId, { email = null, isActive = null }) {
    const updates = [];
    const values = [userId];
    let paramCount = 1;

    if (email !== null) {
      updates.push(`email = \$${++paramCount}`);
      values.push(email);
    }
    if (isActive !== null) {
      updates.push(`is_active = \$${++paramCount}`);
      values.push(isActive);
    }
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) return DB.getUserById(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = \$1 RETURNING id, username, email, is_admin, is_active, created_at, updated_at`;
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async deleteUser(userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  },

  async verifyPassword(username, password) {
    const user = await DB.getUserByUsername(username);
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? { id: user.id, username: user.username, is_admin: user.is_admin } : null;
  },

  async changePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);
    return true;
  },

  async createApiKey(userId, label) {
    const key = 'gk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const result = await pool.query(
      'INSERT INTO api_keys (user_id, label, key) VALUES ($1, $2, $3) RETURNING id, label, key, created_at',
      [userId, label || 'API Key', key]
    );
    return result.rows[0];
  },

  async getApiKeysByUser(userId) {
    const result = await pool.query(
      'SELECT id, label, key, last_used, created_at, is_active FROM api_keys WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async verifyApiKey(apiKey) {
    const result = await pool.query(
      'SELECT uk.id, uk.user_id, uk.label, u.username FROM api_keys uk JOIN users u ON uk.user_id = u.id WHERE uk.key = $1 AND uk.is_active = true',
      [apiKey]
    );
    return result.rows[0];
  },

  async updateApiKeyLastUsed(keyId) {
    await pool.query('UPDATE api_keys SET last_used = NOW() WHERE id = $1', [keyId]);
  },

  async deleteApiKey(userId, keyId) {
    const result = await pool.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
      [keyId, userId]
    );
    return result.rows[0];
  },

  async createSession(userId, phoneNumber) {
    const sessionPath = `/app/sessions/user-${userId}`;
    const result = await pool.query(
      'INSERT INTO whatsapp_sessions (user_id, phone_number, session_path) VALUES ($1, $2, $3) RETURNING id, user_id, phone_number, is_connected, session_path, created_at',
      [userId, phoneNumber, sessionPath]
    );
    return result.rows[0];
  },

  async getSessionByUser(userId) {
    const result = await pool.query(
      'SELECT * FROM whatsapp_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return result.rows[0];
  },

  async updateSessionStatus(userId, isConnected, isAuthenticated) {
    const result = await pool.query(
      'UPDATE whatsapp_sessions SET is_connected = $1, is_authenticated = $2, last_activity = NOW(), updated_at = NOW() WHERE user_id = $3 RETURNING *',
      [isConnected, isAuthenticated, userId]
    );
    return result.rows[0];
  },

  async logAction(userId, action, resource, resourceId, details = null, ipAddress = null) {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, action, resource, resourceId, JSON.stringify(details), ipAddress]
    );
  },

  async getAuditLogs(userId = null, limit = 100) {
    let query = 'SELECT id, user_id, action, resource, resource_id, details, ip_address, created_at FROM audit_logs';
    const values = [];

    if (userId) {
      query += ' WHERE user_id = $1';
      values.push(userId);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1);
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows;
  },

  async healthCheck() {
    try {
      const result = await pool.query('SELECT NOW()');
      return result.rows[0];
    } catch (err) {
      logger.error('Database health check failed', err);
      throw err;
    }
  },

  async closePool() {
    await pool.end();
  }
};

module.exports = DB;
