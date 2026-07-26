#!/usr/bin/env node
/**
 * ETL para importação do CSV de itens de NF-e para PostgreSQL.
 *
 * Funcionalidades:
 * - cria tabela e índices se não existirem
 * - importa CSV em streaming
 * - processa em lotes para arquivos grandes
 * - registra execução em tabela de log
 * - evita duplicidade com hash de origem
 *
 * Uso:
 *   node src/import-notas-fiscais-csv-pg.js "/caminho/arquivo.csv"
 *   node src/import-notas-fiscais-csv-pg.js "/caminho/pasta/*.csv"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse');
const { pool, getDatabase, fechar } = require('./database-pg');

const TABLE_NAME = 'notas_fiscais_items';
const LOG_TABLE = 'etl_import_logs';
const BATCH_SIZE = parseInt(process.env.IMPORT_BATCH_SIZE || '1000', 10);

async function ensureSchema() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id BIGSERIAL PRIMARY KEY,
      source_hash TEXT NOT NULL UNIQUE,
      chave_acesso TEXT,
      numero_nf TEXT,
      serie TEXT,
      data_emissao DATE,
      cd_ibge TEXT,
      municipio TEXT,
      cnpj_emitente TEXT,
      cpf_emitente TEXT,
      descricao TEXT,
      quantidade NUMERIC(18,4),
      unidade TEXT,
      valor_unitario NUMERIC(18,4),
      valor_total NUMERIC(18,4),
      raw JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_municipio ON ${TABLE_NAME} (cd_ibge, municipio);
    CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_cnpj ON ${TABLE_NAME} (cnpj_emitente);
    CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_data_emissao ON ${TABLE_NAME} (data_emissao);
    CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_descricao_trgm ON ${TABLE_NAME} USING gin (descricao gin_trgm_ops);

    CREATE TABLE IF NOT EXISTS ${LOG_TABLE} (
      id BIGSERIAL PRIMARY KEY,
      job_name TEXT NOT NULL,
      source_file TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'running',
      rows_read BIGINT NOT NULL DEFAULT 0,
      rows_inserted BIGINT NOT NULL DEFAULT 0,
      rows_ignored BIGINT NOT NULL DEFAULT 0,
      rows_failed BIGINT NOT NULL DEFAULT 0,
      message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_${LOG_TABLE}_started_at ON ${LOG_TABLE} (started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_${LOG_TABLE}_source_hash ON ${LOG_TABLE} (source_hash);
  `);
}

function resolveFiles(input) {
  const candidates = [];
  if (!input) return candidates;

  if (input.includes('*')) {
    const dir = path.resolve(input).replace(/[\\/][^\\/]*$/, '') || '.';
    const prefix = path.basename(input).split('*')[0];
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        if (name.endsWith('.csv') && name.startsWith(prefix)) {
          candidates.push(path.join(dir, name));
        }
      }
    }
    return candidates;
  }

  const file = path.resolve(input);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    candidates.push(file);
  }
  return candidates;
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeNumber(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;

  const isoLike = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoLike) return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}`;

  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return null;
}

function pick(record, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(record, name) && record[name] !== '') {
      return record[name];
    }
  }
  return null;
}

function mapRecord(record) {
  const descricao = normalizeText(pick(record, ['descricao', 'descricao_item', 'dsItem', 'xProd', 'description', 'detalhe', 'descItem']));
  const quantidade = normalizeNumber(pick(record, ['quantidade', 'qCom', 'qComercial', 'qTrib', 'qtde', 'qty']));
  const valorUnitario = normalizeNumber(pick(record, ['valor_unitario', 'vUnCom', 'vUnTrib', 'vUn', 'valorUnitario', 'vl_unitario']));
  const valorTotal = normalizeNumber(pick(record, ['valor_total', 'vProd', 'valorTotal', 'vl_total']));
  const chave = normalizeText(pick(record, ['chNFe', 'chave_acesso', 'chave', 'chaveAcesso', 'chave_nf']));

  const raw = {};
  for (const [key, value] of Object.entries(record)) {
    raw[key] = value;
  }

  const sourceKeyParts = [
    chave,
    normalizeText(pick(record, ['numero_nf', 'nNF', 'numero'])),
    normalizeText(pick(record, ['serie'])),
    normalizeText(pick(record, ['cnpj_emitente', 'CNPJ', 'cnpj', 'CNPJ_emitente'])),
    normalizeText(pick(record, ['cpf_emitente', 'CPF', 'cpf'])),
    descricao,
    String(quantidade ?? ''),
    String(valorUnitario ?? ''),
    String(valorTotal ?? ''),
    normalizeText(pick(record, ['cd_ibge', 'cMun', 'cMunFG'])),
    normalizeText(pick(record, ['municipio', 'xMun'])),
  ];

  const sourceHash = crypto
    .createHash('sha1')
    .update(sourceKeyParts.map(v => v ?? '').join('|'))
    .digest('hex');

  return {
    source_hash: sourceHash,
    chave_acesso: chave,
    numero_nf: normalizeText(pick(record, ['numero_nf', 'nNF', 'numero'])),
    serie: normalizeText(pick(record, ['serie'])),
    data_emissao: normalizeDate(pick(record, ['data_emissao', 'dEmi', 'dhEmi', 'dataEmissao', 'data'])),
    cd_ibge: normalizeText(pick(record, ['cd_ibge', 'cMun', 'cMunFG'])),
    municipio: normalizeText(pick(record, ['municipio', 'xMun'])),
    cnpj_emitente: normalizeText(pick(record, ['cnpj_emitente', 'CNPJ', 'cnpj', 'CNPJ_emitente'])),
    cpf_emitente: normalizeText(pick(record, ['cpf_emitente', 'CPF', 'cpf'])),
    descricao,
    quantidade,
    unidade: normalizeText(pick(record, ['unidade', 'uCom', 'uTrib'])),
    valor_unitario: valorUnitario,
    valor_total: valorTotal,
    raw: JSON.stringify(raw),
  };
}

async function insertBatch(client, rows) {
  if (rows.length === 0) return { inserted: 0, ignored: 0 };

  const values = [];
  const placeholders = [];
  let param = 1;

  for (const row of rows) {
    placeholders.push(`($${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++}, $${param++})`);
    values.push(
      row.source_hash,
      row.chave_acesso,
      row.numero_nf,
      row.serie,
      row.data_emissao,
      row.cd_ibge,
      row.municipio,
      row.cnpj_emitente,
      row.cpf_emitente,
      row.descricao,
      row.quantidade,
      row.unidade,
      row.valor_unitario,
      row.valor_total,
      row.raw
    );
  }

  const sql = `
    INSERT INTO ${TABLE_NAME} (
      source_hash, chave_acesso, numero_nf, serie, data_emissao, cd_ibge,
      municipio, cnpj_emitente, cpf_emitente, descricao, quantidade, unidade,
      valor_unitario, valor_total, raw
    ) VALUES ${placeholders.join(', ')}
    ON CONFLICT (source_hash) DO NOTHING
    RETURNING 1
  `;

  const result = await client.query(sql, values);
  return {
    inserted: result.rowCount,
    ignored: rows.length - result.rowCount,
  };
}

async function logJobStart(client, sourceFile, sourceHash) {
  const result = await client.query(
    `INSERT INTO ${LOG_TABLE} (job_name, source_file, source_hash, status)
     VALUES ($1, $2, $3, 'running')
     RETURNING id`,
    ['import-notas-fiscais-csv', sourceFile, sourceHash]
  );
  return result.rows[0].id;
}

async function logJobFinish(client, id, payload) {
  const fields = [
    'status',
    'rows_read',
    'rows_inserted',
    'rows_ignored',
    'rows_failed',
    'message',
  ];
  const values = [
    payload.status,
    payload.rows_read,
    payload.rows_inserted,
    payload.rows_ignored,
    payload.rows_failed,
    payload.message,
    id,
  ];

  await client.query(
    `UPDATE ${LOG_TABLE}
     SET status = $1,
         rows_read = $2,
         rows_inserted = $3,
         rows_ignored = $4,
         rows_failed = $5,
         message = $6,
         finished_at = NOW()
     WHERE id = $7`,
    values
  );
}

async function processFile(filePath) {
  const fileHash = crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
  const client = await pool.connect();

  try {
    await ensureSchema();
    await client.query('BEGIN');
    const logId = await logJobStart(client, path.basename(filePath), fileHash);
    await client.query('COMMIT');

    console.log(`[INFO] Arquivo: ${filePath}`);

    const stream = fs.createReadStream(filePath);
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    });

    let rowsRead = 0;
    let rowsInserted = 0;
    let rowsIgnored = 0;
    let rowsFailed = 0;
    let batch = [];
    let done = false;
    let streamError = null;

    const flushBatch = async () => {
      if (batch.length === 0) return;
      const current = batch;
      batch = [];
      const batchClient = await pool.connect();
      try {
        await batchClient.query('BEGIN');
        const result = await insertBatch(batchClient, current);
        await batchClient.query('COMMIT');
        rowsInserted += result.inserted;
        rowsIgnored += result.ignored;
        console.log(`[INFO] Lote processado: ${current.length} linhas, inseridas ${result.inserted}, ignoradas ${result.ignored}`);
      } catch (error) {
        rowsFailed += current.length;
        await batchClient.query('ROLLBACK');
        console.error(`[ERRO] Falha no lote: ${error.message}`);
      } finally {
        batchClient.release();
      }
    };

    const finish = async (status, message) => {
      const finalClient = await pool.connect();
      try {
        await logJobFinish(finalClient, logId, {
          status,
          rows_read: rowsRead,
          rows_inserted: rowsInserted,
          rows_ignored: rowsIgnored,
          rows_failed: rowsFailed,
          message,
        });
      } finally {
        finalClient.release();
      }
    };

    parser.on('readable', async () => {
      if (done) return;
      let record;
      while ((record = parser.read())) {
        rowsRead += 1;
        try {
          batch.push(mapRecord(record));
        } catch (error) {
          rowsFailed += 1;
          console.error(`[ERRO] Linha inválida ${rowsRead}: ${error.message}`);
        }

        if (batch.length >= BATCH_SIZE) {
          parser.pause();
          try {
            await flushBatch();
          } finally {
            parser.resume();
          }
        }
      }
    });

    parser.on('error', async (error) => {
      streamError = error;
      done = true;
      console.error(`[ERRO] CSV inválido: ${error.message}`);
      try {
        await finish('failed', error.message);
      } catch (logError) {
        console.error(`[ERRO] Falha ao gravar log: ${logError.message}`);
      }
      process.exitCode = 1;
    });

    parser.on('end', async () => {
      if (done) return;
      done = true;

      try {
        await flushBatch();
        const message = `import concluído com ${rowsInserted} inseridos`;
        await finish('success', message);
        console.log(`[OK] ${path.basename(filePath)}: lidas=${rowsRead}, inseridas=${rowsInserted}, ignoradas=${rowsIgnored}, falhas=${rowsFailed}`);
      } catch (error) {
        console.error(`[ERRO] Finalização falhou: ${error.message}`);
        try {
          await finish('failed', error.message);
        } catch (logError) {
          console.error(`[ERRO] Falha ao gravar log final: ${logError.message}`);
        }
        process.exitCode = 1;
      }
    });

    stream.pipe(parser);

    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      parser.on('error', reject);
      parser.on('end', resolve);
    });

    if (streamError) throw streamError;
  } finally {
    client.release();
  }
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Uso: node src/import-notas-fiscais-csv-pg.js "<arquivo.csv|pasta/*.csv>"');
    process.exit(1);
  }

  const files = resolveFiles(input);
  if (files.length === 0) {
    console.error(`Arquivo(s) não encontrado(s): ${input}`);
    process.exit(1);
  }

  await getDatabase();

  for (const filePath of files) {
    await processFile(filePath);
  }

  await fechar();
}

main().catch(async (error) => {
  console.error(`[ERRO] ${error.message}`);
  try {
    await fechar();
  } catch (_) {}
  process.exit(1);
});
