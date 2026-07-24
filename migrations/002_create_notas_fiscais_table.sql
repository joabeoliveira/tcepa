-- Migration: cria tabela de itens de notas fiscais eletrônicas (NF-e)
CREATE TABLE IF NOT EXISTS notas_fiscais_items (
  id SERIAL PRIMARY KEY,
  chave_acesso TEXT,
  numero_nf TEXT,
  serie TEXT,
  data_emissao DATE,
  cd_ibge VARCHAR(7),
  municipio TEXT,
  cnpj_emitente VARCHAR(20),
  cpf_emitente VARCHAR(14),
  descricao TEXT,
  quantidade NUMERIC(18,4),
  unidade TEXT,
  valor_unitario NUMERIC(18,4),
  valor_total NUMERIC(18,2),
  raw JSONB,
  data_referencia VARCHAR(10)
);

-- Índice trigram para busca por descrição
CREATE INDEX IF NOT EXISTS idx_notas_descricao_trgm ON notas_fiscais_items USING gin(descricao gin_trgm_ops);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_notas_cd_ibge ON notas_fiscais_items(cd_ibge);
CREATE INDEX IF NOT EXISTS idx_notas_cnpj ON notas_fiscais_items(cnpj_emitente);
