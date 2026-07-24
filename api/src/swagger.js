/**
 * Configuração do Swagger/OpenAPI
 */
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'API de Pesquisa de Preços - TCE/PR',
    version: '1.0.0',
    description: 'API REST para consulta de preços em licitações públicas do Tribunal de Contas do Estado do Paraná.\n\n**Exemplos:**\n- `/api/pesquisa?q=motobomba&limite=5`\n- `/api/pesquisa?q=cimento&municipio=CURITIBA`\n- `/api/pesquisa?q=camiseta&ordenar=preco`',
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Pesquisa', description: 'Busca de licitações por descrição do item' },
    { name: 'Info', description: 'Informações e estatísticas' },
  ],
  paths: {
    '/api/pesquisa': {
      get: {
        tags: ['Pesquisa'],
        summary: 'Buscar licitações por descrição do item',
        description: 'Retorna licitações cuja descrição do item contém o termo informado.',
        parameters: [
          { in: 'query', name: 'q', required: true, schema: { type: 'string' }, description: 'Termo de busca (ex: motobomba, cimento, bermuda)' },
          { in: 'query', name: 'limite', schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Resultados por página' },
          { in: 'query', name: 'pagina', schema: { type: 'integer', default: 1 }, description: 'Número da página' },
          { in: 'query', name: 'municipio', schema: { type: 'string' }, description: 'Filtrar por município (nome exato)' },
          { in: 'query', name: 'ano', schema: { type: 'integer' }, description: 'Filtrar por ano da licitação' },
          { in: 'query', name: 'ordenar', schema: { type: 'string', enum: ['relevancia', 'preco', 'data'], default: 'relevancia' }, description: 'Critério de ordenação' },
        ],
        responses: {
          '200': { description: 'Resultados da busca' },
          '400': { description: 'Parâmetro q não informado' },
        },
      },
    },
    '/api/pesquisa/municipios': {
      get: {
        tags: ['Info'],
        summary: 'Listar municípios disponíveis',
        responses: { '200': { description: 'Lista de municípios com total de licitações' } },
      },
    },
    '/api/pesquisa/estatisticas': {
      get: {
        tags: ['Info'],
        summary: 'Estatísticas gerais do banco',
        responses: { '200': { description: 'Totais de licitações, municípios, entidades e fornecedores' } },
      },
    },
    '/api/health': {
      get: {
        tags: ['Info'],
        summary: 'Health check da API',
        responses: { '200': { description: 'API está online' } },
      },
    },
  },
};

module.exports = swaggerSpec;
