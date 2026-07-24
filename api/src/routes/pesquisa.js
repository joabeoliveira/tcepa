const express = require('express');
const { getDatabase, exec, get } = require('../database');

const router = express.Router();

/**
 * GET /api/pesquisa
 * Busca itens por descrição (text search com FTS5 + LIKE como fallback)
 *
 * Query params:
 *   q          - termo de busca (obrigatório)
 *   limite     - max resultados (default: 20)
 *   pagina     - página (default: 1)
 *   municipio  - filtrar por município (opcional)
 *   ano        - filtrar por ano (opcional)
 *   ordenar    - 'preco' | 'relevancia' | 'data' (default: 'relevancia')
 */
router.get('/', async (req, res) => {
  try {
    await getDatabase();
    const { q, limite = 20, pagina = 1, municipio, ano, ordenar = 'relevancia' } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        erro: 'Parâmetro "q" é obrigatório',
        exemplo: '/api/pesquisa?q=motobomba&limite=20&pagina=1',
      });
    }

    const limit = Math.min(Math.max(parseInt(limite) || 20, 1), 100);
    const page = Math.max(parseInt(pagina) || 1, 1);
    const offset = (page - 1) * limit;

    const termo = q.trim();

    // Constrói a query usando LIKE (FTS5 pode não estar disponível em todos os builds do sql.js)
    const conditions = [];
    const params = [];

    // Busca textual - tenta FTS5 primeiro, fallback para LIKE
    const palavras = termo.split(/\s+/).filter(Boolean);
    const likeConditions = palavras.map(() => `l.ds_item LIKE ?`);
    const likeParams = palavras.map(p => `%${p}%`);

    conditions.push(`(${likeConditions.join(' AND ')})`);
    params.push(...likeParams);

    if (municipio) {
      conditions.push(`l.nm_municipio = ?`);
      params.push(municipio.toUpperCase());
    }

    if (ano) {
      conditions.push(`l.nr_ano_licitacao = ?`);
      params.push(parseInt(ano));
    }

    const whereClause = conditions.join(' AND ');

    // Ordenação
    let orderClause;
    switch (ordenar) {
      case 'preco':
        orderClause = 'l.vl_licitacao_vencedor_licitacao ASC';
        break;
      case 'data':
        orderClause = 'l.dt_homologacao DESC';
        break;
      case 'relevancia':
      default:
        // Prioriza itens com classificação 1 (vencedores) e mais recentes
        orderClause = 'l.nr_classificacao ASC, l.dt_homologacao DESC';
        break;
    }

    // Query principal
    const sql = `
      SELECT
        l.id,
        l.cd_ibge,
        l.nm_municipio,
        l.nm_entidade,
        l.id_licitacao,
        l.nr_ano_licitacao,
        l.nr_licitacao,
        l.ds_modalidade_licitacao,
        l.nm_pessoa,
        l.nr_documento,
        l.nr_lote,
        l.nr_item,
        l.nr_quantidade,
        l.ds_unidade_medida,
        l.vl_minimo_unitario_item,
        l.vl_minimo_total,
        l.vl_maximo_unitario_item,
        l.vl_maximo_total,
        l.ds_item,
        l.vl_proposta_item,
        l.vl_licitacao_vencedor_licitacao,
        l.nr_classificacao,
        l.dt_homologacao,
        l.data_referencia
      FROM licitacoes l
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `;

    // Query de total
    const countSql = `
      SELECT COUNT(*) as total
      FROM licitacoes l
      WHERE ${whereClause}
    `;

    const totalResult = get(countSql, params);
    const total = totalResult ? totalResult.total : 0;

    const rows = exec(sql, [...params, limit, offset]);

    res.json({
      dados: rows.map(r => ({
        id: r.id,
        municipio: { codigo: r.cd_ibge, nome: r.nm_municipio },
        entidade: r.nm_entidade,
        licitacao: {
          id: r.id_licitacao,
          ano: r.nr_ano_licitacao,
          numero: r.nr_licitacao,
          modalidade: r.ds_modalidade_licitacao,
          data_homologacao: r.dt_homologacao,
        },
        fornecedor: {
          nome: r.nm_pessoa,
          documento: r.nr_documento,
        },
        item: {
          lote: r.nr_lote,
          numero: r.nr_item,
          descricao: r.ds_item,
          quantidade: r.nr_quantidade,
          unidade_medida: r.ds_unidade_medida,
        },
        valores: {
          minimo_unitario: r.vl_minimo_unitario_item,
          minimo_total: r.vl_minimo_total,
          maximo_unitario: r.vl_maximo_unitario_item,
          maximo_total: r.vl_maximo_total,
          proposta_unitario: r.vl_proposta_item,
          vencedor_total: r.vl_licitacao_vencedor_licitacao,
        },
        classificacao: r.nr_classificacao,
        data_referencia: r.data_referencia,
      })),
      paginacao: {
        pagina: page,
        limite: limit,
        total,
        total_paginas: Math.ceil(total / limit),
      },
      termo_busca: q,
    });
  } catch (err) {
    console.error('Erro na busca:', err);
    res.status(500).json({
      erro: 'Erro interno ao realizar a busca',
      detalhe: err.message,
    });
  }
});

/**
 * GET /api/pesquisa/municipios
 * Lista municípios disponíveis
 */
router.get('/municipios', async (req, res) => {
  try {
    await getDatabase();
    const rows = exec(`
      SELECT cd_ibge, nm_municipio, COUNT(*) as total
      FROM licitacoes
      GROUP BY cd_ibge, nm_municipio
      ORDER BY nm_municipio
    `);

    res.json({
      dados: rows.map(r => ({
        codigo: r.cd_ibge,
        nome: r.nm_municipio,
        total_licitacoes: r.total,
      })),
      total: rows.length,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * GET /api/pesquisa/estatisticas
 * Estatísticas gerais do banco
 */
router.get('/estatisticas', async (req, res) => {
  try {
    await getDatabase();
    const stats = get(`
      SELECT
        COUNT(*) as total_licitacoes,
        COUNT(DISTINCT cd_ibge) as total_municipios,
        COUNT(DISTINCT nm_entidade) as total_entidades,
        COUNT(DISTINCT nm_pessoa) as total_fornecedores,
        MIN(nr_ano_licitacao) as ano_min,
        MAX(nr_ano_licitacao) as ano_max,
        COUNT(DISTINCT ds_modalidade_licitacao) as total_modalidades
      FROM licitacoes
    `);

    res.json({ dados: stats });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
