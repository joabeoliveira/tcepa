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

# Copia arquivos XML (para importação automática)
COPY 2026_*.xml ./xml/

# Expõe porta da API
EXPOSE 3000

# Script de inicialização: sobe PostgreSQL, importa dados, inicia API
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
PGDATA=/var/lib/postgresql/data\n\
\n\
# Inicializa PostgreSQL se necessário\n\
if [ ! -d "$PGDATA/pgdata" ]; then\n\
  echo "🐘 Inicializando PostgreSQL..."\n\
  mkdir -p $PGDATA\n\
  chown -R postgres:postgres $PGDATA\n\
  su - postgres -c "initdb -D $PGDATA/pgdata"\n\
  echo "host all all 0.0.0.0/0 md5" >> $PGDATA/pgdata/pg_hba.conf\n\
  echo "listen_addresses='*'" >> $PGDATA/pgdata/postgresql.conf\n\
fi\n\
\n\
# Inicia PostgreSQL\n\
su - postgres -c "pg_ctl -D $PGDATA/pgdata -l /var/log/pg.log start"\n\
\n\
# Aguarda PostgreSQL ficar pronto\n\
until pg_isready -h 127.0.0.1 2>/dev/null; do sleep 1; done\n\
echo "✅ PostgreSQL pronto!"\n\
\n\
# Cria database e usuário se não existir\n\
su - postgres -c "psql -c \\"CREATE DATABASE tcepa;\\"" 2>/dev/null || true\n\
su - postgres -c "psql -c \\"CREATE USER tcepa WITH PASSWORD '"'"'${DB_PASSWORD:-tcepa123}'"'"';\\"" 2>/dev/null || true\n\
su - postgres -c "psql -c \\"GRANT ALL PRIVILEGES ON DATABASE tcepa TO tcepa;\\"" 2>/dev/null || true\n\
\n\
# Executa schema\n\
su - postgres -c "psql -d tcepa -f /app/init.sql" 2>/dev/null || true\n\
\n\
# Importa dados (se banco vazio)\n\
echo "📦 Verificando dados..."\n\
HAS_DATA=$(su - postgres -c "psql -d tcepa -t -c \\"SELECT COUNT(*) FROM licitacoes;\\"" 2>/dev/null | tr -d " " || echo "0")\n\
if [ "$HAS_DATA" = "0" ] || [ -z "$HAS_DATA" ]; then\n\
  echo "📦 Importando XMLs..."\n\
  ls /app/xml/2026_*.xml 2>/dev/null && node /app/src/import-xml-pg.js "/app/xml/2026_*.xml" || echo "⚠️  Nenhum XML encontrado"\n\
fi\n\
\n\
# Inicia a API\n\
echo "🚀 Iniciando API..."\n\
exec node /app/src/index-pg.js\n\
' > /app/start-pg.sh && chmod +x /app/start-pg.sh

CMD ["sh", "/app/start-pg.sh"]
