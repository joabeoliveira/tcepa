FROM node:20-alpine

WORKDIR /app

# As COPY são relativas ao build context (raiz do repositório)
# O Dockerfile está em api/, mas o EasyPanel usa a raiz como contexto

# Copia os arquivos de dependências da pasta api/
COPY api/package*.json ./

# Instala dependências de produção (sql.js é WASM, não precisa de compilação nativa)
RUN npm install --omit=dev
# Copia o código fonte da pasta api/src/
COPY api/src/ ./src/

# Copia o script de inicialização
COPY api/start.sh ./start.sh

# Copia os arquivos XML de licitação para dentro do container
COPY 2026_*.xml ./xml/

# Cria diretório para o banco de dados e dá permissão
RUN mkdir -p /app/data && chmod +x /app/start.sh && chown -R node:node /app/data /app/xml /app/start.sh

# Usuário não-root para segurança
USER node

# Expõe a porta da API
EXPOSE 3000

# Volume para persistência do banco de dados
# No EasyPanel, monte um volume persistente em /app/data
VOLUME ["/app/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Script de entrada: importa XMLs se necessário, depois inicia a API
CMD ["sh", "/app/start.sh"]
