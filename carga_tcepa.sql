-- ============================================================
-- Script: carga_tcepa.sql
-- Descrição: Criação da tabela tcepa para dados do TCE/PR
-- Projeto: Pesquisa de Preços Algorise/Cotegov
-- Cloud SQL: MySQL (projeto algorise-db)
-- Fonte: XML do TCE (Tribunal de Contas do Estado)
-- ============================================================

-- DROP TABLE IF EXISTS tcepa;

CREATE TABLE IF NOT EXISTS tcepa (
    -- Identificação do município/entidade
    cd_ibge             VARCHAR(7)      NOT NULL COMMENT 'Código IBGE do município',
    nm_municipio        VARCHAR(100)    NOT NULL COMMENT 'Nome do município',
    id_pessoa           VARCHAR(20)     NOT NULL COMMENT 'ID da entidade',
    nm_entidade         VARCHAR(200)    NOT NULL COMMENT 'Nome da entidade (órgão público)',

    -- Identificação da licitação
    id_licitacao        VARCHAR(20)     NOT NULL COMMENT 'ID da licitação',
    nr_ano_licitacao    INT             NOT NULL COMMENT 'Ano da licitação',
    nr_licitacao        VARCHAR(20)     DEFAULT NULL COMMENT 'Número da licitação',
    ds_modalidade_licitacao VARCHAR(100) DEFAULT NULL COMMENT 'Modalidade (Pregão, Dispensa, Inexigibilidade...)',

    -- Identificação do licitante/vencedor
    nm_pessoa           VARCHAR(200)    DEFAULT NULL COMMENT 'Nome do licitante/vencedor',
    nr_documento        VARCHAR(18)     DEFAULT NULL COMMENT 'CPF/CNPJ do licitante',

    -- Lote / Item
    nr_lote             INT             DEFAULT NULL COMMENT 'Número do lote',
    nr_item             INT             DEFAULT NULL COMMENT 'Número do item',
    nr_quantidade       DECIMAL(18,4)   DEFAULT NULL COMMENT 'Quantidade',
    id_unidade_medida   VARCHAR(10)     DEFAULT NULL COMMENT 'ID da unidade de medida',
    ds_unidade_medida   VARCHAR(50)     DEFAULT NULL COMMENT 'Descrição da unidade de medida',

    -- Valores de referência (mínimo/máximo)
    vl_minimo_unitario_item DECIMAL(18,4) DEFAULT NULL COMMENT 'Valor mínimo unitário do item',
    vl_minimo_total     DECIMAL(18,2)   DEFAULT NULL COMMENT 'Valor mínimo total',
    vl_maximo_unitario_item DECIMAL(18,4) DEFAULT NULL COMMENT 'Valor máximo unitário do item',
    vl_maximo_total     DECIMAL(18,2)   DEFAULT NULL COMMENT 'Valor máximo total',

    -- Descrição do item
    ds_item             TEXT            DEFAULT NULL COMMENT 'Descrição do item',

    -- Condições de pagamento e entrega
    ds_forma_pagamento  VARCHAR(200)    DEFAULT NULL COMMENT 'Forma de pagamento',
    nr_prazo_limite_entrega INT         DEFAULT NULL COMMENT 'Prazo limite de entrega (dias)',
    id_tipo_entrega_produto VARCHAR(10) DEFAULT NULL COMMENT 'ID do tipo de entrega',
    ds_tipo_entrega_produto VARCHAR(100) DEFAULT NULL COMMENT 'Descrição do tipo de entrega',

    -- Proposta
    nr_quantidade_proposta_licitacao DECIMAL(18,4) DEFAULT NULL COMMENT 'Quantidade proposta',
    vl_proposta_item    DECIMAL(18,2)   DEFAULT NULL COMMENT 'Valor da proposta por item',
    dt_validade_proposta DATE           DEFAULT NULL COMMENT 'Data de validade da proposta',
    dt_prazo_entrega_proposta_licitacao DATE DEFAULT NULL COMMENT 'Data do prazo de entrega da proposta',

    -- Dados do vencedor
    nr_quantidade_vencedor_licitacao DECIMAL(18,4) DEFAULT NULL COMMENT 'Quantidade vencedora',
    vl_licitacao_vencedor_licitacao DECIMAL(18,2)  DEFAULT NULL COMMENT 'Valor da licitação vencedora',
    nr_classificacao    INT             DEFAULT NULL COMMENT 'Classificação do licitante',
    dt_homologacao      DATE            DEFAULT NULL COMMENT 'Data de homologação',

    -- Metadados do SIM-AM / TCE
    ultimo_envio_simam_neste_exercicio VARCHAR(10) DEFAULT NULL COMMENT 'Último envio SIM-AM no exercício',
    data_referencia     VARCHAR(10)     DEFAULT NULL COMMENT 'Mês/ano de referência dos dados',

    -- Chave primária composta
    PRIMARY KEY (id_licitacao, nr_lote, nr_item, nr_documento, id_pessoa),

    -- Índices para consultas comuns
    INDEX idx_municipio (cd_ibge, nm_municipio),
    INDEX idx_modalidade (ds_modalidade_licitacao),
    INDEX idx_ano (nr_ano_licitacao),
    INDEX idx_documento (nr_documento),
    INDEX idx_item (ds_item(100)),
    INDEX idx_data_homologacao (dt_homologacao),
    INDEX idx_data_referencia (data_referencia)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Dados de licitações do TCE para pesquisa de preços Algorise/Cotegov';

-- ============================================================
-- Verificação após carga
-- ============================================================
-- SELECT COUNT(*) AS total_registros FROM tcepa;
-- SELECT cd_ibge, nm_municipio, COUNT(*) FROM tcepa GROUP BY cd_ibge, nm_municipio;
-- SELECT ds_modalidade_licitacao, COUNT(*) FROM tcepa GROUP BY ds_modalidade_licitacao;
-- SELECT MIN(dt_homologacao) AS data_inicial, MAX(dt_homologacao) AS data_final FROM tcepa;
