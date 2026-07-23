#!/usr/bin/env python3
"""
Script: carga_tcepa.py
Descrição: Importa dados de licitações do TCE (XML) para o Cloud SQL MySQL.
Projeto:  Pesquisa de Preços Algorise/Cotegov
Database: MySQL em Google Cloud SQL (projeto: algorise-db)
Fonte:    XML do TCE com elementos <LicitacaoVencedor>

Uso:
    python carga_tcepa.py "2026_*.xml"
    python carga_tcepa.py 2026_410010_LicitacaoVencedor.xml 2026_410020_LicitacaoVencedor.xml

Configuração (.env ou variáveis de ambiente):
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=seu_usuario
    DB_PASSWORD=sua_senha
    DB_NAME=nome_do_banco
"""

import glob
import os
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import pymysql
except ImportError:
    print("Erro: pymysql não instalado. Execute: pip install pymysql python-dotenv")
    sys.exit(1)


# ============================================================
# Configurações de conexão (via variáveis de ambiente)
# ============================================================
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "charset": "utf8mb4",
}


# ============================================================
# Mapeamento de atributos do XML -> colunas SQL
# ============================================================
ATTR_MAP = {
    "cdIBGE":                           "cd_ibge",
    "nmMunicipio":                      "nm_municipio",
    "idPessoa":                         "id_pessoa",
    "nmEntidade":                       "nm_entidade",
    "idlicitacao":                      "id_licitacao",
    "nrAnoLicitacao":                   "nr_ano_licitacao",
    "nrLicitacao":                      "nr_licitacao",
    "dsModalidadeLicitacao":            "ds_modalidade_licitacao",
    "nmPessoa":                         "nm_pessoa",
    "nrDocumento":                      "nr_documento",
    "nrLote":                           "nr_lote",
    "nrItem":                           "nr_item",
    "nrQuantidade":                     "nr_quantidade",
    "idUnidadeMedida":                  "id_unidade_medida",
    "dsUnidadeMedida":                  "ds_unidade_medida",
    "vlMinimoUnitarioItem":             "vl_minimo_unitario_item",
    "vlMinimoTotal":                    "vl_minimo_total",
    "vlMaximoUnitarioitem":             "vl_maximo_unitario_item",
    "vlMaximoTotal":                    "vl_maximo_total",
    "dsItem":                           "ds_item",
    "dsFormaPagamento":                 "ds_forma_pagamento",
    "nrPrazoLimiteEntrega":             "nr_prazo_limite_entrega",
    "idTipoEntregaProduto":             "id_tipo_entrega_produto",
    "dsTipoEntregaProduto":             "ds_tipo_entrega_produto",
    "nrQuantidadePropostaLicitacao":    "nr_quantidade_proposta_licitacao",
    "vlPropostaItem":                   "vl_proposta_item",
    "dtValidadeProposta":               "dt_validade_proposta",
    "dtPrazoEntregaPropostaLicitacao":  "dt_prazo_entrega_proposta_licitacao",
    "nrQuantidadeVencedorLicitacao":    "nr_quantidade_vencedor_licitacao",
    "vlLicitacaoVencedorLicitacao":     "vl_licitacao_vencedor_licitacao",
    "nrClassificacao":                  "nr_classificacao",
    "dtHomologacao":                    "dt_homologacao",
    "ultimoEnvioSIMAMNesteExercicio":   "ultimo_envio_simam_neste_exercicio",
    "DataReferencia":                   "data_referencia",
}

# Colunas que são do tipo numérico (DECIMAL)
DECIMAL_COLS = {
    "nr_quantidade", "vl_minimo_unitario_item", "vl_minimo_total",
    "vl_maximo_unitario_item", "vl_maximo_total",
    "nr_quantidade_proposta_licitacao", "vl_proposta_item",
    "nr_quantidade_vencedor_licitacao", "vl_licitacao_vencedor_licitacao",
}

# Colunas que são do tipo inteiro
INT_COLS = {
    "nr_ano_licitacao", "nr_lote", "nr_item", "nr_prazo_limite_entrega",
    "nr_classificacao",
}

# Colunas que são do tipo DATE
DATE_COLS = {
    "dt_validade_proposta", "dt_prazo_entrega_proposta_licitacao",
    "dt_homologacao",
}


