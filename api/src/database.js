const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'pesquisa-precos.db');

let db = null;

/**
 * Retorna a instância do banco de dados SQLite (sql.js)
 * O banco é mantido em memória e sincronizado com o arquivo em disco.
 */
async function getDatabase() {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  criarTabelas();
  salvar();

  return db;
}

/**
 * Salva o banco em memória para o disco
 */
function salvar() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Wrapper para execução de queries com salvamento automático
 */
function exec(sql, params = []) {
  if (!db) throw new Error('Banco não inicializado. Chame getDatabase() primeiro.');
  const stmt = db.prepare(sql);

  if (params.length > 0) {
    stmt.bind(params);
  }

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free();
  return results;
}

/**
 * Executa uma query que retorna apenas o primeiro resultado
 */
function get(sql, params = []) {
  const results = exec(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Executa comandos DDL/DML sem retorno (salva automaticamente)
 */
function run(sql, params = []) {
  if (!db) throw new Error('Banco não inicializado.');
  db.run(sql, params);
  salvar();
}

/**
 * Executa comandos DDL/DML em lote sem salvar a cada iteração.
 * Salva apenas no final. Use para importação em massa.
 */
function runBatch(queries) {
  if (!db) throw new Error('Banco não inicializado.');
  for (const [sql, params] of queries) {
    db.run(sql, params || []);
  }
  salvar();
}

/**
 * Cria as tabelas e índices
 */
function criarTabelas() {
  db.run(`
    CREATE TABLE IF NOT EXISTS licitacoes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      cd_ibge           TEXT NOT NULL,
      nm_municipio      TEXT NOT NULL,
      id_pessoa         TEXT NOT NULL,
      nm_entidade       TEXT NOT NULL,
      id_licitacao      TEXT NOT NULL,
      nr_ano_licitacao  INTEGER NOT NULL,
      nr_licitacao      TEXT,
      ds_modalidade_licitacao TEXT,
      nm_pessoa         TEXT,
      nr_documento      TEXT,
      nr_lote           INTEGER,
      nr_item           INTEGER,
      nr_quantidade     REAL,
      id_unidade_medida TEXT,
      ds_unidade_medida TEXT,
      vl_minimo_unitario_item REAL,
      vl_minimo_total   REAL,
      vl_maximo_unitario_item REAL,
      vl_maximo_total   REAL,
      ds_item           TEXT,
      ds_forma_pagamento TEXT,
      nr_prazo_limite_entrega INTEGER,
      id_tipo_entrega_produto TEXT,
      ds_tipo_entrega_produto TEXT,
      nr_quantidade_proposta_licitacao REAL,
      vl_proposta_item  REAL,
      dt_validade_proposta TEXT,
      dt_prazo_entrega_proposta_licitacao TEXT,
      nr_quantidade_vencedor_licitacao REAL,
      vl_licitacao_vencedor_licitacao REAL,
      nr_classificacao  INTEGER,
      dt_homologacao    TEXT,
      ultimo_envio_simam_neste_exercicio TEXT,
      data_referencia   TEXT
    );
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_ds_item ON licitacoes(ds_item);
    CREATE INDEX IF NOT EXISTS idx_municipio ON licitacoes(cd_ibge, nm_municipio);
    CREATE INDEX IF NOT EXISTS idx_modalidade ON licitacoes(ds_modalidade_licitacao);
    CREATE INDEX IF NOT EXISTS idx_ano ON licitacoes(nr_ano_licitacao);
    CREATE INDEX IF NOT EXISTS idx_documento ON licitacoes(nr_documento);
  `);

}

module.exports = { getDatabase, exec, get, run, runBatch, salvar };
