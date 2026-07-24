#!/usr/bin/env node
/*
 * Gerador de API: cria migration, rota e importador básico
 * Uso: node generate-api.js <api-name> <table-name> <fields>
 * Exemplo: node generate-api.js notas-fiscais notas_fiscais_items descricao:text,valor_unitario:numeric,quantidade:numeric
 */
const fs = require('fs');
const path = require('path');

function exit(msg) { console.error(msg); process.exit(1); }

const [,, apiName, tableName, fieldsArg] = process.argv;
if (!apiName || !tableName || !fieldsArg) exit('Usage: node generate-api.js <api-name> <table-name> <fields>');

const fields = fieldsArg.split(',').map(f => {
  const [name, type] = f.split(':').map(s => s.trim());
  return { name, type: (type || 'text') };
});

// find next migration prefix
const migrationsDir = path.join(__dirname, '..', 'migrations');
if (!fs.existsSync(migrationsDir)) fs.mkdirSync(migrationsDir, { recursive: true });
const existing = fs.readdirSync(migrationsDir).filter(f => f.match(/^\d+_.+\.sql$/));
let max = 0; existing.forEach(f => { const n = parseInt(f.split('_')[0]); if (!isNaN(n) && n>max) max=n; });
const next = String(max+1).padStart(3,'0');

// map types
function mapType(t) {
  switch ((t||'text').toLowerCase()) {
    case 'text': return 'TEXT';
    case 'numeric': return 'NUMERIC(18,4)';
    case 'money': return 'NUMERIC(18,2)';
    case 'int': case 'integer': return 'INTEGER';
    case 'date': return 'DATE';
    case 'json': return 'JSONB';
    default: return 'TEXT';
  }
}

// create migration file
const migrationName = `${next}_create_${tableName}.sql`;
const migrationPath = path.join(migrationsDir, migrationName);
const cols = fields.map(f => `  ${f.name} ${mapType(f.type)}`).join(',\n');
const sql = `-- Migration auto-gerada por generate-api\nCREATE TABLE IF NOT EXISTS ${tableName} (\n  id SERIAL PRIMARY KEY,\n${cols},\n  raw JSONB\n);\n\n-- Índice trigram para campo de descrição, se existir\n` + (fields.some(f => f.name==='descricao') ? `CREATE INDEX IF NOT EXISTS idx_${tableName}_descricao_trgm ON ${tableName} USING gin(descricao gin_trgm_ops);\n` : '') ;
fs.writeFileSync(migrationPath, sql);

// create route file
const routesDir = path.join(__dirname, '..', 'api', 'src', 'routes');
if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true });
const routeFile = path.join(routesDir, `${apiName}-pg.js`);
const routeTemplate = `/** Auto-generated routes for ${apiName} */\nconst express = require('express');\nconst { exec, get } = require('../database-pg');\nconst router = express.Router();\n\nrouter.get('/', async (req,res)=>{\n  try {\n    const { q, limite=20, pagina=1 } = req.query;\n    if (!q) return res.status(400).json({ erro: 'q é obrigatório' });\n    const limit = Math.min(Math.max(parseInt(limite)||20,1),100);\n    const page = Math.max(parseInt(pagina)||1,1);\n    const offset = (page-1)*limit;\n    const palavras = q.trim().split(/\\s+/).filter(Boolean);\n    const like = palavras.map((_,i)=> `descricao ILIKE $${i+1}` ).join(' AND ');
const params = palavras.map(p=>`%${p}%`);
    const sql = `SELECT * FROM ${tableName} WHERE (${like}) LIMIT $${palavras.length+1} OFFSET $${palavras.length+2}`;
    const rows = await exec(sql, [...params, limit, offset]);
    res.json({ dados: rows, paginacao:{ pagina: page, limite: limit } });\n  } catch(err){ console.error(err); res.status(500).json({ erro: err.message });}\n});\n\nmodule.exports = { router };\n`;
fs.writeFileSync(routeFile, routeTemplate);

// create import script
const importScriptPath = path.join(__dirname, '..', 'scripts', `import-${apiName}.js`);
const importTemplate = `#!/usr/bin/env node\nconst fs = require('fs');\nconst path = require('path');\nconst { parse } = require('csv-parse');\nconst file = process.argv[2]; if (!file) { console.error('Usage: node import-${apiName}.js <arquivo.csv>'); process.exit(1);}\nif (!fs.existsSync(file)) { console.error('Arquivo não encontrado:', file); process.exit(1);}\nconst db = require('../api/src/database-pg'); const pool = db.pool; const parser = fs.createReadStream(file).pipe(parse({ columns:true, skip_empty_lines:true, bom:true }));\n(async()=>{ let batch=[]; for await (const rec of parser){ // simple map: use only provided fields\n  const vals = [${fields.map(f=>`rec['${f.name}'] || null`).join(', ')} , JSON.stringify(rec)];\n  batch.push(vals); if (batch.length>=500){ await insertBatch(pool, batch.splice(0)); } } if (batch.length) await insertBatch(pool,batch); console.log('Import concluído'); process.exit(0); })().catch(e=>{console.error(e);process.exit(1)});\nasync function insertBatch(pool, rows){ const client = await pool.connect(); try{ await client.query('BEGIN'); const q = `INSERT INTO ${tableName}(${fields.map(f=>f.name).join(',')}, raw) VALUES ${rows.map((r,i)=> '(' + r.map((_,j)=>`$${i*${fields.length+1}+${j+1}}`).join(',') + ')').join(',')}`; const flat = rows.flat(); await client.query(q, flat); await client.query('COMMIT'); }catch(e){ await client.query('ROLLBACK'); throw e;} finally{ client.release(); } }`;
fs.writeFileSync(importScriptPath, importTemplate);

// update api/package.json to include generate-api script if not present
const pkgPath = path.join(__dirname, '..', 'api', 'package.json');
try{
  const pkg = JSON.parse(fs.readFileSync(pkgPath,'utf8'));
  pkg.scripts = pkg.scripts || {};
  if (!pkg.scripts['generate-api']) pkg.scripts['generate-api'] = 'node ../scripts/generate-api.js';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}catch(e){ /* ignore */ }

console.log('Scaffold completo:');
console.log('- Migration:', migrationPath);
console.log('- Route:', routeFile);
console.log('- Import script:', importScriptPath);
console.log('\nPróximos passos:');
console.log(`1) Revisar migration: ${migrationPath}`);
console.log(`2) Aplicar migrations: node scripts/migrate-pg.js`);
console.log(`3) Importar CSV: node ${importScriptPath} <arquivo.csv>`);
console.log(`4) Reiniciar API se necessário`);
