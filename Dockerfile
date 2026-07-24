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

# Script de inicialização (usando heredoc para evitar problemas de escape)
RUN cat > /app/start-pg.sh << 'SCRIPT'
#!/bin/sh
set -e

PGDATA=/var/lib/postgresql/data

# Inicializa PostgreSQL se necessario
if [ ! -d "$PGDATA/pgdata" ]; then
  echo "Inicializando PostgreSQL..."
  mkdir -p "$PGDATA"
  chown -R postgres:postgres "$PGDATA"
  su - postgres -c "initdb -D $PGDATA/pgdata"
  echo "host all all 0.0.0.0/0 md5" >> "$PGDATA/pgdata/pg_hba.conf"
  echo "listen_addresses='*'" >> "$PGDATA/pgdata/postgresql.conf"
fi

# Inicia PostgreSQL
su - postgres -c "pg_ctl -D $PGDATA/pgdata -l /var/log/pg.log start"

# Aguarda PostgreSQL ficar pronto
until pg_isready -h 127.0.0.1 2>/dev/null; do sleep 1; done
echo "PostgreSQL pronto!"

# Cria database e usuario se nao existir
su - postgres -c "psql -c \"CREATE DATABASE tcepa;\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE USER tcepa WITH PASSWORD '${DB_PASSWORD:-tcepa123}';\"" 2>/dev/null || true
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE tcepa TO tcepa;\"" 2>/dev/null || true

# Executa schema
su - postgres -c "psql -d tcepa -f /app/init.sql" 2>/dev/null || true

# Importa dados (se banco vazio)
echo "Verificando dados..."
HAS_DATA=$(su - postgres -c "psql -d tcepa -t -c \"SELECT COUNT(*) FROM licitacoes;\"" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$HAS_DATA" = "0" ] || [ -z "$HAS_DATA" ]; then
  echo "Importando XMLs..."
  ls /app/xml/2026_*.xml 2>/dev/null && node /app/src/import-xml-pg.js "/app/xml/2026_*.xml" || echo "Nenhum XML encontrado"
fi

# Inicia a API
echo "Iniciando API..."
exec node /app/src/index-pg.js
SCRIPT
RUN chmod +x /app/start-pg.sh

CMD ["sh", "/app/start-pg.sh"]
