# Landing page — gptgov API

Página de vendas profissional (pt-BR) para converter gestores públicos, integradores e empresas fornecedoras em clientes da **gptgov API**.

Gerada a partir do brief em `../pagina-api.md`.

---

## Estrutura

```
landing/
├── index.html              # Página completa (produção)
├── css/styles.css          # Design tokens + layout responsivo
├── js/main.js              # Navbar, demo, modals, cookies, clipboard
├── assets/
│   ├── logo.svg
│   ├── logo-white.svg
│   ├── icons/              # SVG lineares
│   └── illustrations/      # Hero data-flow
├── CONTEUDO.md             # Texto puro para revisão editorial
├── DESIGN-SYSTEM.md        # Tokens e componentes
├── FIGMA-BRIEF.md          # Instruções para montar o Figma
└── README.md               # Este arquivo
```

---

## Como visualizar localmente

### Opção A — abrir o arquivo

```bash
# Windows
start landing/index.html

# macOS
open landing/index.html
```

### Opção B — servidor estático (recomendado)

```bash
cd landing
npx --yes serve -l 5173
# ou
python -m http.server 5173
```

Acesse: http://localhost:5173

---

## Deploy

### Vercel

```bash
cd landing
npx vercel
```

Ou conecte o repositório e defina **Root Directory** = `landing`.

### Netlify

```bash
cd landing
npx netlify deploy --prod --dir=.
```

Ou: Site settings → Build → Publish directory = `landing`.

### AWS S3 + CloudFront

```bash
aws s3 sync ./landing s3://SEU-BUCKET --delete
# Invalide o cache CloudFront após o sync
```

Configure o bucket para static website hosting e HTTPS via CloudFront + ACM.

### GitHub Pages

Publique a pasta `landing/` como root do site ou use Action `peaceiris/actions-gh-pages` com `publish_dir: landing`.

---

## Variáveis / integrações (pós-lançamento)

| Item | Onde plugar |
|------|-------------|
| Domínio real da API | Substituir `api.seudominio.com` no HTML/JS |
| Signup real | `signupForm` → POST backend/CRM |
| Demo request | `demoForm` → webhook (Zapier/Make/HubSpot) |
| Stripe | Links “Assinar” → Checkout Sessions |
| Analytics | Após consentimento em `main.js` (`gptgovAnalytics`) — Plausible e/ou GA4 |
| Status page | Link do footer → Statuspage / Better Stack |
| Termos / Privacidade | URLs reais no footer e nos checkboxes |

---

## Checklist de lançamento

### Infra
- [ ] Domínio e DNS (A/CNAME)
- [ ] SSL/TLS (Let's Encrypt / ACM / Cloudflare)
- [ ] HTTPS redirect
- [ ] Página de status

### Conteúdo & legal
- [ ] Revisar copy em `CONTEUDO.md`
- [ ] Logos reais de clientes (com autorização)
- [ ] Termos de uso e Política de Privacidade publicados
- [ ] Checkbox LGPD funcional e linkado
- [ ] Depoimentos reais (substituir placeholders)

### Produto
- [ ] OpenAPI / docs linkados
- [ ] Trial 14 dias configurado no backend
- [ ] Stripe (Starter/Professional) + invoice Enterprise
- [ ] E-mails transacionais (confirmação de conta / API Key)

### Observabilidade
- [ ] Sentry (front, se houver SPA futura)
- [ ] Plausible ou GA4 **após** consentimento
- [ ] Uptime check na landing e na API

### Performance & SEO
- [ ] Title / meta / OG validados
- [ ] Lighthouse ≥ 90 (Performance, A11y, Best Practices, SEO)
- [ ] `favicon` e `og:image` PNG 1200×630 (export do Figma)

---

## Snippets de integração (docs)

### curl

```bash
curl -H "x-api-key: SUA_API_KEY" \
  "https://api.seudominio.com/api/pesquisa?q=cimento&limite=5"
```

### JavaScript

```js
const res = await fetch(
  "https://api.seudominio.com/api/pesquisa?q=cimento&limite=5",
  { headers: { "x-api-key": "SUA_API_KEY" } }
);
const data = await res.json();
```

### Python

```python
import requests

r = requests.get(
    "https://api.seudominio.com/api/pesquisa",
    params={"q": "cimento", "limite": 5},
    headers={"x-api-key": "SUA_API_KEY"},
    timeout=30,
)
print(r.json())
```

---

## Fluxo de signup (produto)

1. Usuário preenche modal (nome, e-mail, órgão, plano, consentimento LGPD).  
2. Backend cria tenant + gera API Key.  
3. E-mail com key + link para docs/console.  
4. Usuário testa no console → integra em produção.  
5. Dashboard de uso, rate-limit e faturamento (Stripe).

*(O formulário atual é protótipo front-end com estado de sucesso simulado.)*

---

## Acessibilidade

- Contraste AA, foco visível, labels em formulários  
- Menu mobile com `aria-expanded`  
- Modais com `role="dialog"` e Escape para fechar  
- Banner de cookies com escolha explícita  

---

## Licença de assets

Ícones e ilustração SVG criados para este projeto. Substitua logos de clientes por material licenciado/autorizado antes do go-live.
