#!/bin/bash
set -e

cd /tmp/gapy-wa-v2-app

# package.json
cat > docker/app/package.json << 'EOF'
{
  "name": "gapy-wa-v2",
  "version": "1.0.0",
  "description": "Multi-user WhatsApp Bot with Admin Dashboard",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "pg": "^8.10.0",
    "dotenv": "^16.3.1",
    "body-parser": "^1.20.2",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "ejs": "^3.1.9",
    "whatsapp-web.js": "^1.23.0",
    "qrcode": "^1.5.3",
    "uuid": "^9.0.0"
  }
}
EOF

# index.js
cat > docker/app/index.js << 'EOF'
const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
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

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.send('Gapy WhatsApp Bot API - Running');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`?? Server running on port ${PORT}`);
});
EOF

# init.sql
cat > docker/db/init.sql << 'EOF'
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20),
    session_data JSONB,
    connected BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);

INSERT INTO users (username, password_hash, email, role) VALUES ('admin', '$2b$10$dummyhash', 'admin@gapy.io', 'admin') ON CONFLICT DO NOTHING;
EOF

# nginx.conf
cat > docker/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
events { worker_connections 1024; }
http {
  upstream app { server gapy-app:3000; }
  server {
    listen 80;
    server_name _;
    client_max_body_size 20M;
    location / {
      proxy_pass http://app;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /socket.io {
      proxy_pass http://app/socket.io;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }
  }
}
EOF

# .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://gapy_user:password@postgres:5432/gapy_wa_db
DB_PASSWORD=password
JWT_SECRET=your_secret_key_here_change_this_32chars
ADMIN_PASSWORD=AdminPassword2026
EOF

# .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
dist/
*.pem
*.key
.DS_Store
EOF

# README.md
cat > README.md << 'EOF'
# Gapy WhatsApp Bot v2
Multi-user WhatsApp Bot with Admin Dashboard

## Quick Start
```bash
docker-compose up -d
```

## Access
- Web: http://localhost/
- API: http://localhost:3000/api/
- Database: postgres://gapy_user:password@localhost:5432/gapy_wa_db

## Features
- Multi-user WhatsApp sessions
- Admin dashboard
- API Keys for external access
- Real-time WebSocket updates
- Persistent PostgreSQL database
EOF

echo "? Todos los archivos creados exitosamente"
