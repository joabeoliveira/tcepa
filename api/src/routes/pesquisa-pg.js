/**
 * Rotas de pesquisa - Versão PostgreSQL
 * Usa busca textual com ILIKE + índice trigram para performance
 */
const express = require('express');
const { exec, get } = require('./database-pg');

const router = express.Router();

/**
 * GET /api/pesquisa
 * Busca itens por descrição
 */
router.get('/', async (req, res) => {
  try {
    const { q, limite = 20, pagina = 1, municipio, ano, ordenar = 'relevancia' } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        erro: 'Parâmetro "q" é obrigatório',
        exemplo: '/api/pesquisa?q=motobomba',
      });
    }

    const limit = Math.min(Math.max(parseInt(limite) || 20, 1), 100);
    const page = Math.max(parseInt(pagina) || 1, 1);
    const offset = (page - 1) * limit;

    const termo = q.trim();
    const palavras = termo.split(/\s+/).filter(Boolean);

    // Constrói busca com ILIKE (case-insensitive) usando índice trigram
    const conditions = [];
    const params = [];

    const likeConditions = palavras.map((_, i) => `l.ds_item ILIKE $${params.length + 1}`);
    params.push(...palavras.map(p => `%${p}%`));
    conditions.push(`(${likeConditions.join(' AND ')})`);

    if (municipio) {
      params.push(municipio.toUpperCase());
      conditions.push(`l.nm_municipio = $${params.length}`);
    }

    if (ano) {
      params.push(parseInt(ano));
      conditions.push(`l.nr_ano_licitacao = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    // Ordenação
    let orderClause;
    switch (ordenar) {
      case 'preco':
        orderClause = 'l.vl_licitacao_vencedor_licitacao ASC NULLS LAST';
        break;
      case 'data':
        orderClause = 'l.dt_homologacao DESC NULLS LAST';
        break;
      case 'relevancia':
      default:
        orderClause = 'l.nr_classificacao ASC NULLS LAST, l.dt_homologacao DESC NULLS LAST';
        break;
    }

    // Query principal
    const sql = `
      SELECT
        l.id, l.cd_ibge, l.nm_municipio, l.nm_entidade,
        l.id_licitacao, l.nr_ano_licitacao, l.nr_licitacao,
        l.ds_modalidade_licitacao, l.nm_pessoa, l.nr_documento,
        l.nr_lote, l.nr_item, l.nr_quantidade, l.ds_unidade_medida,
        l.vl_minimo_unitario_item, l.vl_minimo_total,
        l.vl_maximo_unitario_item, l.vl_maximo_total,
        l.ds_item, l.vl_proposta_item, l.vl_licitacao_vencedor_licitacao,
        l.nr_classificacao, l.dt_homologacao, l.data_referencia
      FROM licitacoes l
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // Query de total
    const countSql = `
      SELECT COUNT(*) as total
      FROM licitacoes l
      WHERE ${whereClause}
    `;

    const totalResult = await get(countSql, params);
    const total = totalResult ? parseInt(totalResult.total) : 0;

    const rows = await exec(sql, [...params, limit, offset]);

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
    res.status(500).json({ erro: 'Erro interno ao realizar a busca', detalhe: err.message });
  }
});

/**
 * GET /api/pesquisa/municipios
 */
router.get('/municipios', async (req, res) => {
  try {
    const rows = await exec(`
      SELECT cd_ibge, nm_municipio, COUNT(*) as total
      FROM licitacoes
      GROUP BY cd_ibge, nm_municipio
      ORDER BY nm_municipio
    `);
    res.json({
      dados: rows.map(r => ({ codigo: r.cd_ibge, nome: r.nm_municipio, total_licitacoes: parseInt(r.total) })),
      total: rows.length,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * GET /api/pesquisa/estatisticas
 */
router.get('/estatisticas', async (req, res) => {
  try {
    const stats = await get(`
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
    res.json({
      dados: {
        ...stats,
        total_licitacoes: parseInt(stats.total_licitacoes),
        total_municipios: parseInt(stats.total_municipios),
        total_entidades: parseInt(stats.total_entidades),
        total_fornecedores: parseInt(stats.total_fornecedores),
        total_modalidades: parseInt(stats.total_modalidades),
      }
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = { router };
