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

// Importar servicios y middleware
const authMiddleware = require('./middleware/auth');
const JwtService = require('./services/jwt');

// Importar rutas
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const apiKeysRoutes = require('./routes/api-keys');
const whatsappRoutes = require('./routes/whatsapp');
const apiRoutes = require('./routes/api');

// Ruta raíz - Login o dashboard según autenticación
app.get('/', (req, res) => {
  const token = req.cookies?.authToken;

  if (token && !JwtService.isTokenExpired(token)) {
    const decoded = JwtService.decodeToken(token);
    return res.redirect(decoded.isAdmin ? '/admin' : '/dashboard');
  }

  res.render('login', { error: null });
});

// Rutas de autenticación
app.use('/auth', authRoutes);

// Dashboard de usuario (requiere autenticación)
app.get('/dashboard', authMiddleware.verifySession, (req, res) => {
  res.render('user-dashboard', { user: req.user });
});

// Dashboard de admin (requiere ser admin)
app.get('/admin', authMiddleware.verifySession, authMiddleware.requireAdmin, (req, res) => {
  res.render('admin-dashboard', { user: req.user });
});

// Rutas de API protegidas
app.use('/users', authMiddleware.verifyToken, usersRoutes);
app.use('/api/api-keys', authMiddleware.verifyToken, apiKeysRoutes);
app.use('/whatsapp', authMiddleware.verifyToken, whatsappRoutes);
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

module.exports = { app, server, io };
