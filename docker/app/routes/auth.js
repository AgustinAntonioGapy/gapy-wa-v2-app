const express = require('express');
const router = express.Router();
const DB = require('../services/database');
const JwtService = require('../services/jwt');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await DB.verifyPassword(username, password);
    if (!user) {
      logger.warn(`Failed login attempt for user: ${username}`);
      // Si viene del formulario HTML, re-renderizar con error
      if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        return res.render('login', { error: 'Usuario o contraseña incorrectos' });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = JwtService.generateToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin
    });

    await DB.logAction(user.id, 'login', 'auth', null, { method: 'password' }, req.ip);
    logger.info(`User ${username} logged in successfully`);

    // Si viene del formulario HTML, establecer cookie y redirigir
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
      });
      return res.redirect(user.is_admin ? '/admin' : '/dashboard');
    }

    // Si es API request, devolver JSON
    res.json({ status: 'success', token, user: { id: user.id, username: user.username, isAdmin: user.is_admin } });
  } catch (err) {
    logger.error('Login error', err);
    // Si viene del formulario, renderizar con error
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      return res.render('login', { error: 'Error en el servidor' });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', authMiddleware.verifyToken, async (req, res) => {
  try {
    await DB.logAction(req.user.id, 'logout', 'auth', null, null, req.ip);
    logger.info(`User ${req.user.username} logged out`);

    // Si viene del formulario, limpiar cookie y redirigir
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      res.clearCookie('authToken');
      return res.redirect('/');
    }

    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Logout error', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', authMiddleware.verifyToken, async (req, res) => {
  try {
    const user = await DB.getUserById(req.user.id);
    res.json({ status: 'success', user: { id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin, createdAt: user.created_at } });
  } catch (err) {
    logger.error('Get user error', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

router.post('/refresh', authMiddleware.verifyToken, (req, res) => {
  try {
    const newToken = JwtService.generateToken({
      userId: req.user.id,
      username: req.user.username,
      isAdmin: req.user.isAdmin
    });
    res.json({ status: 'success', token: newToken });
  } catch (err) {
    logger.error('Token refresh error', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

module.exports = router;
