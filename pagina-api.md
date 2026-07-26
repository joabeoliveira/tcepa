Abaixo está um prompt completo e pronto para você colar no Grok Build (ou outro gerador) — ele descreve com riqueza de detalhes a página de vendas, estrutura, copy, estilo visual, componentes e entregáveis. 

Prompt (cole no Grok Build)
---
Crie uma landing page profissional para vender acesso a um conjunto de APIs de dados públicas e govtech chamadas “gptgov API”. Objetivo: converter gestores públicos, integradores e empresas fornecedoras em clientes pagantes. Entregáveis: HTML/CSS responsivo pronto para produção, variantes de desktop/tablet/mobile, assets (SVG/PNG), e um arquivo de design Figma + guia de componentes (tokens: cores, tipografia, espaçamento). Forneça também texto final (copy) pronto para uso e exemplos de imagens/ilustrações com instruções para o ilustrador/designer.

1) Público-alvo
- CTOs e engenheiros de govtech de prefeituras/secretarias
- Analistas de compras e fornecedores que precisam de dados de licitações e notas fiscais
- Startups/empresas que integrarão dados via API para produtos pagos

2) Tom e posicionamento
- Tom: autoritário, confiável, técnico e acessível (pt-BR).  
- Racional: “dados públicos como produto”; credibilidade: segurança, LGPD, compliance, SLA.  
- Promessa: “Acesso confiável e pesquisável aos dados oficiais para decisões e integrações em minutos.”

3) Estrutura da página (ordem e conteúdo)
- Header (fixo, transparente → solid on scroll): logotipo, menu (Produto • Planos • Documentação • Preços • Segurança • Blog • Entrar / Teste grátis)
- Hero:
  - Headline forte (ex.): “APIs de Dados Públicos para decisões e integrações govtech”
  - Subheadline: “Acesse licitações, notas fiscais e indicadores com endpoints prontos, indexação por texto e SLA empresarial.”
  - 2 CTAs: “Testar grátis 14 dias” (primário) e “Solicitar demo” (secundário)
  - Visual: ilustração data-driven (mapa do Brasil com pontos e gráficos + código de requisição à direita)
  - Trust line: “Confiado por órgãos públicos e fornecedores” + logos clientes (placeholder)
- Problema • Solução (3 colunas):
  - Problema 1: dados dispersos e inconsistentes → Solução: APIs normalizadas e atualizadas
  - Problema 2: demora na integração → Solução: SDKs, exemplos e suporte
  - Problema 3: compliance/segurança → Solução: LGPD-ready, auditoria e criptografia
- Recursos principais (cards):
  - Endpoints prontos (busca textual, filtros por município/ano/fornecedor)
  - Indexação por trigram/FTS (resultados relevantes)
  - Integração simples (REST + exemplos em curl, Python, JS)
  - SLA & rate-limits configuráveis, logs e métricas
- Demonstração visual / Live demo (embed):
  - Caixa interativa (simular query com auto-suggestion) + snippet de retorno JSON exemplo
- Planos e Preços (destaque):
  - Tabela comparativa com 4 colunas: Free, Starter, Professional, Enterprise
    - Free: 1.000 req/mês, limite 1r/s, docs, comunidade
    - Starter: 50k req/mês, 10r/s, suporte por e-mail, tokens de API
    - Professional: 500k req/mês, 50r/s, SLA 99.9%, logs 90d, 1 integração onboarding
    - Enterprise: Personalizado, instância dedicada, SSO, suporte 24/7, contrato e preços por volume
  - CTA em cada coluna: “Assinar” ou “Pedir proposta”
  - Badge: “14 dias grátis no Starter”
- Fluxo de onboarding (3 passos):
  1. Criar conta e gerar API Key
  2. Testar endpoints no console
  3. Integrar e monitorar com dashboard
- Segurança & Compliance:
  - LGPD: minimização, anonimização, logs e retenção
  - Criptografia TLS, gestão de chaves, revisão de pentest
  - Certificados e políticas (links para docs)
- Casos de uso / Exemplos reais:
  - Dashboard de compras municipais, pesquisa de preços para fornecedores, monitoramento de despesas
  - Pequenas histórias com métricas (ex.: “Prefeitura X reduziu 30% no tempo de cotação”)
- Testemunhos & logos de clientes
- FAQ (perguntas técnicas e comerciais)
- Rodapé:
  - Links: Docs, Status, Termos, Política de Privacidade, Contato, Blog
  - Social/Contato, endereço, certificado de segurança

