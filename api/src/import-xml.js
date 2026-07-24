/**
 * Script de importação dos XMLs do TCE/PR para o SQLite
 *
 * Uso:
 *   node src/import-xml.js
 *   node src/import-xml.js "../2026_*.xml"          # padrão personalizado
 *   node src/import-xml.js "../2026_410010_LicitacaoVencedor.xml"   # arquivo específico
 */

const fs = require('fs');
const path = require('path');
const { getDatabase, runBatch } = require('./database');

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

// Colunas numéricas (precisam de parse)
const NUMERIC_COLS = new Set([
  'nr_ano_licitacao', 'nr_lote', 'nr_item', 'nr_classificacao',
  'nr_prazo_limite_entrega', 'nr_quantidade', 'vl_minimo_unitario_item',
  'vl_minimo_total', 'vl_maximo_unitario_item', 'vl_maximo_total',
  'nr_quantidade_proposta_licitacao', 'vl_proposta_item',
  'nr_quantidade_vencedor_licitacao', 'vl_licitacao_vencedor_licitacao',
]);

/**
 * Converte valor do atributo para o tipo adequado
 */
function parseValue(colName, value) {
  if (value === null || value === undefined || value === '') return null;
  if (NUMERIC_COLS.has(colName)) {
    const num = parseFloat(value.replace(',', '.'));
    return isNaN(num) ? null : num;
  }
  return value.trim();
}

/**
 * Processa um arquivo XML e retorna os registros
 * Observação: alguns XMLs do TCE têm aspas literais dentro dos atributos (ex: dsItem="... POÇO 8", EDUTOR...").
 * Usamos um parser mais robusto para contornar isso.
 */
function processarXML(filePath) {
  console.log(`  Lendo: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf-8');

  const records = [];

  // Encontra cada tag LicitacaoVencedor (pode ser fechada com /> ou com </LicitacaoVencedor>)
  const tagRegex = /<LicitacaoVencedor\s+([\s\S]*?)(?:\/\s*>|<\/LicitacaoVencedor>)/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const attrsStr = match[1];
    const record = {};

    // Parser de atributos que lida com aspas literais dentro do valor:
    // Procura por pattern: nome="..." onde o valor pode conter " literais
    let i = 0;
    while (i < attrsStr.length) {
      // Pula espaços
      while (i < attrsStr.length && /\s/.test(attrsStr[i])) i++;
      if (i >= attrsStr.length) break;

      // Lê o nome do atributo
      const nameStart = i;
      while (i < attrsStr.length && /[\w]/.test(attrsStr[i])) i++;
      const attrName = attrsStr.substring(nameStart, i);

      if (!attrName) break;

      // Pula espaços e =
      while (i < attrsStr.length && (attrsStr[i] === '=' || /\s/.test(attrsStr[i]))) i++;

      // Deve começar com "
      if (i < attrsStr.length && attrsStr[i] === '"') {
        i++; // Pula a abertura
        let value = '';
        // Lê até a próxima " que não seja seguida por caractere de atributo
        // Simplificando: procura por " seguido de espaço ou fim
        while (i < attrsStr.length) {
          if (attrsStr[i] === '"') {
            // Verifica se a aspa termina o valor (próximo char é espaço, /, ou fim)
            const next = i + 1;
            if (next >= attrsStr.length || /[\s\/]/.test(attrsStr[next])) {
              i = next; // Pula a aspa
              break;
            }
          }
          value += attrsStr[i];
          i++;
        }

        const colName = ATTR_MAP[attrName];
        if (colName) {
          record[colName] = parseValue(colName, value);
        }
      } else {
        i++; // Pula caractere inesperado
      }
    }

    if (Object.keys(record).length > 0) {
      records.push(record);
    }
  }

  return records;
}

/**
 * Insere registros no banco SQLite em lote (salva 1x a cada 500 registros)
 */
function inserirLote(records) {
  if (records.length === 0) return;

  const placeholders = COLS.map(() => '?').join(', ');
  const sql = `INSERT OR IGNORE INTO licitacoes (${COLS.join(', ')}) VALUES (${placeholders})`;

  const BATCH = 500;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const queries = [];

    for (const rec of batch) {
      const values = COLS.map(col => rec[col] ?? null);
      queries.push([sql, values]);
    }

    try {
      runBatch(queries);
    } catch (err) {
      // Se der erro, tenta um por um para identificar
      for (const rec of batch) {
        const values = COLS.map(col => rec[col] ?? null);
        try {
          runBatch([[sql, values]]);
        } catch (e) {
          if (!e.message.includes('UNIQUE')) {
            console.error(`  Erro ao inserir: ${e.message}`);
          }
        }
      }
    }
  }
}

/**
 * Função principal
 */
async function main() {
  const pattern = process.argv[2];

  // Descobre os arquivos XML
  let resolvedFiles = [];

  if (pattern) {
    // Pattern específico fornecido como argumento
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

  // Fallback: procura no diretório pai
  if (resolvedFiles.length === 0) {
    const parentDir = path.resolve(__dirname, '..');
    if (fs.existsSync(parentDir)) {
      resolvedFiles = fs.readdirSync(parentDir)
        .filter(f => f.endsWith('.xml') && f.startsWith('2026_'))
        .map(f => path.join(parentDir, f));
    }
  }

  if (resolvedFiles.length === 0) {
    console.error('Nenhum arquivo XML encontrado!');
    console.error('Uso: node src/import-xml.js "../2026_*.xml"');
    process.exit(1);
  }

  console.log(`📁 Encontrados ${resolvedFiles.length} arquivo(s) XML`);
  console.log('');

  await getDatabase();

  let totalRegistros = 0;
  let totalArquivos = 0;

  for (const filePath of resolvedFiles) {
    try {
      const records = processarXML(filePath);
      if (records.length > 0) {
        inserirLote(records);
        totalRegistros += records.length;
        totalArquivos++;
        console.log(`  ✅ ${path.basename(filePath)}: ${records.length} registros`);
      }
    } catch (err) {
      console.error(`  ❌ ${path.basename(filePath)}: ${err.message}`);
    }
  }

  console.log('');
  console.log(`✅ Importação concluída!`);
  console.log(`   Arquivos processados: ${totalArquivos}`);
  console.log(`   Total de registros:   ${totalRegistros}`);

  // Estatísticas
  const { get } = require('./database');
  const stats = get(`
    SELECT COUNT(*) as total, COUNT(DISTINCT cd_ibge) as municipios,
           MIN(nr_ano_licitacao) as ano_min, MAX(nr_ano_licitacao) as ano_max
    FROM licitacoes
  `);
  if (stats) {
    console.log(`   Municípios:           ${stats.municipios}`);
    console.log(`   Período:              ${stats.ano_min} - ${stats.ano_max}`);
  }
}

main().catch(console.error);
