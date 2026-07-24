# 🏷️ API de Pesquisa de Preços - TCE/PR

API REST para consulta de preços em licitações públicas do **Tribunal de Contas do Estado do Paraná (TCE/PR)**.

Permite buscar itens por **descrição** e obter valores praticados em licitações de todo o estado.

---

## 🚀 Tecnologias

- **Node.js 20** + **Express**
- **SQLite** com **FTS5** (busca textual full-text search)
- **Docker** (pronto para EasyPanel)

---

## 📦 Estrutura

```
api/
├── Dockerfile              # Build da imagem Docker
├── docker-compose.yml      # Para teste local
├── package.json
├── src/
│   ├── index.js            # Servidor Express (entrypoint)
│   ├── database.js         # Conexão SQLite + schema + FTS5
│   ├── import-xml.js       # Script de importação dos XMLs
│   └── routes/
│       └── pesquisa.js     # Rotas da API
└── data/                   # Banco SQLite (gerado na importação)
```

---

## 🛠️ Como usar (local)

### 1. Instalar dependências

```bash
cd api
npm install
```

### 2. Importar os dados XML para o SQLite

```bash
npm run import
```

> Isso vai ler todos os arquivos `../2026_*.xml` e popular o SQLite.

### 3. Iniciar o servidor

```bash
npm start
```

A API estará disponível em: **http://localhost:3000**

---

## 📡 Endpoints da API

### 🔍 `GET /api/pesquisa?q=termo`

Busca itens por descrição.

| Parâmetro   | Tipo    | Default       | Descrição                          |
|-------------|---------|---------------|------------------------------------|
| `q`         | string  | **obrigatório** | Termo de busca                    |
| `limite`    | number  | 20            | Resultados por página (max 100)    |
| `pagina`    | number  | 1             | Número da página                   |
| `municipio` | string  | -             | Filtrar por município              |
| `ano`       | number  | -             | Filtrar por ano                    |
| `ordenar`   | string  | `relevancia`  | `relevancia`, `preco` ou `data`    |

**Exemplos:**

```bash
# Busca por motobomba
curl "http://localhost:3000/api/pesquisa?q=motobomba"

# Busca por cimento em Curitiba
curl "http://localhost:3000/api/pesquisa?q=cimento&municipio=CURITIBA"

# Busca por camiseta ordenado por menor preço
curl "http://localhost:3000/api/pesquisa?q=camiseta&ordenar=preco&limite=5"

# Busca por bernarda no ano de 2026
curl "http://localhost:3000/api/pesquisa?q=bernarda&ano=2026"
```

**Resposta:**

```json
{
  "dados": [
    {
      "id": 1,
      "municipio": { "codigo": "410010", "nome": "ABATIÁ" },
      "entidade": "MUNICÍPIO DE ABATIÁ",
      "licitacao": {
        "id": "2476479",
        "ano": 2026,
        "numero": "1",
        "modalidade": "Pregão",
        "data_homologacao": "2026-01-29"
      },
      "fornecedor": {
        "nome": "FABIO VIEIRA - ME",
        "documento": "11699260000113"
      },
      "item": {
        "lote": 3,
        "numero": 1,
        "descricao": "BERMUDA: Tipo: Unissex...",
        "quantidade": 640,
        "unidade_medida": "Unidade"
      },
      "valores": {
        "minimo_unitario": 23.22,
        "minimo_total": 14860.80,
        "maximo_unitario": 23.22,
        "maximo_total": 14860.80,
        "proposta_unitario": 15.90,
        "vencedor_total": 15.90
      },
      "classificacao": 1,
      "data_referencia": "2026/07"
    }
  ],
  "paginacao": {
    "pagina": 1,
    "limite": 20,
    "total": 42,
    "total_paginas": 3
  },
  "termo_busca": "motobomba"
}
```

### 📋 `GET /api/pesquisa/municipios`

Lista todos os municípios disponíveis no banco.

### 📊 `GET /api/pesquisa/estatisticas`

Estatísticas gerais: total de licitações, municípios, fornecedores, etc.

### ❤️ `GET /api/health`

Health check do servidor.

---

## 🐳 Deploy no EasyPanel

### Pré-requisitos

1. Envie o repositório para o GitHub/GitLab (com a pasta `api/` incluída)
2. No **EasyPanel**, crie um **Novo Projeto**
3. Escolha **Git** como fonte e conecte seu repositório

### Configuração no EasyPanel

| Configuração | Valor |
|-------------|-------|
| **Tipo de deploy** | `Dockerfile` |
| **Diretório do Dockerfile** | `api/` |
| **Porta** | `3000` |
| **Variáveis de ambiente** | `PORT=3000` |

### Passo a passo

1. No painel do EasyPanel, clique em **"Create New Project"**
2. Nomeie o projeto (ex: `pesquisa-precos-api`)
3. Em **"Build Type"**, selecione **"Dockerfile"**
4. Em **"Dockerfile Location"**, coloque `api/Dockerfile`
5. Publique a porta `3000`
6. Clique em **"Deploy"**

### ⚠️ Importação dos dados (pós-deploy)

Após o deploy inicial, você precisa importar os XMLs para o SQLite:

1. No painel do EasyPanel, vá até o container criado
2. Acesse o **Terminal** do container
3. Execute:

```bash
# Verifique onde os XMLs estão (o EasyPanel clona o repositório completo)
ls /app

# Se os XMLs estiverem no diretório pai
ls /app/../

# Ou procure pelos arquivos
find / -name "2026_*.xml" 2>/dev/null

# Execute a importação apontando para o caminho correto dos XMLs
# Exemplo: se os XMLs estão em /app (raiz do repositório)
node src/import-xml.js "../2026_*.xml"

# Ou se o repositório foi clonado em /app e os XMLs estão em /app (raiz)
node src/import-xml.js "/app/2026_*.xml"
```

4. Aguarde a importação concluir
5. Teste com: `curl http://localhost:3000/api/health`

> 💡 **Dica:** Se preferir, você pode copiar os arquivos XML para dentro da pasta `api/xml/` e ajustar o caminho no comando de importação.

---

## 🧪 Testando a API

```bash
# Health check
curl https://seu-dominio.com/api/health

# Buscar por "motobomba"
curl "https://seu-dominio.com/api/pesquisa?q=motobomba"

# Buscar por "cimento" em "CURITIBA"
curl "https://seu-dominio.com/api/pesquisa?q=cimento&municipio=CURITIBA"

# Ver estatísticas
curl https://seu-dominio.com/api/pesquisa/estatisticas
```

---

## 🔄 Atualizando os dados

Quando novos XMLs forem disponibilizados pelo TCE:

```bash
# 1. Copie os novos XMLs para a pasta do projeto
# 2. Execute a importação novamente
docker exec -it <nome-do-container> node src/import-xml.js "/caminho/novos/*.xml"
```

> A importação usa `INSERT OR IGNORE`, então registros duplicados não serão reinseridos.
