FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala dependências de produção (sql.js é WASM, não precisa de compilação nativa)
RUN npm ci --omit=dev

# Copia o código fonte
COPY src/ ./src/

# Cria diretório para o banco de dados
RUN mkdir -p /app/data && chown -R node:node /app/data

# Usuário não-root para segurança
USER node

# Expõe a porta da API
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Comando de inicialização
CMD ["node", "src/index.js"]
