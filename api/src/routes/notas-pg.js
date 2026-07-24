/**
 * Rotas para notas fiscais (itens NF-e) - PostgreSQL
 */
const express = require('express');
const { exec, get } = require('../database-pg');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { q, limite = 20, pagina = 1, municipio, ordenar = 'relevancia' } = req.query;
    if (!q || q.trim().length === 0) return res.status(400).json({ erro: 'Parâmetro "q" é obrigatório' });

    const limit = Math.min(Math.max(parseInt(limite) || 20,1),100);
    const page = Math.max(parseInt(pagina) || 1,1);
    const offset = (page -1) * limit;

    const termo = q.trim();
    const palavras = termo.split(/\s+/).filter(Boolean);

    const conditions = [];
    const params = [];

    const likeConditions = palavras.map((_, i) => `descricao ILIKE $${params.length + 1}`);
    params.push(...palavras.map(p => `%${p}%`));
    conditions.push(`(${likeConditions.join(' AND ')})`);

    if (municipio) { params.push(municipio); conditions.push(`municipio = $${params.length}`); }

    const where = conditions.join(' AND ');

    let orderClause = 'id ASC';
    if (ordenar === 'preco') orderClause = 'valor_unitario ASC NULLS LAST';

    const sql = `SELECT id, chave_acesso, numero_nf, serie, data_emissao, cd_ibge, municipio, cnpj_emitente, descricao, quantidade, unidade, valor_unitario, valor_total FROM notas_fiscais_items WHERE ${where} ORDER BY ${orderClause} LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    const countSql = `SELECT COUNT(*) as total FROM notas_fiscais_items WHERE ${where}`;

    const totalRes = await get(countSql, params);
    const total = totalRes ? parseInt(totalRes.total) : 0;

    const rows = await exec(sql, [...params, limit, offset]);

    res.json({
      dados: rows.map(r => ({
        id: r.id,
        chave: r.chave_acesso,
        numero: r.numero_nf,
        data_emissao: r.data_emissao,
        municipio: { codigo: r.cd_ibge, nome: r.municipio },
        fornecedor: { cnpj: r.cnpj_emitente },
        item: { descricao: r.descricao, quantidade: r.quantidade, unidade: r.unidade, valor_unitario: r.valor_unitario, valor_total: r.valor_total }
      })),
      paginacao: { pagina: page, limite: limit, total, total_paginas: Math.ceil(total/limit) },
      termo_busca: q
    });

  } catch (err) {
    console.error('Erro notas:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar notas', detalhe: err.message });
  }
});

router.get('/estatisticas', async (req, res) => {
  try {
    const stats = await get(`SELECT COUNT(*) as total, COUNT(DISTINCT cd_ibge) as total_municipios, COUNT(DISTINCT cnpj_emitente) as total_emitentes FROM notas_fiscais_items`);
    res.json({ dados: { total: parseInt(stats.total), total_municipios: parseInt(stats.total_municipios), total_emitentes: parseInt(stats.total_emitentes) } });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

module.exports = { router };
