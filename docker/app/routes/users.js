const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../services/database');
const jwt = require('../services/jwt');
const logger = require('../utils/logger');

// GET /users - Listar usuarios (solo admin)
router.get('/', auth.verifyToken, auth.adminOnly, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Error fetching users', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /users/:id - Obtener usuario
router.get('/:id', auth.verifyToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Error fetching user', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /users - Crear usuario (solo admin)
router.post('/', auth.verifyToken, auth.adminOnly, async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const user = await db.createUser(username, password, email || null);
    await db.logAudit(req.user.id, 'create_user', 'users', { username, email });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Error creating user', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /users/:id - Editar usuario (solo admin o el mismo usuario)
router.put('/:id', auth.verifyToken, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id) && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { username, email } = req.body;
    const user = await db.updateUser(req.params.id, username, email);
    await db.logAudit(req.user.id, 'update_user', 'users', { id: req.params.id });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Error updating user', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /users/:id - Eliminar usuario (solo admin)
router.delete('/:id', auth.verifyToken, auth.adminOnly, async (req, res) => {
  try {
    await db.deleteUser(req.params.id);
    await db.logAudit(req.user.id, 'delete_user', 'users', { id: req.params.id });

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    logger.error('Error deleting user', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
