/**
 * Script de importação dos XMLs do TCE/PR para o PostgreSQL
 *
 * Uso:
 *   node src/import-xml-pg.js                         # auto-detecta XMLs
 *   node src/import-xml-pg.js "/caminho/para/*.xml"
 *
 * Variáveis de ambiente:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */
const fs = require('fs');
const path = require('path');
const { run, get, fechar } = require('./database-pg');

// Cache para saber quais arquivos já foram importados
const HASH_TABLE = 'xml_importados';

// Mapeamento de atributos do XML -> colunas SQL
const ATTR_MAP = {
  cdIBGE: 'cd_ibge',
  nmMunicipio: 'nm_municipio',
  idPessoa: 'id_pessoa',
  nmEntidade: 'nm_entidade',
  idlicitacao: 'id_licitacao',
  nrAnoLicitacao: 'nr_ano_licitacao',
  nrLicitacao: 'nr_licitacao',
  dsModalidadeLicitacao: 'ds_modalidade_licitacao',
  nmPessoa: 'nm_pessoa',
  nrDocumento: 'nr_documento',
  nrLote: 'nr_lote',
  nrItem: 'nr_item',
  nrQuantidade: 'nr_quantidade',
  idUnidadeMedida: 'id_unidade_medida',
  dsUnidadeMedida: 'ds_unidade_medida',
  vlMinimoUnitarioItem: 'vl_minimo_unitario_item',
  vlMinimoTotal: 'vl_minimo_total',
  vlMaximoUnitarioitem: 'vl_maximo_unitario_item',
  vlMaximoTotal: 'vl_maximo_total',
  dsItem: 'ds_item',
  dsFormaPagamento: 'ds_forma_pagamento',
  nrPrazoLimiteEntrega: 'nr_prazo_limite_entrega',
  idTipoEntregaProduto: 'id_tipo_entrega_produto',
  dsTipoEntregaProduto: 'ds_tipo_entrega_produto',
  nrQuantidadePropostaLicitacao: 'nr_quantidade_proposta_licitacao',
  vlPropostaItem: 'vl_proposta_item',
  dtValidadeProposta: 'dt_validade_proposta',
  dtPrazoEntregaPropostaLicitacao: 'dt_prazo_entrega_proposta_licitacao',
  nrQuantidadeVencedorLicitacao: 'nr_quantidade_vencedor_licitacao',
  vlLicitacaoVencedorLicitacao: 'vl_licitacao_vencedor_licitacao',
  nrClassificacao: 'nr_classificacao',
  dtHomologacao: 'dt_homologacao',
  ultimoEnvioSIMAMNesteExercicio: 'ultimo_envio_simam_neste_exercicio',
  DataReferencia: 'data_referencia',
};

const COLS = Object.keys(ATTR_MAP).map(k => ATTR_MAP[k]);
const COL_NAMES = COLS.join(', ');
const COL_PLACEHOLDERS = COLS.map((_, i) => `$${i + 1}`).join(', ');

const NUMERIC_COLS = new Set([
  'nr_ano_licitacao', 'nr_lote', 'nr_item', 'nr_classificacao',
  'nr_prazo_limite_entrega', 'nr_quantidade', 'vl_minimo_unitario_item',
  'vl_minimo_total', 'vl_maximo_unitario_item', 'vl_maximo_total',
  'nr_quantidade_proposta_licitacao', 'vl_proposta_item',
  'nr_quantidade_vencedor_licitacao', 'vl_licitacao_vencedor_licitacao',
]);

function parseValue(colName, value) {
  if (value === null || value === undefined || value === '') return null;
  if (NUMERIC_COLS.has(colName)) {
    const num = parseFloat(value.replace(',', '.'));
    return isNaN(num) ? null : num;
  }
  return value.trim();
}

