#!/bin/sh

PGDATA=/var/lib/postgresql/data
DB_PASSWORD="${DB_PASSWORD:-tcepa123}"

echo "=== Inicializando container ==="

# Inicializa PostgreSQL se necessario
if [ ! -d "$PGDATA/pgdata" ]; then
  echo "[1/6] Inicializando PostgreSQL..."
  mkdir -p "$PGDATA"
  chown -R postgres:postgres "$PGDATA"
  su postgres -c "initdb -D $PGDATA/pgdata" || { echo "ERRO: initdb falhou"; exit 1; }
  echo "host all all 0.0.0.0/0 md5" >> "$PGDATA/pgdata/pg_hba.conf"
  echo "listen_addresses='*'" >> "$PGDATA/pgdata/postgresql.conf"
else
  echo "[1/6] PostgreSQL ja inicializado"
fi

echo "[2/6] Iniciando servico PostgreSQL..."
# Cria diretorio para o socket/lock do PostgreSQL
mkdir -p /run/postgresql
chown postgres:postgres /run/postgresql
# Remove pid file stale se houver (restart do container)
rm -f "$PGDATA/pgdata/postmaster.pid" 2>/dev/null || true
su postgres -c "pg_ctl -D $PGDATA/pgdata -l $PGDATA/pg.log start" || { echo "ERRO: pg_ctl falhou"; cat "$PGDATA/pg.log" 2>/dev/null; exit 1; }

echo "[3/6] Aguardando PostgreSQL..."
for i in $(seq 1 30); do
  pg_isready -h 127.0.0.1 >/dev/null 2>&1 && break
  sleep 1
done
pg_isready -h 127.0.0.1 || { echo "ERRO: PostgreSQL nao iniciou a tempo"; exit 1; }
echo "PostgreSQL pronto!"

echo "[4/6] Configurando database..."
su postgres -c "psql -c \"CREATE DATABASE tcepa;\"" 2>/dev/null || true
su postgres -c "psql -c \"CREATE USER tcepa WITH PASSWORD '$DB_PASSWORD';\"" 2>/dev/null || true
su postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE tcepa TO tcepa;\"" 2>/dev/null || true
su postgres -c "psql -d tcepa -c \"GRANT ALL ON SCHEMA public TO tcepa;\"" 2>/dev/null || true

# Schema e tabelas - executado como tcepa para ownership correto
PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -U tcepa -d tcepa -f /app/init.sql 2>/dev/null || true

# Corrige ownership se a tabela ja existia (volume com dados antigos)
su postgres -c "psql -d tcepa -c \"ALTER TABLE IF EXISTS licitacoes OWNER TO tcepa;\"" 2>/dev/null || true
su postgres -c "psql -d tcepa -c \"ALTER TABLE IF EXISTS xml_importados OWNER TO tcepa;\"" 2>/dev/null || true

echo "[5/6] Verificando dados..."
HAS_DATA=$(su postgres -c "psql -d tcepa -t -c \"SELECT COUNT(*) FROM licitacoes;\"" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$HAS_DATA" = "0" ] || [ -z "$HAS_DATA" ]; then
  echo "Importando XMLs..."
  ls /app/xml/2026_*.xml 2>/dev/null && node /app/src/import-xml-pg.js "/app/xml/2026_*.xml" || echo "Nenhum XML encontrado"
else
  echo "Banco ja possui $HAS_DATA registros"
fi

echo "[6/6] Iniciando API..."
echo "=== Container pronto! ==="
exec node /app/src/index-pg.js
