# 🔍 DEBUG: API retorna 0 resultados mesmo com banco populado

## 📋 Síntese do Problema

A API foi implantada com sucesso no **EasyPanel** (Docker + Node.js + sql.js).
A importação dos XMLs funcionou: **65.628 registros** inseridos no SQLite.

**Problema:** Todos os endpoints da API retornam `{"dados":[], ...}` com `total: 0`,
mas consultas **diretas ao mesmo arquivo SQLite via `node -e` retornam os dados corretamente**.

| Teste | Resultado |
|-------|-----------|
| `db.exec("SELECT COUNT(*) FROM licitacoes")` direto no node | ✅ **65.628 registros** |
| `stmt.bind(['%MOTOBOMBA%']); stmt.step()` direto no node | ✅ **11 resultados** |
| `GET /api/pesquisa?q=motobomba` via HTTP | ❌ **0 resultados** |
| `GET /api/pesquisa/estatisticas` via HTTP | ❌ **total_licitacoes: 0** |
| `GET /api/health` via HTTP | ✅ **status: "ok"** |

---

## 🏗️ Arquitetura

### Fluxo de inicialização da API

```
index.js
  ├── app.use('/api/pesquisa', pesquisaRoutes)
  ├── (async () => { await getDatabase(); })()  ← IIFE assíncrona
  └── app.listen(PORT)
        └── health check e rotas respondem
```

### Fluxo de uma requisição de busca

```
GET /api/pesquisa?q=motobomba
  └── pesquisa.js: router.get('/', async (req, res)
        ├── await getDatabase()           ← retorna db existente ou inicializa
        ├── constrói query com LIKE       ← WHERE ds_item LIKE '%motobomba%'
        ├── get(countSql, params)         ← wrapper que chama exec()
        │     └── exec(sql, params)
        │           ├── db.prepare(sql)
        │           ├── stmt.bind(params)
        │           ├── stmt.step() + stmt.getAsObject()
        │           └── stmt.free()
        └── res.json({ dados, paginacao })
```

### Módulos envolvidos

| Arquivo | Função |
|---------|--------|
| `src/index.js` | Servidor Express, inicialização do banco |
| `src/database.js` | Conexão sql.js, wrappers `exec()`, `get()`, `run()`, `runBatch()` |
| `src/routes/pesquisa.js` | Rotas da API, construção de queries |
| `src/import-xml.js` | Script de importação dos XMLs |

---

## ✅ O que já foi verificado

### 1. O arquivo do banco existe e tem dados

```bash
ls -la /app/data/
# -rw-r--r--  1 node  node  45674496 Jul 24 11:07 pesquisa-precos.db
```

### 2. Permissões corretas

```bash
# O arquivo é owned por node:node, mesmo usuário que roda a API
chown node:node /app/data/pesquisa-precos.db
```

### 3. Consultas diretas com sql.js funcionam

```js
const SQL = await initSqlJs();
const buf = fs.readFileSync('/app/data/pesquisa-precos.db');
const db = new SQL.Database(buf);

// COUNT funciona
db.exec('SELECT COUNT(*) as total FROM licitacoes');
// → [{ columns: ["total"], values: [[65628]] }]

// LIKE com bind params funciona
const stmt = db.prepare('SELECT ds_item FROM licitacoes WHERE ds_item LIKE ? LIMIT 2');
stmt.bind(['%MOTOBOMBA%']);
while (stmt.step()) { console.log(stmt.getAsObject()); }
stmt.free();
// → { ds_item: "CONJUNTO DE MOTOBOMBA ..." }
```

### 4. Código sem FTS5

```bash
grep -c 'fts5\|FTS5' /app/src/database.js
# → 0  (FTS5 foi removido)
```

### 5. Dockerfile usa caminhos corretos

```dockerfile
COPY api/package*.json ./
COPY api/src/ ./src/
COPY 2026_*.xml ./xml/
```

### 6. Build passa sem erros

```
npm install --omit=dev  (substituiu npm ci que exigia package-lock.json)
```

---

## ❌ Hipóteses já testadas e descartadas

| Hipótese | Teste | Resultado |
|----------|-------|-----------|
| FTS5 não suportado pelo sql.js | Removeu FTS5 do código | ❌ Persistiu |
| Imagem Docker desatualizada (cache) | `grep fts5` no container = 0 | ✅ Código novo |
| Banco corrompido por DDL com `db.run()` multi-statement | Mudou `criarTabelas()` para `db.exec()` | ❌ Persistiu |
| `exec()` wrapper com bug em `prepare/step/bind` | Reescreveu `exec()` com fallback para `db.exec()` sem params | ❌ Persistiu |
| `run()` não suporta multi-statement | Mudou `run()` para `db.exec()` quando sem params | ❌ Persistiu |
| Permissão de arquivo (root vs node) | `chown node:node` no banco | ❌ Persistiu |
| Processo não reiniciou pós-import | `kill 1` várias vezes | ❌ Persistiu |
| Volume persistente do EasyPanel | Removeu banco e reimportou | ❌ Persistiu |

---

## 🔬 Próximas investigações sugeridas

### 1. Testar a API "por dentro" do container

Acessar a API via `localhost` de dentro do container:

```bash
wget -qO- http://localhost:3000/api/pesquisa/estatisticas
```

Se funcionar internamente mas não externamente → problema de **proxy/reverso** do EasyPanel.

### 2. Testar rota de diagnóstico

Já existe o arquivo `src/test-api.js` que simula o que a API faz.
Após redeploy, executar:

```bash
node src/test-api.js
```

### 3. Verificar se o `db` module singleton está corrompido

Adicionar log no `getDatabase()` para confirmar quantos registros foram carregados:

```js
async function getDatabase() {
  if (db) {
    const test = db.exec("SELECT COUNT(*) as c FROM licitacoes");
    console.log('[DB] db já existe, registros:', test?.[0]?.values?.[0]?.[0]);
    return db;
  }
  // ...
}
```

### 4. Testar com `better-sqlite3` em vez de `sql.js`

O `sql.js` carrega o banco inteiro na RAM via WebAssembly. Há relatos de
inconsistências com `db.export()` após operações DDL em bancos grandes.
Alternativa: usar `better-sqlite3` (compilação nativa, sem WASM).

---

## 📊 Ambiente

| Item | Valor |
|------|-------|
| Node.js | v24.14.0 (Alpine) |
| sql.js | ^1.11.0 |
| Express | ^4.21.0 |
| EasyPanel | Docker buildx |
| Base image | node:20-alpine |
| Usuário container | `node` (não-root) |
| Porta | 3000 |
| Registros importados | 65.628 |
| Arquivos XML processados | 58 de 59 |
| Tamanho do banco | ~43 MB |

---

## 📁 Estrutura atual do projeto

```
pesquisa-precos/
├── .dockerignore
├── .gitignore
├── api/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   ├── README.md
│   ├── src/
│   │   ├── index.js
│   │   ├── database.js         ← PRINCIPAL: módulo sql.js + wrappers
│   │   ├── import-xml.js
│   │   ├── test-api.js          ← Diagnóstico
│   │   └── routes/
│   │       └── pesquisa.js
│   └── data/
│       └── pesquisa-precos.db   ← Banco com 65.628 registros
├── 2026_410010_LicitacaoVencedor.xml
├── ... (demais XMLs)
├── carga_tcepa.py
├── carga_tcepa.sql
└── README.md
```
