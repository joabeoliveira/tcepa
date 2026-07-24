#!/bin/sh
# Script de entrada do container
# Faz a importação dos XMLs se o banco não existir

set -e

echo "========================================"
echo " 🚀 Iniciando API de Pesquisa de Preços"
echo "========================================"

# Verifica se o banco já existe
if [ -f /app/data/pesquisa-precos.db ]; then
  echo "✅ Banco encontrado: /app/data/pesquisa-precos.db"
else
  echo "📦 Banco não encontrado. Iniciando importação dos XMLs..."

  # Verifica se existem arquivos XML
  XML_COUNT=$(ls /app/xml/2026_*.xml 2>/dev/null | wc -l)
  if [ "$XML_COUNT" -gt 0 ]; then
    echo "📁 Encontrados $XML_COUNT arquivos XML em /app/xml/"
    node /app/src/import-xml.js "/app/xml/2026_*.xml"
    echo "✅ Importação concluída!"
  else
    echo "⚠️  Nenhum arquivo XML encontrado em /app/xml/"
    echo "   A API iniciará com banco vazio."
  fi
fi

echo ""
echo "========================================"
echo " ✅ Inicialização concluída!"
echo "========================================"
echo ""

# Inicia a aplicação
exec node /app/src/index.js