def parse_date(value):
    """Converte string de data ISO para objeto date."""
    if not value or value.strip() == "":
        return None
    try:
        return datetime.strptime(value.strip()[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def parse_decimal(value):
    """Converte string numérica para Decimal."""
    if not value or value.strip() == "":
        return None
    try:
        return Decimal(value.strip())
    except (ValueError, TypeError):
        return None


def parse_int(value):
    """Converte string para inteiro."""
    if not value or value.strip() == "":
        return None
    try:
        return int(float(value.strip()))
    except (ValueError, TypeError):
        return None


def parse_xml(filepath):
    """
    Lê o arquivo XML e extrai todos os elementos <LicitacaoVencedor>.
    Retorna uma lista de dicionários com as colunas mapeadas.
    """
    print(f"[INFO] Lendo arquivo XML: {filepath}")
    tree = ET.parse(filepath)
    root = tree.getroot()

    registros = []
    total_elementos = len(root.findall("LicitacaoVencedor"))

    print(f"[INFO] Total de elementos <LicitacaoVencedor> encontrados: {total_elementos}")

    for i, elem in enumerate(root.findall("LicitacaoVencedor"), start=1):
        if i % 1000 == 0:
            print(f"[INFO] Processando registro {i}/{total_elementos}...")

        row = {}
        for attr_xml, col_name in ATTR_MAP.items():
            raw_value = elem.get(attr_xml, "").strip()

            if col_name in DATE_COLS:
                row[col_name] = parse_date(raw_value)
            elif col_name in DECIMAL_COLS:
                row[col_name] = parse_decimal(raw_value)
            elif col_name in INT_COLS:
                row[col_name] = parse_int(raw_value)
            else:
                row[col_name] = raw_value if raw_value else None

        registros.append(row)

    print(f"[INFO] Total de registros processados: {len(registros)}")
    return registros


def create_table_if_not_exists(conn):
    """Cria a tabela tcepa se ela não existir."""
    sql = """
    CREATE TABLE IF NOT EXISTS tcepa (
        cd_ibge                           VARCHAR(7)      NOT NULL,
        nm_municipio                      VARCHAR(100)    NOT NULL,
        id_pessoa                         VARCHAR(20)     NOT NULL,
        nm_entidade                       VARCHAR(200)    NOT NULL,
        id_licitacao                      VARCHAR(20)     NOT NULL,
        nr_ano_licitacao                  INT             NOT NULL,
        nr_licitacao                      VARCHAR(20)     DEFAULT NULL,
        ds_modalidade_licitacao           VARCHAR(100)    DEFAULT NULL,
        nm_pessoa                         VARCHAR(200)    DEFAULT NULL,
        nr_documento                      VARCHAR(18)     DEFAULT NULL,
        nr_lote                           INT             DEFAULT NULL,
        nr_item                           INT             DEFAULT NULL,
        nr_quantidade                     DECIMAL(18,4)   DEFAULT NULL,
        id_unidade_medida                 VARCHAR(10)     DEFAULT NULL,
        ds_unidade_medida                 VARCHAR(50)     DEFAULT NULL,
        vl_minimo_unitario_item           DECIMAL(18,4)   DEFAULT NULL,
        vl_minimo_total                   DECIMAL(18,2)   DEFAULT NULL,
        vl_maximo_unitario_item           DECIMAL(18,4)   DEFAULT NULL,
        vl_maximo_total                   DECIMAL(18,2)   DEFAULT NULL,
        ds_item                           TEXT            DEFAULT NULL,
        ds_forma_pagamento                VARCHAR(200)    DEFAULT NULL,
        nr_prazo_limite_entrega           INT             DEFAULT NULL,
        id_tipo_entrega_produto           VARCHAR(10)     DEFAULT NULL,
        ds_tipo_entrega_produto           VARCHAR(100)    DEFAULT NULL,
        nr_quantidade_proposta_licitacao  DECIMAL(18,4)   DEFAULT NULL,
        vl_proposta_item                  DECIMAL(18,2)   DEFAULT NULL,
        dt_validade_proposta              DATE            DEFAULT NULL,
        dt_prazo_entrega_proposta_licitacao DATE           DEFAULT NULL,
        nr_quantidade_vencedor_licitacao  DECIMAL(18,4)   DEFAULT NULL,
        vl_licitacao_vencedor_licitacao   DECIMAL(18,2)   DEFAULT NULL,
        nr_classificacao                  INT             DEFAULT NULL,
        dt_homologacao                    DATE            DEFAULT NULL,
        ultimo_envio_simam_neste_exercicio VARCHAR(10)    DEFAULT NULL,
        data_referencia                   VARCHAR(10)     DEFAULT NULL,
        PRIMARY KEY (id_licitacao, nr_lote, nr_item, nr_documento, id_pessoa),
        INDEX idx_municipio (cd_ibge, nm_municipio),
        INDEX idx_modalidade (ds_modalidade_licitacao),
        INDEX idx_ano (nr_ano_licitacao),
        INDEX idx_documento (nr_documento),
        INDEX idx_data_homologacao (dt_homologacao),
        INDEX idx_data_referencia (data_referencia)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("[INFO] Tabela 'tcepa' verificada/criada com sucesso.")


def insert_batch(conn, registros, batch_size=1000):
    """
    Insere os registros em lotes usando executemany.
    Retorna a quantidade de registros inseridos com sucesso e erros.
    """
    colunas = list(ATTR_MAP.values())
    placeholders = ", ".join(["%s"] * len(colunas))
    columns_str = ", ".join(colunas)

    insert_sql = f"""
        INSERT IGNORE INTO tcepa ({columns_str})
        VALUES ({placeholders})
    """

    total = len(registros)
    sucessos = 0
    erros = 0

    with conn.cursor() as cur:
        for inicio in range(0, total, batch_size):
            lote = registros[inicio:inicio + batch_size]
            valores = [
                [row.get(col) for col in colunas]
                for row in lote
            ]
            try:
                cur.executemany(insert_sql, valores)
                conn.commit()
                sucessos += cur.rowcount
                print(f"[INFO] Lote {inicio // batch_size + 1}: "
                      f"{len(lote)} registros processados. "
                      f"(inseridos: {cur.rowcount})")
            except Exception as e:
                conn.rollback()
                print(f"[ERRO] Falha no lote {inicio // batch_size + 1}: {e}")
                erros += len(lote)

    return sucessos, erros


def main():
    if len(sys.argv) < 2:
        print("Uso: python carga_tcepa.py <padrao_glob_ou_arquivos>")
        print("Exemplos:")
        print('  python carga_tcepa.py "2026_*.xml"')
        print("  python carga_tcepa.py 2026_410010_LicitacaoVencedor.xml 2026_410020_LicitacaoVencedor.xml")
        sys.exit(1)

    # Expande argumentos: resolve globs e junta arquivos avulsos
    xml_files = []
    for arg in sys.argv[1:]:
        expandidos = glob.glob(arg)
        if expandidos:
            xml_files.extend(expandidos)
        else:
            xml_files.append(arg)

    # Remove duplicatas mantendo ordem
    xml_files = list(dict.fromkeys(xml_files))

    # Valida se os arquivos existem
    for f in xml_files:
        if not os.path.isfile(f):
            print(f"[ERRO] Arquivo não encontrado: {f}")
            sys.exit(1)

    # Filtra apenas arquivos .xml
    xml_files = [f for f in xml_files if f.lower().endswith(".xml")]
    if not xml_files:
        print("[ERRO] Nenhum arquivo .xml encontrado nos argumentos.")
        sys.exit(1)

    print(f"[INFO] Total de arquivos a processar: {len(xml_files)}")
    for f in xml_files:
        print(f"       - {f}")

    # Valida conexão
    for key in ("host", "user", "password", "database"):
        if not DB_CONFIG.get(key):
            print(f"[ERRO] Variável de ambiente faltando para '{key}'. "
                  f"Configure via .env ou variáveis de ambiente.")
            print("""
Exemplo de .env:
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=seu_usuario
    DB_PASSWORD=sua_senha
    DB_NAME=nome_do_banco
""")
            sys.exit(1)

    # Conecta ao banco (uma única conexão para todos os arquivos)
    print("=" * 60)
    print("CARGA TCEPA - Importação de Licitações TCE")
    print("=" * 60)
    print(f"\n[INFO] Conectando ao banco: "
          f"{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    try:
        conn = pymysql.connect(**DB_CONFIG)
        print("[INFO] Conexão estabelecida com sucesso.")
    except Exception as e:
        print(f"[ERRO] Falha na conexão: {e}")
        sys.exit(1)

    try:
        # Cria a tabela uma única vez
        create_table_if_not_exists(conn)

        total_geral = 0
        sucessos_geral = 0
        erros_geral = 0

        # Processa cada arquivo
        for idx, xml_file in enumerate(xml_files, start=1):
            print(f"\n" + "-" * 60)
            print(f"[{idx}/{len(xml_files)}] Processando: {xml_file}")
            print("-" * 60)

            registros = parse_xml(xml_file)
            if not registros:
                print("[AVISO] Nenhum registro encontrado, pulando.")
                continue

            print(f"[INFO] Inserindo {len(registros)} registros...")
            sucessos, erros = insert_batch(conn, registros)

            total_geral += len(registros)
            sucessos_geral += sucessos
            erros_geral += erros

        # Resumo final consolidado
        print("\n" + "=" * 60)
        print("RESUMO GERAL DA CARGA")
        print("=" * 60)
        print(f"  Arquivos processados:        {len(xml_files)}")
        print(f"  Total de registros lidos:    {total_geral}")
        print(f"  Registros inseridos:         {sucessos_geral}")
        print(f"  Registros ignorados/dados:   {total_geral - sucessos_geral - erros_geral}")
        print(f"  Erros:                       {erros_geral}")
        print("=" * 60)

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM tcepa")
            total_banco = cur.fetchone()[0]
        print(f"  Total na tabela 'tcepa':      {total_banco}")
        print("=" * 60)

    except Exception as e:
        print(f"[ERRO] Falha durante a carga: {e}")
        raise
    finally:
        conn.close()
        print("[INFO] Conexão encerrada.")


if __name__ == "__main__":
    main()
