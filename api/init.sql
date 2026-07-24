-- Schema inicial do PostgreSQL para a API de Pesquisa de Preços
-- Criação automática via docker-entrypoint-initdb.d

-- Habilita extensão para busca textual com similaridade (LIKE otimizado)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS licitacoes (
    id                SERIAL PRIMARY KEY,
    cd_ibge           VARCHAR(7) NOT NULL,
    nm_municipio      VARCHAR(100) NOT NULL,
    id_pessoa         VARCHAR(20) NOT NULL,
    nm_entidade       VARCHAR(200) NOT NULL,
    id_licitacao      VARCHAR(20) NOT NULL,
    nr_ano_licitacao  INTEGER NOT NULL,
    nr_licitacao      VARCHAR(20),
    ds_modalidade_licitacao VARCHAR(100),
    nm_pessoa         VARCHAR(200),
    nr_documento      VARCHAR(18),
    nr_lote           INTEGER,
    nr_item           INTEGER,
    nr_quantidade     DECIMAL(18,4),
    id_unidade_medida VARCHAR(10),
    ds_unidade_medida VARCHAR(50),
    vl_minimo_unitario_item DECIMAL(18,4),
    vl_minimo_total   DECIMAL(18,2),
    vl_maximo_unitario_item DECIMAL(18,4),
    vl_maximo_total   DECIMAL(18,2),
    ds_item           TEXT,
    ds_forma_pagamento VARCHAR(200),
    nr_prazo_limite_entrega INTEGER,
    id_tipo_entrega_produto VARCHAR(10),
    ds_tipo_entrega_produto VARCHAR(100),
    nr_quantidade_proposta_licitacao DECIMAL(18,4),
    vl_proposta_item  DECIMAL(18,2),
    dt_validade_proposta DATE,
    dt_prazo_entrega_proposta_licitacao DATE,
    nr_quantidade_vencedor_licitacao DECIMAL(18,4),
    vl_licitacao_vencedor_licitacao DECIMAL(18,2),
    nr_classificacao  INTEGER,
    dt_homologacao    DATE,
    ultimo_envio_simam_neste_exercicio VARCHAR(10),
    data_referencia   VARCHAR(10)
);

-- Índices para busca textual
CREATE INDEX IF NOT EXISTS idx_licitacoes_municipio ON licitacoes(cd_ibge, nm_municipio);
CREATE INDEX IF NOT EXISTS idx_licitacoes_modalidade ON licitacoes(ds_modalidade_licitacao);
CREATE INDEX IF NOT EXISTS idx_licitacoes_ano ON licitacoes(nr_ano_licitacao);
CREATE INDEX IF NOT EXISTS idx_licitacoes_documento ON licitacoes(nr_documento);
CREATE INDEX IF NOT EXISTS idx_licitacoes_item_trgm ON licitacoes USING gin(ds_item gin_trgm_ops);
