# Brief Figma — gptgov API Landing

Use este arquivo para montar o arquivo Figma oficial (o repositório entrega HTML/CSS de produção; o `.fig` é recriado no Figma a partir destes tokens e frames).

---

## Frames obrigatórios

1. **Desktop 1440** — página completa  
2. **Tablet 768** — página completa  
3. **Mobile 390** — página completa  
4. **Components** — botões, cards, inputs, badges, navbar, modal, cookie  
5. **Tokens** — página de cores, type scale, spacing  

---

## Auto-layout sugerido

- Página: vertical, padding lateral 24–120  
- Hero: horizontal (Desktop), vertical (Mobile), gap 48  
- Grids de cards: wrap, gap 24  
- Pricing: 4 colunas → 2 → 1  

---

## Comentários para o designer (colar como comments no Figma)

### Hero
> [ASSET NEEDED] Ilustração vetorial “data-flow govtech”: mapa do Brasil estilizado, pontos de dados, mini chart e card de código.  
> Alt text: “Mapa do Brasil com pontos de dados de licitações e notas fiscais.”  
> Referência atual: `assets/illustrations/hero-dataflow.svg` (substituir por versão refinada se houver brand book).

### Trust logos
> [ASSET NEEDED] 4–6 logos reais de clientes em monocromático cinza. Placeholders atuais são caixas tracejadas — **não publicar em produção** sem logos autorizados.

### Features
> Ícones lineares 32px: API, busca, integração, SLA. SVGs em `assets/icons/`. Manter stroke 2 e cores primary/accent.

### Pricing
> Destacar Starter com badge “Mais popular” e ribbon “14 dias grátis”.  
> Enterprise: preço “Custom” + CTA “Pedir proposta”.

### Demo
> Bloco esquerdo: input + chips de sugestão.  
> Bloco direito: JSON syntax highlight.  
> Opcional: screenshot real do console da API quando existir.

### Segurança
> Badges TLS / LGPD / SLA como pills, não como selos fake de certificação (evitar greenwashing).

### Fotos (opcional)
> Preferir fotos CC0 de cidades/serviços públicos com overlay gráfico azul/teal.  
> **Não** usar stock genérico de “aperto de mão corporativo” se houver alternativa de infraestrutura/dados.

### Modal
> Estados: default, error de validação, success.  
> Checkbox LGPD sempre visível e obrigatório.

---

## Export

| Asset | Formato | Densidade |
|-------|--------|-----------|
| Logo | SVG + PNG | 1x, 2x |
| Ícones | SVG | — |
| Hero | SVG ou PNG | 2x |
| OG image | PNG 1200×630 | 1x |

OG image: exportar hero cropado com título curto “gptgov API”.
