/**
 * API de Pesquisa de Preços - Versão PostgreSQL
 * Servidor Express com conexão PostgreSQL para produção
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const authMiddleware = require('./middleware/auth');
const { getDatabase } = require('./database-pg');
const { router: pesquisaRoutes } = require('./routes/pesquisa-pg');
const { router: notasRoutes } = require('./routes/notas-pg');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadJobs = new Map();
const uploadRoot = path.join(os.tmpdir(), 'tcepa-uploads');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitizeName(name) {
  return path.basename(String(name || 'upload.csv')).replace(/[^\w.\-]+/g, '_');
}

function getJob(jobId) {
  if (!uploadJobs.has(jobId)) {
    uploadJobs.set(jobId, {
      jobId,
      status: 'waiting',
      fileName: null,
      tempDir: null,
      receivedChunks: new Set(),
      totalChunks: 0,
      rowsRead: 0,
      rowsInserted: 0,
      rowsIgnored: 0,
      rowsFailed: 0,
      message: null,
      error: null,
      startedAt: null,
      finishedAt: null,
    });
  }
  return uploadJobs.get(jobId);
}

function runImportForFile(job, filePath) {
  const scriptPath = path.join(__dirname, 'import-notas-fiscais-csv-pg.js');
  job.status = 'processing';
  job.startedAt = new Date().toISOString();

  const child = spawn(process.execPath, [scriptPath, filePath], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('close', (code) => {
    job.finishedAt = new Date().toISOString();
    if (code === 0) {
      job.status = 'success';
      job.message = stdout.trim().split('\n').slice(-1)[0] || 'Importação concluída';
      job.error = null;
    } else {
      job.status = 'failed';
      job.error = stderr.trim() || stdout.trim() || `Processo finalizado com código ${code}`;
      job.message = 'Falha na importação';
    }
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
  });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API (protegidas por API Key)
app.use('/api/pesquisa', authMiddleware, pesquisaRoutes);
app.use('/api/notas', authMiddleware, notasRoutes);

app.post('/api/etl/notas/upload', authMiddleware, express.raw({ type: '*/*', limit: '25mb' }), async (req, res) => {
  try {
    const uploadId = String(req.query.uploadId || '').trim() || crypto.randomUUID();
    const filename = sanitizeName(req.query.filename || 'notas.csv');
    const chunkIndex = Number(req.query.chunkIndex);
    const totalChunks = Number(req.query.totalChunks);

    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return res.status(400).json({ erro: 'chunkIndex inválido' });
    }
    if (!Number.isInteger(totalChunks) || totalChunks < 1) {
      return res.status(400).json({ erro: 'totalChunks inválido' });
    }
    if (!req.body || !req.body.length) {
      return res.status(400).json({ erro: 'Chunk vazio' });
    }

    const job = getJob(uploadId);
    if (!job.tempDir) {
      job.tempDir = path.join(uploadRoot, uploadId);
      ensureDir(job.tempDir);
      job.fileName = filename;
      job.totalChunks = totalChunks;
    }

    const chunkPath = path.join(job.tempDir, `${String(chunkIndex).padStart(6, '0')}.part`);
    fs.writeFileSync(chunkPath, Buffer.from(req.body));
    job.receivedChunks.add(chunkIndex);
    job.totalChunks = totalChunks;

    const receivedAll = job.receivedChunks.size === totalChunks;
    if (receivedAll) {
      const finalPath = path.join(job.tempDir, filename);
      const out = fs.createWriteStream(finalPath);
      for (let i = 0; i < totalChunks; i += 1) {
        const partPath = path.join(job.tempDir, `${String(i).padStart(6, '0')}.part`);
        out.write(fs.readFileSync(partPath));
      }
      out.end();
      await new Promise((resolve) => out.on('finish', resolve));
      runImportForFile(job, finalPath);
    } else {
      job.status = 'uploading';
    }

    res.json({
      uploadId,
      status: job.status,
      fileName: job.fileName,
      receivedChunks: job.receivedChunks.size,
      totalChunks: job.totalChunks,
      readyToImport: receivedAll,
    });
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ erro: 'Falha no upload', detalhe: err.message });
  }
});

app.get('/api/etl/notas/upload/:uploadId', authMiddleware, (req, res) => {
  const job = uploadJobs.get(req.params.uploadId);
  if (!job) {
    return res.status(404).json({ erro: 'Upload não encontrado' });
  }
  res.json(job);
});

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API TCE/PR - Pesquisa de Preços',
}));

// JSON do Swagger
app.get('/api/swagger.json', (req, res) => res.json(swaggerSpec));

// Rota de health check
/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Info]
 *     summary: Health check da API
 *     responses:
 *       200:
 *         description: API está online
 */
app.get('/api/health', async (req, res) => {
  try {
    await getDatabase();
    res.json({
      status: 'ok',
      servidor: 'Pesquisa de Preços - API',
      versao: '1.0.0 (PostgreSQL)',
      banco: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'tcepa'}`,
    });
  } catch (err) {
    res.status(500).json({ status: 'erro', mensagem: err.message });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    nome: 'API de Pesquisa de Preços',
    descricao: 'Consulta dados de licitações do TCE/PR por descrição de item',
    versao: '1.0.0 (PostgreSQL)',
    endpoints: {
      health: 'GET /api/health',
      buscar: 'GET /api/pesquisa?q=termo',
      municipios: 'GET /api/pesquisa/municipios',
      estatisticas: 'GET /api/pesquisa/estatisticas',
    },
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

app.listen(PORT, async () => {
  try {
    await getDatabase();
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📦 Banco: PostgreSQL (${process.env.DB_HOST || 'localhost'})`);
  } catch (err) {
    console.error('❌ Erro ao conectar no PostgreSQL:', err.message);
    process.exit(1);
  }
});

module.exports = app;
