/**
 * Módulo de conexão com PostgreSQL
 * Substitui o sql.js para uso com banco externo
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tcepa',
  user: process.env.DB_USER || 'tcepa',
  password: process.env.DB_PASSWORD || 'tcepa123',
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool:', err.message);
});

async function getDatabase() {
  // Apenas verifica se a conexão funciona
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return pool;
  } finally {
    client.release();
  }
}

/**
 * Executa query SELECT com parâmetros
 */
async function exec(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Retorna apenas o primeiro resultado
 */
async function get(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Executa DML/DDL
 */
async function run(sql, params = []) {
  await pool.query(sql, params);
}

/**
 * Fecha o pool (para uso em scripts)
 */
async function fechar() {
  await pool.end();
}

module.exports = { getDatabase, exec, get, run, fechar, pool };
