const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

async function initAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔑 Inicializando usuario admin...');

    const username = 'admin';
    const password = 'AdminPassword2026';
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Verificar si el usuario ya existe
    const exists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (exists.rows.length > 0) {
      console.log('✅ Usuario admin ya existe');
      await pool.end();
      return;
    }

    // Insertar el usuario admin
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, email, is_admin, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, is_admin',
      [username, hashedPassword, 'admin@gapy.local', true, true]
    );

    console.log('✅ Usuario admin creado exitosamente');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Usuario: ${result.rows[0].username}`);
    console.log(`   Admin: ${result.rows[0].is_admin}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error.message);
    await pool.end();
    process.exit(1);
  }
}

initAdmin();
