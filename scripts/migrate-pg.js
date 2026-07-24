#!/usr/bin/env node
/*
 * Script simples de migrations para PostgreSQL.
 * Executa arquivos SQL em `migrations/` e registra em `schema_migrations`.
 */
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'migrations');

async function main() {
  // Requer conexão via módulo existente (usa vars de ambiente)
  const db = require('../api/src/database-pg');
  const pool = db.pool;

  // Cria tabela de controle se não existir
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const res = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set(res.rows.map(r => r.name));

  if (!fs.existsSync(migrationsDir)) {
    console.error('Diretório migrations/ não encontrado. Crie migrations/ e adicione arquivos .sql.');
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log('Pulando (já aplicado):', file);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log('Aplicando migration:', file);
    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations(name) VALUES($1)', [file]);
      await pool.query('COMMIT');
      console.log('Aplicado:', file);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('Falha ao aplicar', file, err.message || err);
      process.exit(1);
    }
  }

  console.log('Migrations concluídas.');
  process.exit(0);
}

main().catch(err => {
  console.error('Erro no migrator:', err.message || err);
  process.exit(1);
});