4) Copywriting — textos chave (prontos)
- Headline: “APIs confiáveis de dados públicos para produtos e decisões govtech”
- Subheadline: “Licitações, notas fiscais e indicadores prontos para integrar — escala, segurança e compliance.”
- CTA primária: “Testar grátis 14 dias”
- CTA secundária: “Pedir demo”
- Hero bullet: “Dados normalizados • Busca por texto • Atualização semanal • SSL e LGPD”
- Planos — microcopy: “Limites mensais, suporte e SLA variam por plano. Atualize a qualquer momento.”

5) Design system (tokens & componentes)
- Paleta de cores:
  - Primary: #0B5FFF (azul govtech)
  - Accent: #00B3A6 (teal)
  - Neutral dark: #0F1724
  - Neutral mid: #475569
  - Success: #10B981, Warning: #F59E0B, Danger: #EF4444
- Tipografia:
  - Headings: Inter Bold (grande impacto)
  - Body: Inter Regular
  - Code: JetBrains Mono / Roboto Mono
- Grid & espaçamento:
  - 12-col grid, gutter 24px, container max-width 1200px
  - Spacing scale: 4,8,16,24,32,48,64
- Componentes prontos:
  - Navbar com dropdowns, CTA destacado
  - Hero with split (visual + code)
  - Cards (feature, pricing, testimonial)
  - Data table and code blocks with copy-to-clipboard
  - Modal (signup / demo request)
  - Banner de cookie & consent LGPD
- Acessibilidade:
  - Contrast >= 4.5:1, keyboard nav, aria labels nos formulários

6) Imagens e assets (direção)
- Hero: ilustração vetorial style “data-flow govtech” (mapa, pontos, gráficos, linhas de integração). Alt text: “Mapa do Brasil com pontos de dados de licitações e notas fiscais.”
- Seção de features: ícones lineares (SVG) para “API”, “Segurança”, “Docs”, “Suporte”.
- Planos: ilustrações de escala (bar charts) + badges.
- Screenshot do console/response: bloco de código real com destaque visual.
- Fotos: use imagens estilizadas de cidades/serviços públicos, com overlay gráfico; preferir fotos CC0 ou banco licenciado.

7) Elementos de conversão e confiança
- Trial: 14 dias sem cartão (ou com cartão dependendo do seu fluxo)
- Garantia: “Cancelamento 100% simples”
- Trust: badges de segurança (TLS), LGPD-ready, GDPR compatibility, “SLA 99.9%”
- Integração de pagamentos sugerida: Stripe (planos recorrentes) + invoices
- Integração de monitoramento: Sentry + Prometheus/Grafana + status page

8) SEO, metatags e analytics
- Title: “gptgov API — APIs de Dados Públicos para GovTech”
- Meta description: “Acesse licitações, notas fiscais e indicadores oficiais via API. Integração rápida, segurança e SLA empresarial.”
- OG tags com imagem hero
- Analytics: Google Analytics + Plausible (privacidade)

9) Requisitos técnicos/entregáveis
- HTML semantic, CSS modular (Tailwind ou SCSS), JS mínimo (vanilla ou React components entregues separadamente)
- Figma file com componentes e tokens
- Arquivos SVG e PNG em /public/assets
- Documentação do fluxo de signup + exemplo de request (curl, Python, JS)
- Checklist de lançamento: SSL, domínio, DNS, políticas, página de status

10) Microcopy e exemplos de snippets
- Curl exemplo:
  curl -H "x-api-key: SUA_API_KEY" "https://api.seudominio.com/notas?q=cimento&limite=5"
- Snippet JS:
  fetch('https://api.seudominio.com/notas?q=cimento', { headers: { 'x-api-key': 'SUA_API_KEY' } })

11) Regras de conformidade e privacidade
- Checkbox de consentimento para coleta de email
- Link claro para Política de Privacidade e Termos (LGPD)
- Incluir opção de data anonymization em endpoints se retornar PII

12) Entrega final esperada do builder
- HTML/CSS/JS + assets + Figma + arquivo README com instruções de deploy (deploy via S3/Netlify/Vercel) + checklist de pós-lançamento.

Instruções finais para o gerador
- Produza a página em pt-BR, com linguagem clara e técnica onde necessário.  
- Gere também uma versão “conteúdo puro” (somente texto e hierarquia H1/H2/H3) para revisão editorial.  
- Forneça comentários no Figma sobre quais imagens/elements precisam ser produzidos por designer.  
- Priorize performance e SEO.

---
