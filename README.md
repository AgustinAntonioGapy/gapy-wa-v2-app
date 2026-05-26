# GapyAdmin v3.0 - Multi-User WhatsApp Bot

Plataforma de administración para múltiples usuarios con WhatsApp Bot integration, API Keys management, y dashboards personalizados.

## 🎯 Características

- **Multi-User Architecture**: Cada usuario tiene su propia sesión de WhatsApp
- **JWT Authentication**: Autenticación segura con JWT tokens
- **Admin Dashboard**: Gestión de usuarios para administradores
- **User Dashboard**: Interfaz personalizada con QR scan y API Keys
- **WhatsApp Integration**: Integración con WhatsApp Web (whatsapp-web.js)
- **Real-time Updates**: WebSocket events con Socket.io
- **API Keys Management**: Generación y gestión de API Keys por usuario
- **Audit Logging**: Registro de todas las acciones
- **Multi-device Support**: Responsive design con Bootstrap 5

## 🏗️ Arquitectura

```
├── docker/
│   ├── app/
│   │   ├── index.js                 # Aplicación principal
│   │   ├── package.json             # Dependencias
│   │   ├── routes/                  # Rutas de API
│   │   │   ├── auth.js              # Autenticación
│   │   │   ├── users.js             # Gestión de usuarios
│   │   │   ├── api-keys.js          # API Keys
│   │   │   ├── whatsapp.js          # WhatsApp
│   │   │   └── api.js               # API pública
│   │   ├── services/                # Lógica de negocio
│   │   │   ├── database.js          # BD operations
│   │   │   ├── jwt.js               # JWT handling
│   │   │   └── whatsapp.js          # WhatsApp client manager
│   │   ├── middleware/              # Middleware
│   │   │   └── auth.js              # Autenticación
│   │   ├── utils/                   # Utilidades
│   │   │   └── logger.js            # Logging
│   │   └── views/                   # Templates EJS
│   │       ├── login.ejs            # Login page
│   │       ├── admin-dashboard.ejs  # Admin dashboard
│   │       └── user-dashboard.ejs   # User dashboard
│   ├── db/
│   │   └── init.sql                 # Schema initialization
│   └── nginx/
│       └── nginx.conf               # Reverse proxy
├── docker-compose.yml               # Orquestación
└── .env.example                     # Variables de entorno
```

## 📋 Requisitos Previos

- Docker & Docker Compose
- Node.js 18+ (para desarrollo local)
- PostgreSQL 14+ (incluido en Docker Compose)
- Google Chrome (para Puppeteer/WhatsApp)

## 🚀 Instalación

### 1. Clonar repositorio
```bash
git clone https://github.com/AgustinAntonioGapy/gapy-wa-v2-app.git
cd gapy-wa-v2-app
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 3. Iniciar servicios con Docker Compose
```bash
docker-compose up -d
```

### 4. Inicializar base de datos
```bash
docker exec gapy-app npm run db:init
docker exec gapy-app npm run db:seed
```

### 5. Acceder a la aplicación
- URL: http://localhost:3000
- Admin username: admin
- Admin password: (del .env file)

## 🔐 Autenticación

### Login
```bash
POST /api/auth/login
{
  "username": "user",
  "password": "password"
}
```

### API Key
```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "X-API-Key: gk_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"number": "551234567890", "message": "Hello!"}'
```

## 📊 Base de Datos

### Schema
- `users` - Usuarios del sistema
- `api_keys` - API Keys por usuario
- `whatsapp_sessions` - Metadata de sesiones
- `audit_logs` - Registro de acciones

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Users
- `GET /api/user/profile` - Get own profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/change-password` - Change password

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `DELETE /api/admin/users/:id` - Delete user

### API Keys
- `GET /api/api-keys` - List own API keys
- `POST /api/api-keys` - Create API key
- `DELETE /api/api-keys/:id` - Delete API key

### WhatsApp
- `POST /api/whatsapp/init` - Initialize client
- `GET /api/whatsapp/status` - Get connection status
- `POST /api/whatsapp/logout` - Disconnect
- `GET /api/whatsapp/groups` - List groups

### Public API
- `POST /api/messages/send` - Send message (requires API key)
- `GET /api/logs` - Get personal activity logs
- `GET /api/health` - Health check

## 🔌 WebSocket Events

### Client to Server
- `whatsapp:request-qr` - Request QR code
- `whatsapp:disconnect` - Disconnect WhatsApp
- `message:send` - Send message
- `whatsapp:get-groups` - Get groups list

### Server to Client
- `whatsapp:qr` - QR code generated
- `whatsapp:authenticated` - Authenticated
- `whatsapp:ready` - Ready to use
- `whatsapp:disconnected` - Disconnected
- `message:sent` - Message sent
- `message:error` - Error occurred

## 📁 Estructura de Sesiones

Las sesiones de WhatsApp se almacenan en `/app/sessions/` con estructura:
```
/app/sessions/
├── user-1/
│   └── session/         # Chrome profile data
├── user-2/
│   └── session/
└── user-N/
    └── session/
```

## 🛠️ Desarrollo Local

### Instalar dependencias
```bash
cd docker/app
npm install
```

### Ejecutar en modo desarrollo
```bash
npm run dev
```

### Inicializar base de datos
```bash
npm run db:init
npm run db:seed
```

## 🐳 Docker Compose

```bash
# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Parar
docker-compose down

# Eliminar todo (incluyendo datos)
docker-compose down -v
```

## 🔒 Seguridad

- Contraseñas con bcrypt (10 rounds)
- JWT tokens con expiración (7 días)
- API Keys únicas por usuario
- Aislamiento de datos por user_id
- Audit logging de todas las acciones
- HTTPS recomendado en producción
- CORS whitelist configurado

## 📝 Variables de Entorno

Ver `.env.example` para lista completa:
- `NODE_ENV` - Ambiente (development/production)
- `PORT` - Puerto de la aplicación
- `DATABASE_URL` - Conexión PostgreSQL
- `JWT_SECRET` - Clave secreta para JWT
- `ADMIN_PASSWORD` - Contraseña del admin
- `SESSION_DIR` - Directorio de sesiones WhatsApp
- `CHROME_PATH` - Ruta del Chrome ejecutable

## 🐛 Troubleshooting

### WhatsApp QR no aparece
```bash
# Reiniciar contenedor
docker restart gapy-app

# Verificar logs
docker logs gapy-app
```

### Conexión a base de datos rechazada
```bash
# Verificar que PostgreSQL está up
docker ps | grep postgres

# Verificar DATABASE_URL en .env
```

### Chrome/Puppeteer error
```bash
# Reinstalar whatsapp-web.js
docker exec gapy-app npm install --save whatsapp-web.js
```

## 📚 Documentación Adicional

- [Requerimientos](/docs/00-REQUERIMIENTOS.md)
- [Especificaciones Técnicas](/docs/01-ESPECIFICACIONES.md)
- [Arquitectura](/docs/02-ARQUITECTURA.md)

## 🤝 Contributing

Para contribuir:
1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Proyecto privado de Gapy. Todos los derechos reservados.

## 👤 Autor

Agustín Gapy - agustin@gapy.io

## 🙏 Agradecimientos

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [Express.js](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [PostgreSQL](https://www.postgresql.org/)

---

**v3.0.0** - Mayo 2026 | Multi-User Architecture Ready for Production
