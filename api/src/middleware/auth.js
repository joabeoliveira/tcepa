/**
 * Middleware de autenticação por API Key
 *
 * Aceita a chave via:
 * - Header: x-api-key
 * - Query:  api_key
 *
 * Configuração: variável de ambiente API_KEY
 * Se não definida, a autenticação é desabilitada.
 */

const API_KEY = process.env.API_KEY;

function authMiddleware(req, res, next) {
  // Se não houver API_KEY configurada, permite tudo
  if (!API_KEY) {
    return next();
  }

  const key = req.headers['x-api-key'] || req.query.api_key;

  if (!key) {
    return res.status(401).json({
      erro: 'API Key não informada',
      como_usar: 'Envie o header x-api-key ou o parâmetro ?api_key=SUACHAVE',
    });
  }

  if (key !== API_KEY) {
    return res.status(403).json({
      erro: 'API Key inválida',
    });
  }

  next();
}

module.exports = authMiddleware;
