# Pesquisa de Preços — Dados TCE/PR

Importação de dados de licitações públicas do **Tribunal de Contas do Estado do Paraná (TCE/PR)** para alimentar o sistema de pesquisa de preços **Algorise/Cotegov**.

Os dados são disponibilizados pelo TCE/PR em formato XML, organizados por município, e armazenados no **Google Cloud SQL (MySQL)**.

---

## 📁 Estrutura do Repositório

```
📦 pesquisa-precos/
├── 📄 2026_410010_LicitacaoVencedor.xml   # Dados por município (código IBGE)
├── 📄 2026_410020_LicitacaoVencedor.xml
├── ...
├── 📄 2026_410420_LicitacaoVencedor.xml   # 59 arquivos no total
├── 📄 carga_tcepa.py                      # Script de importação
├── 📄 carga_tcepa.sql                     # Schema da tabela
├── 📁 zip/                                # Arquivos ZIP originais
└── 📄 README.md                           # Este arquivo
```

### Arquivos XML

Cada arquivo segue o padrão de nomenclatura:

```
<ano>_<codigo_ibge>_LicitacaoVencedor.xml
```

Exemplo: `2026_410010_LicitacaoVencedor.xml` → município de Abatiá (código IBGE 410010).

### Estrutura do XML

- Tag raiz: `<root>`
- Cada registro: `<LicitacaoVencedor>` com atributos
- Encoding: UTF-8

**Atributos principais:**

| Atributo | Descrição | Tipo SQL |
|----------|-----------|----------|
| `cdIBGE` | Código IBGE do município | `VARCHAR` |
| `nmMunicipio` | Nome do município | `VARCHAR` |
| `nmEntidade` | Órgão público contratante | `VARCHAR` |
| `idlicitacao` | ID da licitação | `VARCHAR` |
| `nrAnoLicitacao` | Ano da licitação | `INT` |
| `dsModalidadeLicitacao` | Modalidade (Pregão, Dispensa…) | `VARCHAR` |
| `nmPessoa` | Nome do licitante/vencedor | `VARCHAR` |
| `nrDocumento` | CPF/CNPJ do licitante | `VARCHAR` |
| `dsItem` | Descrição do item licitado | `TEXT` |
| `vlPropostaItem` | Valor da proposta por item | `DECIMAL` |
| `vlLicitacaoVencedorLicitacao` | Valor da licitação vencedora | `DECIMAL` |
| `dtHomologacao` | Data de homologação | `DATE` |

---

## 🗄️ Schema (MySQL)

A tabela `tcepa` é criada pelo script `carga_tcepa.sql` com:

- **34 colunas** mapeadas dos atributos do XML
- **Chave primária composta**: `(id_licitacao, nr_lote, nr_item, nr_documento, id_pessoa)`
- **Índices** para consultas por município, modalidade, ano, CNPJ e data
- Engine InnoDB, charset `utf8mb4`

```sql
CREATE TABLE IF NOT EXISTS tcepa (
    cd_ibge                           VARCHAR(7)      NOT NULL,
    nm_municipio                      VARCHAR(100)    NOT NULL,
    ...
    PRIMARY KEY (id_licitacao, nr_lote, nr_item, nr_documento, id_pessoa),
    INDEX idx_municipio (cd_ibge, nm_municipio),
    INDEX idx_modalidade (ds_modalidade_licitacao),
    INDEX idx_ano (nr_ano_licitacao),
    ...
);
```

---

## 🚀 Como Usar

### 1. Pré-requisitos

- Python 3.8+
- Acesso ao Google Cloud SQL (MySQL)
- [Cloud SQL Proxy](https://cloud.google.com/sql/docs/mysql/sql-proxy) (recomendado)

### 2. Instalar dependências

```bash
pip install pymysql python-dotenv
```

### 3. Configurar acesso ao banco

Crie um arquivo `.env` na raiz do projeto:

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco
```

Inicie o proxy do Cloud SQL (em outro terminal):

```bash
cloud-sql-proxy --port 3306 algorise-db:<regiao>:<instancia>
```

### 4. Executar a importação

Processar **todos** os arquivos XML de uma vez:

```bash
python carga_tcepa.py "2026_*.xml"
```

Processar arquivos específicos:

```bash
python carga_tcepa.py 2026_410010_LicitacaoVencedor.xml 2026_410020_LicitacaoVencedor.xml
```

### 5. Verificar os dados

```sql
-- Total de registros
SELECT COUNT(*) FROM tcepa;

-- Quantidade por município
SELECT cd_ibge, nm_municipio, COUNT(*)
FROM tcepa
GROUP BY cd_ibge, nm_municipio
ORDER BY nm_municipio;

-- Período dos dados
SELECT MIN(dt_homologacao) AS data_inicial,
       MAX(dt_homologacao) AS data_final
FROM tcepa;

-- Top 10 itens mais licitados
SELECT ds_item, COUNT(*) AS qtde
FROM tcepa
GROUP BY ds_item
ORDER BY qtde DESC
LIMIT 10;
```

---

## ⚠️ Observações

- **Atributos opcionais**: Alguns arquivos podem não conter `vlMinimoUnitarioItem` e `vlMinimoTotal`. O script trata esses campos como `NULL`.
- **Dados por município**: Cada arquivo XML representa as licitações de um município paranaense em 2026.
- **Encoding**: Todos os arquivos estão em UTF-8.
- **Arquivos ZIP**: A pasta `zip/` contém os arquivos originais baixados do TCE, mantidos como referência.
- O script usa `INSERT IGNORE` para evitar duplicatas em reexecuções.

---

## 🧩 Sistema

Este repositório alimenta o sistema **Algorise/Cotegov** — plataforma de pesquisa de preços para auxiliar órgãos públicos na tomada de decisões sobre contratações e licitações.
