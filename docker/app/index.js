const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Importar servicios
const WhatsAppManager = require('./services/whatsapp');
const jwt = require('./services/jwt');
const auth = require('./middleware/auth');
const logger = require('./utils/logger');

// Instanciar WhatsApp Manager
const waManager = new WhatsAppManager(io);

// Rutas
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const apiKeysRoutes = require('./routes/api-keys');
const whatsappRoutes = require('./routes/whatsapp');
const apiRoutes = require('./routes/api');

// Ruta raíz - login o dashboard según autenticación
app.get('/', (req, res) => {
  const token = req.cookies?.authToken;

  if (token && !jwt.isTokenExpired(token)) {
    const decoded = jwt.decodeToken(token);
    return res.redirect(decoded.isAdmin ? '/admin' : '/dashboard');
  }

  res.render('login', { error: null });
});

// Rutas de autenticación
app.use('/auth', authRoutes);

// Dashboard de usuario (requiere autenticación)
app.get('/dashboard', auth.verifyToken, (req, res) => {
  res.render('user-dashboard', { user: req.user });
});

// Dashboard de admin (requiere ser admin)
app.get('/admin', auth.verifyToken, auth.adminOnly, (req, res) => {
  res.render('admin-dashboard', { user: req.user });
});

// Rutas de API protegidas
app.use('/users', usersRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Socket.io connection
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Auth event
  socket.on('auth', async (data) => {
    try {
      if (!data.token) {
        socket.emit('error', { message: 'No token provided' });
        return;
      }

      const decoded = jwt.verifyToken(data.token);
      socket.userId = decoded.userId;
      socket.join(`user:${decoded.userId}`);

      logger.info(`User authenticated: ${socket.userId}`);
    } catch (error) {
      socket.emit('error', { message: 'Invalid token' });
      logger.error('Socket auth error:', error);
    }
  });

  // WhatsApp disconnect
  socket.on('whatsapp:disconnect', async (data) => {
    if (socket.userId) {
      try {
        await waManager.disconnectClient(socket.userId);
        io.to(`user:${socket.userId}`).emit('whatsapp:disconnected', { message: 'Disconnected' });
      } catch (error) {
        logger.error('Error disconnecting WhatsApp:', error);
      }
    }
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { path: req.path });
});

// Iniciar servidor
server.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Server running on port ${PORT}`);
});

module.exports = { app, server, io, waManager };
