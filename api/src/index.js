const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDatabase } = require('./database');
const pesquisaRoutes = require('./routes/pesquisa');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Inicializa o banco (cria tabelas se não existirem)
(async () => {
  try {
    await getDatabase();
    console.log('✅ Banco de dados inicializado');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err);
  }
})();

// Rotas da API
app.use('/api/pesquisa', pesquisaRoutes);

// Rota de health check
app.get('/api/health', async (req, res) => {
  try {
    await getDatabase();
    res.json({
      status: 'ok',
      servidor: 'Pesquisa de Preços - API',
      versao: '1.0.0',
      banco: path.join(__dirname, '..', 'data', 'pesquisa-precos.db'),
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
    versao: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      buscar: 'GET /api/pesquisa?q=termo',
      municipios: 'GET /api/pesquisa/municipios',
      estatisticas: 'GET /api/pesquisa/estatisticas',
    },
    exemplos: {
      buscar_motobomba: '/api/pesquisa?q=motobomba&limite=5',
      buscar_por_municipio: '/api/pesquisa?q=cimento&municipio=CURITIBA',
      buscar_por_ano: '/api/pesquisa?q=bernarda&ano=2026',
      ordenar_por_preco: '/api/pesquisa?q=camiseta&ordenar=preco',
    },
  });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📖 Documentação: http://localhost:${PORT}/`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
