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
  if (db) {
    // DEBUG: verificar se o db em memória ainda tem dados
    try {
      const test = db.exec("SELECT COUNT(*) as c FROM licitacoes");
      console.log(`[DB] Cache hit - registros: ${test?.[0]?.values?.[0]?.[0] ?? 'erro'}`);
    } catch (e) {
      console.log('[DB] Cache hit mas query falhou:', e.message);
    }
    return db;
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    console.log(`[DB] Arquivo encontrado: ${stats.size} bytes`);
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    const test = db.exec("SELECT COUNT(*) as c FROM licitacoes");
    console.log(`[DB] Após carregar arquivo - registros: ${test?.[0]?.values?.[0]?.[0] ?? 'erro'}`);
  } else {
    console.log('[DB] Arquivo não encontrado, criando novo banco');
    db = new SQL.Database();
  }

  try {
    criarTabelas();
    console.log('[DB] Tabelas criadas/verificadas com sucesso');
  } catch (err) {
    console.error('[DB] Erro ao criar tabelas:', err.message);
  }

  salvar();

  // DEBUG: verificar após salvar
  try {
    const test = db.exec("SELECT COUNT(*) as c FROM licitacoes");
    console.log(`[DB] Após salvar - registros: ${test?.[0]?.values?.[0]?.[0] ?? 'erro'}`);
  } catch (e) {
    console.log('[DB] Erro na verificação pós-salvar:', e.message);
  }

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
 * Wrapper para execução de queries SELECT com parâmetros.
 * usa db.exec() do sql.js que é mais robusto que prepare/step.
 */
function exec(sql, params = []) {
  if (!db) throw new Error('Banco não inicializado. Chame getDatabase() primeiro.');

  // Se tem parâmetros, usa prepared statement
  if (params.length > 0) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  // Sem parâmetros, usa db.exec() que é mais simples
  const raw = db.exec(sql);
  if (!raw || raw.length === 0) return [];

  const columns = raw[0].columns;
  const values = raw[0].values || [];

  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Executa uma query que retorna apenas o primeiro resultado
 */
function get(sql, params = []) {
  const results = exec(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Executa comandos DDL/DML sem retorno (salva automaticamente).
 * Usa db.exec() que suporta múltiplos statements separados por ;
 */
function run(sql, params = []) {
  if (!db) throw new Error('Banco não inicializado.');
  if (params.length > 0) {
    db.run(sql, params);
  } else {
    db.exec(sql);
  }
  salvar();
}

/**
 * Executa comandos DDL/DML em lote sem salvar a cada iteração.
 * Salva apenas no final. Use para importação em massa.
 */
function runBatch(queries) {
  if (!db) throw new Error('Banco não inicializado.');
  for (const [sql, params] of queries) {
    if (params && params.length > 0) {
      db.run(sql, params);
    } else {
      db.exec(sql);
    }
  }
  salvar();
}

/**
 * Cria as tabelas e índices
 */
function criarTabelas() {
  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_ds_item ON licitacoes(ds_item);
    CREATE INDEX IF NOT EXISTS idx_municipio ON licitacoes(cd_ibge, nm_municipio);
    CREATE INDEX IF NOT EXISTS idx_modalidade ON licitacoes(ds_modalidade_licitacao);
    CREATE INDEX IF NOT EXISTS idx_ano ON licitacoes(nr_ano_licitacao);
    CREATE INDEX IF NOT EXISTS idx_documento ON licitacoes(nr_documento);
  `);
}

module.exports = { getDatabase, exec, get, run, runBatch, salvar };
