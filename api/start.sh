#!/bin/sh
# Script de entrada do container
# Importação incremental com persistência de dados

set -e

echo "========================================"
echo " 🚀 Iniciando API de Pesquisa de Preços"
echo "========================================"

DB_FILE="/app/data/pesquisa-precos.db"
XML_DIR="/app/xml"
HASH_FILE="/app/data/.imported_hashes.txt"

# Cria diretório data se não existir
mkdir -p /app/data

importar_se_necessario() {
  echo "📦 Verificando XMLs para importar..."

  # Carrega hashes já importados
  > /tmp/novos_hashes.txt
  NOVOS_ARQUIVOS=0

  for xml in "$XML_DIR"/2026_*.xml; do
    [ -f "$xml" ] || continue
    HASH=$(md5sum "$xml" | cut -d' ' -f1)
    echo "$HASH" >> /tmp/novos_hashes.txt

    # Verifica se já foi importado
    if [ -f "$HASH_FILE" ] && grep -q "$HASH" "$HASH_FILE" 2>/dev/null; then
      continue  # Já importado, pula
    fi

    NOVOS_ARQUIVOS=$((NOVOS_ARQUIVOS + 1))
  done

  if [ "$NOVOS_ARQUIVOS" -eq 0 ] && [ -f "$DB_FILE" ]; then
    echo "✅ Nenhum XML novo. Banco atualizado."
    return
  fi

  if [ ! -f "$DB_FILE" ]; then
    echo "📦 Banco não encontrado. Importando todos os XMLs..."
    node /app/src/import-xml.js "$XML_DIR/2026_*.xml"
  elif [ "$NOVOS_ARQUIVOS" -gt 0 ]; then
    echo "📦 $NOVOS_ARQUIVOS novo(s) XML(s) detectado(s). Importando..."
    node /app/src/import-xml.js "$XML_DIR/2026_*.xml"
  fi

  # Atualiza lista de hashes
  cp /tmp/novos_hashes.txt "$HASH_FILE"
  echo "✅ Importação concluída!"
}

importar_se_necessario

echo ""
echo "========================================"
echo " ✅ Inicialização concluída!"
echo "========================================"
echo ""

# Inicia a aplicação
exec node /app/src/index.js