function processarXML(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = [];
  const tagRegex = /<LicitacaoVencedor\s+([\s\S]*?)(?:\/\s*>|<\/LicitacaoVencedor>)/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const attrsStr = match[1];
    const record = {};
    let i = 0;

    while (i < attrsStr.length) {
      while (i < attrsStr.length && /\s/.test(attrsStr[i])) i++;
      if (i >= attrsStr.length) break;

      const nameStart = i;
      while (i < attrsStr.length && /[\w]/.test(attrsStr[i])) i++;
      const attrName = attrsStr.substring(nameStart, i);
      if (!attrName) break;

      while (i < attrsStr.length && (attrsStr[i] === '=' || /\s/.test(attrsStr[i]))) i++;

      if (i < attrsStr.length && attrsStr[i] === '"') {
        i++;
        let value = '';
        while (i < attrsStr.length) {
          if (attrsStr[i] === '"') {
            const next = i + 1;
            if (next >= attrsStr.length || /[\s\/]/.test(attrsStr[next])) {
              i = next;
              break;
            }
          }
          value += attrsStr[i];
          i++;
        }
        const colName = ATTR_MAP[attrName];
        if (colName) record[colName] = parseValue(colName, value);
      } else {
        i++;
      }
    }

    if (Object.keys(record).length > 0) records.push(record);
  }

  return records;
}

async function main() {
  const pattern = process.argv[2];

  // Descobre XMLs
  let resolvedFiles = [];
  if (pattern) {
    if (pattern.includes('*')) {
      const parentDir = path.resolve(pattern).replace(/[\\/][^\\/]*$/, '') || '.';
      const prefix = path.basename(pattern).split('*')[0];
      resolvedFiles = fs.readdirSync(parentDir)
        .filter(f => f.endsWith('.xml') && f.startsWith(prefix))
        .map(f => path.join(parentDir, f));
    } else {
      resolvedFiles = [path.resolve(pattern)].filter(f => fs.existsSync(f));
    }
  }

  if (resolvedFiles.length === 0) {
    const parentDir = path.resolve(__dirname, '..', 'xml');
    if (fs.existsSync(parentDir)) {
      resolvedFiles = fs.readdirSync(parentDir)
        .filter(f => f.endsWith('.xml') && f.startsWith('2026_'))
        .map(f => path.join(parentDir, f));
    }
  }

  if (resolvedFiles.length === 0) {
    console.log('📂 Nenhum XML encontrado. Pulando importação.');
    return;
  }

  // Cria tabela de controle se não existir
  await run(`
    CREATE TABLE IF NOT EXISTS ${HASH_TABLE} (
      nome_arquivo TEXT PRIMARY KEY,
      hash_md5 TEXT NOT NULL,
      importado_em TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log(`📁 Encontrados ${resolvedFiles.length} arquivo(s) XML`);

  let importados = 0;
  let pulados = 0;

  for (const filePath of resolvedFiles) {
    const nomeArquivo = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const hash = require('crypto').createHash('md5').update(content).digest('hex');

    // Verifica se já foi importado
    const existente = await get(
      `SELECT hash_md5 FROM ${HASH_TABLE} WHERE nome_arquivo = $1`,
      [nomeArquivo]
    );

    if (existente && existente.hash_md5 === hash) {
      console.log(`  ⏭️  ${nomeArquivo}: já importado (hash igual)`);
      pulados++;
      continue;
    }

    const records = processarXML(filePath);
    if (records.length === 0) {
      console.log(`  ⚠️  ${nomeArquivo}: 0 registros encontrados`);
      continue;
    }

    // Importa em lote (INSERT ... ON CONFLICT DO NOTHING)
    const BATCH = 500;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const values = [];
      const params = [];
      let p = 1;

      for (const rec of batch) {
        const rowValues = COLS.map(col => rec[col] ?? null);
        const placeholders = rowValues.map(() => `$${p++}`).join(', ');
        values.push(`(${placeholders})`);
        params.push(...rowValues);
      }

      const sql = `INSERT INTO licitacoes (${COL_NAMES}) VALUES ${values.join(', ')} ON CONFLICT DO NOTHING`;
      await run(sql, params);
    }

    // Marca como importado
    await run(
      `INSERT INTO ${HASH_TABLE} (nome_arquivo, hash_md5) VALUES ($1, $2)
       ON CONFLICT (nome_arquivo) DO UPDATE SET hash_md5 = $2, importado_em = NOW()`,
      [nomeArquivo, hash]
    );

    console.log(`  ✅ ${nomeArquivo}: ${records.length} registros`);
    importados++;
  }

  // Estatísticas
  const stats = await get('SELECT COUNT(*) as total FROM licitacoes');
  console.log('');
  console.log(`✅ Importação concluída!`);
  console.log(`   Importados: ${importados} | Pulados: ${pulados}`);
  console.log(`   Total no banco: ${stats?.total || 0}`);

  await fechar();
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
