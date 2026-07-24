/**
 * Configuração do Swagger/OpenAPI
 */
const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Pesquisa de Preços - TCE/PR',
      version: '1.0.0',
      description: 'API REST para consulta de preços em licitações públicas do Tribunal de Contas do Estado do Paraná.',
      contact: {
        name: 'Suporte',
        email: 'suporte@exemplo.com',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Servidor atual',
      },
    ],
    tags: [
      { name: 'Pesquisa', description: 'Busca de licitações por descrição' },
      { name: 'Info', description: 'Informações e estatísticas' },
    ],
  },
    apis: [path.join(__dirname, 'routes', 'pesquisa-pg.js'), path.join(__dirname, 'index-pg.js')],
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
