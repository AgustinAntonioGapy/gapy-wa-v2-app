require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Gapy WhatsApp Bot API - Running', status: 'ok' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

pool.on('error', (err) => {
  console.error('Pool error', err);
});

app.listen(port, () => {
  console.log(`? Server running on port ${port}`);
  console.log('?? Ready to receive connections');
});
