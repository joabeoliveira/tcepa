FROM node:20-alpine

WORKDIR /app

# =============================================
# Instala PostgreSQL no mesmo container
# =============================================
RUN apk add --no-cache postgresql postgresql-client

# Copia dependências Node e instala
COPY api/package*.json ./
RUN npm install --omit=dev

# Copia código fonte
COPY api/src/ ./src/

# Copia schema SQL e código
COPY api/init.sql ./init.sql

# Copia script de inicialização do PostgreSQL
COPY api/start-pg.sh ./start-pg.sh

# Copia arquivos XML (para importação automática)
COPY 2026_*.xml ./xml/

# Expõe porta da API
EXPOSE 3000

# Script de entrada
CMD ["sh", "/app/start-pg.sh"]

CMD ["sh", "/app/start-pg.sh"]
