# gptgov API — Design system (tokens & componentes)

Guia de componentes e tokens para designers e desenvolvedores.  
**Nota sobre Figma:** não há arquivo `.fig` binário neste repositório. Use `FIGMA-BRIEF.md` para recriar o arquivo no Figma em minutos.

---

## 1. Tokens de cor

| Token | Hex | Uso |
|-------|-----|-----|
| `primary` | `#0B5FFF` | CTAs, links, destaques |
| `primary-hover` | `#0948CC` | Hover de botão primário |
| `primary-soft` | `#EEF4FF` | Fundos suaves, chips |
| `accent` | `#00B3A6` | Ênfase secundária, sucesso parcial |
| `accent-soft` | `#E6FAF7` | Badges, estados positivos leves |
| `neutral-dark` | `#0F1724` | Títulos, texto forte, code bg |
| `neutral-mid` | `#475569` | Corpo de texto |
| `neutral-muted` | `#94A3B8` | Labels, placeholders |
| `border` | `#E2E8F0` | Bordas e divisores |
| `bg` | `#FFFFFF` | Fundo principal |
| `bg-alt` | `#F8FAFC` | Seções alternadas |
| `success` | `#10B981` | Confirmações |
| `warning` | `#F59E0B` | Avisos |
| `danger` | `#EF4444` | Erros / labels de problema |

Contraste alvo: texto `#475569` ou `#0F1724` sobre `#FFFFFF` ≥ **4.5:1**.

---

## 2. Tipografia

| Papel | Família | Peso | Tamanho (desktop) |
|-------|---------|------|-------------------|
| Display / H1 | Inter | 700 | clamp 2rem–3rem |
| H2 | Inter | 700 | clamp 1.75rem–2.25rem |
| H3 | Inter | 700 | 1.0625–1.125rem |
| Body | Inter | 400/500 | 16px |
| Small / meta | Inter | 500/600 | 12–14px |
| Code | JetBrains Mono | 400/500 | 13px |

---

## 3. Grid e espaçamento

- Container: **max-width 1200px**  
- Gutter: **24px**  
- Colunas: **12** (conceitual; layout em CSS Grid)  
- Escala: **4 · 8 · 16 · 24 · 32 · 48 · 64**  
- Radius: **12px** (cards), **20px** (hero/CTA), **10px** (botões)  
- Header height: **72px**

### Breakpoints

| Nome | Largura | Comportamento |
|------|---------|---------------|
| Mobile | ≤ 768px | 1 coluna, menu hamburger |
| Tablet | ≤ 1024px | 2 colunas em grids/pricing |
| Desktop | > 1024px | 3–4 colunas, hero split |

---

## 4. Componentes

### Navbar
- Estado default: transparente sobre hero  
- Estado `is-solid` (scroll > 12px): fundo branco 92% + blur + borda  
- Itens: Produto · Planos · Documentação · Preços · Segurança · FAQ  
- CTAs: Entrar (ghost) · Teste grátis (primary)

### Botões
- `btn--primary` — fundo primary, sombra azul  
- `btn--secondary` — outline  
- `btn--ghost` — texto only  
- Altura mínima **44px** (acessibilidade toque)

### Cards
- Feature card: ícone 48×48 + título + texto  
- Problem/solution: labels coloridos  
- Pricing: 4 tiers; featured com borda primary e escala 1.02  
- Testimonial: aspas + avatar iniciais + cargo  

### Code block
- Fundo `#0F1724`, mono, botão **Copiar**  
- Usado na demo e nos snippets  

### Modal
- Signup e Demo  
- Backdrop blur, foco no primeiro campo, Escape fecha  
- Checkbox de consentimento LGPD **obrigatório**

### Cookie banner
- Canto inferior direito (mobile: full width)  
- Aceitar / Só essenciais → `localStorage`

### FAQ
- `<details>` / `<summary>` nativo (sem JS pesado)

---

## 5. Ícones e assets

| Arquivo | Descrição |
|---------|-----------|
| `assets/logo.svg` | Logotipo dark |
| `assets/logo-white.svg` | Logotipo footer |
| `assets/icons/*.svg` | API, search, integration, sla, security, docs, support |
| `assets/illustrations/hero-dataflow.svg` | Hero data-flow govtech |

Estilo de ícone: **linear**, stroke 2px, cores primary + accent.

---

## 6. Acessibilidade

- Skip implícito via âncoras e foco visível (`:focus-visible`)  
- `aria-label` em menu, modais e logo  
- Contraste ≥ 4.5:1  
- Navegação por teclado em modais e formulários  
- `prefers-reduced-motion` desliga animações  

---

## 7. Implementação

Tokens em CSS custom properties: `landing/css/styles.css` (`:root`).  
Não há build step: HTML estático + CSS + JS vanilla.
