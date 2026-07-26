/**
 * gptgov API — landing interactions
 * Navbar, demo JSON, modals, cookies, copy-to-clipboard
 */
(function () {
  "use strict";

  const header = document.getElementById("header");
  const navToggle = document.getElementById("navToggle");
  const yearEl = document.getElementById("year");

  /* ---------- Year ---------- */
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Header solid on scroll ---------- */
  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-solid", window.scrollY > 12);
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- Mobile nav ---------- */
  if (navToggle && header) {
    navToggle.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });
    header.querySelectorAll(".nav a").forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Demo data ---------- */
  const samples = {
    cimento: {
      dados: [
        {
          municipio: { codigo: "410690", nome: "CURITIBA" },
          entidade: "MUNICÍPIO DE CURITIBA",
          licitacao: {
            id: "2481001",
            ano: 2026,
            modalidade: "Pregão",
            data_homologacao: "2026-03-12",
          },
          fornecedor: { nome: "MATERIAIS XYZ LTDA", documento: "12.***.***/****-90" },
          item: {
            descricao: "CIMENTO PORTLAND CP-II-Z-32, saco 50kg",
            quantidade: 2000,
            unidade_medida: "Saco",
          },
          valores: { proposta_unitario: 32.9, vencedor_total: 65800 },
        },
      ],
      paginacao: { pagina: 1, limite: 5, total: 1284, total_paginas: 257 },
      termo_busca: "cimento",
    },
    motobomba: {
      dados: [
        {
          municipio: { codigo: "410010", nome: "ABATIÁ" },
          entidade: "MUNICÍPIO DE ABATIÁ",
          licitacao: {
            id: "2476479",
            ano: 2026,
            modalidade: "Pregão",
            data_homologacao: "2026-01-29",
          },
          fornecedor: { nome: "HIDRO EQUIPAMENTOS ME", documento: "11.***.***/****-13" },
          item: {
            descricao: "MOTOBOMBA centrífuga 3CV monofásica",
            quantidade: 4,
            unidade_medida: "Unidade",
          },
          valores: { proposta_unitario: 1890.0, vencedor_total: 7560.0 },
        },
      ],
      paginacao: { pagina: 1, limite: 5, total: 86, total_paginas: 18 },
      termo_busca: "motobomba",
    },
    camiseta: {
      dados: [
        {
          municipio: { codigo: "410140", nome: "APUCARANA" },
          entidade: "MUNICÍPIO DE APUCARANA",
          licitacao: {
            id: "2492002",
            ano: 2026,
            modalidade: "Dispensa",
            data_homologacao: "2026-02-18",
          },
          fornecedor: { nome: "CONFECÇÕES SUL", documento: "45.***.***/****-22" },
          item: {
            descricao: "CAMISETA malha PV, manga curta, tamanho M",
            quantidade: 500,
            unidade_medida: "Unidade",
          },
          valores: { proposta_unitario: 18.5, vencedor_total: 9250.0 },
        },
      ],
      paginacao: { pagina: 1, limite: 5, total: 412, total_paginas: 83 },
      termo_busca: "camiseta",
    },
    notebook: {
      dados: [
        {
          municipio: { codigo: "410480", nome: "CASCAVEL" },
          entidade: "MUNICÍPIO DE CASCAVEL",
          licitacao: {
            id: "2500110",
            ano: 2026,
            modalidade: "Pregão",
            data_homologacao: "2026-04-02",
          },
          fornecedor: { nome: "TECH GOV SOLUÇÕES", documento: "33.***.***/****-01" },
          item: {
            descricao: "NOTEBOOK i5 16GB SSD 512GB, garantia 36 meses",
            quantidade: 30,
            unidade_medida: "Unidade",
          },
          valores: { proposta_unitario: 3899.0, vencedor_total: 116970.0 },
        },
      ],
      paginacao: { pagina: 1, limite: 5, total: 57, total_paginas: 12 },
      termo_busca: "notebook",
    },
  };

  function buildResponse(term) {
    const key = Object.keys(samples).find((k) => term.toLowerCase().includes(k));
    if (key) {
      return { ...samples[key], termo_busca: term };
    }
    return {
      dados: [],
      paginacao: { pagina: 1, limite: 5, total: 0, total_paginas: 0 },
      termo_busca: term,
      mensagem: "Nenhum resultado na demo local. Experimente: cimento, motobomba, camiseta, notebook.",
    };
  }

  const demoQuery = document.getElementById("demoQuery");
  const demoJson = document.getElementById("demoJson");
  const demoCurl = document.getElementById("demoCurl");
  const demoRun = document.getElementById("demoRun");
  const suggestions = document.getElementById("demoSuggestions");

  function runDemo(term) {
    const q = (term || "cimento").trim() || "cimento";
    if (demoQuery) demoQuery.value = q;
    const payload = buildResponse(q);
    if (demoJson) {
      demoJson.textContent = JSON.stringify(payload, null, 2);
    }
    if (demoCurl) {
      demoCurl.textContent =
        `curl -H "x-api-key: SUA_API_KEY" \\\n  "https://api.seudominio.com/api/pesquisa?q=${encodeURIComponent(q)}&limite=5"`;
    }
    if (suggestions) {
      suggestions.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.q === q.toLowerCase());
      });
    }
  }

  if (demoRun) demoRun.addEventListener("click", () => runDemo(demoQuery?.value));
  if (demoQuery) {
    demoQuery.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runDemo(demoQuery.value);
      }
    });
  }
  if (suggestions) {
    suggestions.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-q]");
      if (btn) runDemo(btn.dataset.q);
    });
  }
  runDemo("cimento");

  /* ---------- Copy ---------- */
  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) {
        const prev = btn.textContent;
        btn.textContent = "Copiado!";
        setTimeout(() => {
          btn.textContent = prev;
        }, 1500);
      }
    } catch {
      /* ignore */
    }
  }

  document.querySelectorAll(".copy-btn[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.getAttribute("data-copy"), btn));
  });
  const copyJson = document.getElementById("copyJson");
  if (copyJson && demoJson) {
    copyJson.addEventListener("click", () => copyText(demoJson.textContent || "", copyJson));
  }

  /* ---------- Modals ---------- */
  const modals = {
    signup: document.getElementById("modal-signup"),
    demo: document.getElementById("modal-demo"),
  };
  let lastFocus = null;

  function openModal(name, plan) {
    const modal = modals[name];
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (name === "signup" && plan) {
      const select = document.getElementById("signupPlan");
      if (select) {
        const opt = Array.from(select.options).find((o) => o.value === plan);
        if (opt) select.value = plan;
      }
    }
    const focusable = modal.querySelector("input, button, select, textarea");
    if (focusable) focusable.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.hidden = true;
    document.body.style.overflow = "";
    // reset success states
    const success = modal.querySelector(".form-success");
    const wrap = modal.querySelector("[id$='FormWrap']");
    if (success) success.classList.remove("is-visible");
    if (wrap) wrap.style.display = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  document.querySelectorAll("[data-open-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      openModal(el.getAttribute("data-open-modal"), el.getAttribute("data-plan"));
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      const modal = el.closest(".modal");
      closeModal(modal);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      Object.values(modals).forEach((m) => {
        if (m && m.classList.contains("is-open")) closeModal(m);
      });
    }
  });

  function wireForm(formId, successId, wrapId) {
    const form = document.getElementById(formId);
    const success = document.getElementById(successId);
    const wrap = document.getElementById(wrapId);
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (wrap) wrap.style.display = "none";
      if (success) success.classList.add("is-visible");
      form.reset();
    });
  }
  wireForm("signupForm", "signupSuccess", "signupFormWrap");
  wireForm("demoForm", "demoSuccess", "demoFormWrap");

  /* ---------- Cookies ---------- */
  const cookieBanner = document.getElementById("cookieBanner");
  const cookieKey = "gptgov_cookie_consent";

  function setConsent(value) {
    try {
      localStorage.setItem(cookieKey, value);
    } catch {
      /* ignore */
    }
    if (cookieBanner) cookieBanner.classList.remove("is-visible");
    // Analytics hook: only load if accepted
    if (value === "all") {
      window.gptgovAnalytics = { enabled: true };
      // Ex.: Plausible / GA — carregar scripts aqui
    }
  }

  try {
    const existing = localStorage.getItem(cookieKey);
    if (!existing && cookieBanner) {
      cookieBanner.classList.add("is-visible");
    }
  } catch {
    if (cookieBanner) cookieBanner.classList.add("is-visible");
  }

  document.getElementById("cookieAccept")?.addEventListener("click", () => setConsent("all"));
  document.getElementById("cookieReject")?.addEventListener("click", () => setConsent("essential"));
})();
