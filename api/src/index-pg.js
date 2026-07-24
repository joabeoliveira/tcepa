/**
 * API de Pesquisa de Preços - Versão PostgreSQL
 * Servidor Express com conexão PostgreSQL para produção
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDatabase } = require('./database-pg');
const { router: pesquisaRoutes } = require('./routes/pesquisa-pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/pesquisa', pesquisaRoutes);

// Rota de health check
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
