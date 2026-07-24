/**
 * Script de diagnóstico para testar a API diretamente
 * Uso: node src/test-api.js
 */
const path = require('path');

// Simula o que a API faz
async function main() {
  console.log('=== DIAGNÓSTICO DA API ===\n');

  // 1. Testar carregamento do módulo database
  console.log('1. Carregando database.js...');
  const { getDatabase, exec } = require('./database');
  console.log('   ✅ Módulo carregado\n');

  // 2. Inicializar banco
  console.log('2. Inicializando banco...');
  await getDatabase();
  console.log('   ✅ Banco inicializado\n');

  // 3. Testar query direta
  console.log('3. Testando SELECT COUNT(*)...');
  const countResult = exec('SELECT COUNT(*) as total FROM licitacoes');
  console.log('   Resultado:', JSON.stringify(countResult));
  console.log('');

  // 4. Testar busca LIKE
  console.log('4. Testando busca LIKE...');
  const searchResult = exec(
    "SELECT ds_item FROM licitacoes WHERE ds_item LIKE ? LIMIT 2",
    ["%MOTOBOMBA%"]
  );
  console.log('   Resultados:', JSON.stringify(searchResult, null, 2));
  console.log('');

  // 5. Testar busca com múltiplos params
  console.log('5. Testando busca com LIMIT...');
  const multiResult = exec(
    "SELECT ds_item, vl_licitacao_vencedor_licitacao FROM licitacoes WHERE ds_item LIKE ? ORDER BY vl_licitacao_vencedor_licitacao ASC LIMIT ? OFFSET ?",
    ["%MOTOBOMBA%", 3, 0]
  );
  console.log('   Resultados:', JSON.stringify(multiResult, null, 2));

  console.log('\n=== FIM DO DIAGNÓSTICO ===');
}

main().catch(e => {
  console.error('ERRO:', e);
  process.exit(1);
});
