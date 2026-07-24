#!/usr/bin/env node
/*
 * Importador CSV -> PostgreSQL para notas fiscais (itens NF-e)
 * Uso: node import-notas-fiscais.js <caminho_arquivo_csv>
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node import-notas-fiscais.js <arquivo.csv>');
    process.exit(1);
  }

  if (!fs.existsSync(file)) {
    console.error('Arquivo não encontrado:', file);
    process.exit(1);
  }

  const db = require('../api/src/database-pg');
  const pool = db.pool;

  const stream = fs.createReadStream(file);
  const parser = parse({ columns: true, skip_empty_lines: true, bom: true });

  let count = 0;
  const batch = [];
  const BATCH_SIZE = 500;

  parser.on('readable', async () => {
    let record;
    while ((record = parser.read())) {
      // Mapear colunas comuns para os campos da tabela
      const mapped = mapRecord(record);
      batch.push(mapped);
      if (batch.length >= BATCH_SIZE) {
        parser.pause();
        await insertBatch(pool, batch.splice(0));
        parser.resume();
      }
      count++;
      if (count % 1000 === 0) process.stdout.write(`Imported ${count} rows\r`);
    }
  });

  parser.on('end', async () => {
    if (batch.length > 0) await insertBatch(pool, batch.splice(0));
    console.log('\nImport completed. Total rows:', count);
    process.exit(0);
  });

  parser.on('error', err => {
    console.error('CSV parse error:', err.message);
    process.exit(1);
  });

  stream.pipe(parser);
}

function mapRecord(rec) {
  // Heurística de mapeamento - campos possíveis no CSV do governo
  const get = name => rec[name] || rec[name.toLowerCase()] || rec[name.toUpperCase()] || null;

  const descricao = get('descricao') || get('detalhe') || get('xProd') || get('description') || get('descItem') || '';
  const valor_unitario = parseFloat((get('vUnCom') || get('vUn') || get('valor_unitario') || get('vUnTrib') || 0) || 0);
  const quantidade = parseFloat((get('qCom') || get('quantidade') || get('qComercial') || 0) || 0);
  const valor_total = parseFloat((get('vProd') || get('valor') || get('vProd') || 0) || 0);

  return {
    chave_acesso: get('chNFe') || get('chave') || get('chave_acesso') || null,
    numero_nf: get('nNF') || get('numero') || null,
    serie: get('serie') || null,
    data_emissao: normalizeDate(get('dEmi') || get('dhEmi') || get('dataEmissao') || get('data')),
    cd_ibge: (get('cMunFG') || get('cMun') || get('cd_ibge') || '') || null,
    municipio: get('xMun') || get('municipio') || null,
    cnpj_emitente: (get('CNPJ') || get('cnpj') || get('CNPJ_emitente') || null),
    cpf_emitente: (get('CPF') || get('cpf') || null),
    descricao: descricao,
    quantidade: isNaN(quantidade) ? null : quantidade,
    unidade: get('uCom') || get('unidade') || null,
    valor_unitario: isNaN(valor_unitario) ? null : valor_unitario,
    valor_total: isNaN(valor_total) ? null : valor_total,
    raw: rec,
    data_referencia: null,
  };
}

function normalizeDate(s) {
  if (!s) return null;
  // tenta ISO
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
  // tenta dd/mm/yyyy
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

async function insertBatch(pool, rows) {
  if (rows.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertText = `INSERT INTO notas_fiscais_items(
      chave_acesso, numero_nf, serie, data_emissao, cd_ibge, municipio,
      cnpj_emitente, cpf_emitente, descricao, quantidade, unidade,
      valor_unitario, valor_total, raw
    ) VALUES `;

    const values = [];
    const placeholders = rows.map((r, i) => {
      const idx = i * 14;
      values.push(r.chave_acesso, r.numero_nf, r.serie, r.data_emissao, r.cd_ibge, r.municipio,
        r.cnpj_emitente, r.cpf_emitente, r.descricao, r.quantidade, r.unidade,
        r.valor_unitario, r.valor_total, JSON.stringify(r.raw));
      return `($${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11},$${idx+12},$${idx+13},$${idx+14})`;
    }).join(',');

    await client.query(insertText + placeholders, values);
    await client.query('COMMIT');
    console.log('Batch inserted:', rows.length);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Insert batch failed:', err.message || err);
    throw err;
  } finally {
    client.release();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
