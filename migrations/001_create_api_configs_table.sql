-- Exemplo de migration: cria uma tabela de configurações por API
CREATE TABLE IF NOT EXISTS api_configs (
  id SERIAL PRIMARY KEY,
  api_name TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_api_configs_api_key ON api_configs(api_name, config_key);
