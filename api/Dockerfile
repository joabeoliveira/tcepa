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

# Copia os arquivos XML de licitação para dentro do container
COPY 2026_*.xml ./xml/

# Cria diretório para o banco de dados
RUN mkdir -p /app/data && chown -R node:node /app/data /app/xml

# Usuário não-root para segurança
USER node

# Expõe a porta da API
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Comando de inicialização
CMD ["node", "src/index.js"]
