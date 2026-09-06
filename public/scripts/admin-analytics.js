(() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    loading: $("analyticsLoading"),
    loggedOut: $("analyticsLoggedOut"),
    forbidden: $("analyticsForbidden"),
    console: $("analyticsConsole"),
    notice: $("analyticsNotice"),
    sources: $("analyticsSources"),
    campaigns: $("analyticsCampaigns"),
    timeline: $("analyticsTimeline"),
  };
  let currentDays = 7;

  function getToken() {
    return localStorage.getItem("volynx_access_token") || "";
  }

  function setVisible(target) {
    [el.loading, el.loggedOut, el.forbidden, el.console].forEach((node) => {
      if (node) node.hidden = node !== target;
    });
  }

  function text(node, value) {
    if (node) node.textContent = value;
  }

  function setMetric(name, value) {
    const node = document.querySelector(`[data-analytics-value="${name}"]`);
    if (node) node.textContent = new Intl.NumberFormat("pt-BR").format(Number(value || 0));
  }

  function list(node, items, empty) {
    if (!node) return;
    node.textContent = "";
    if (!items?.length) {
      const message = document.createElement("p");
      message.className = "analytics-empty";
      message.textContent = empty;
      node.appendChild(message);
      return;
    }
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "analytics-list__row";
      const label = document.createElement("span");
      label.className = "analytics-list__label";
      label.textContent = item.label;
      const count = document.createElement("strong");
      count.className = "analytics-list__count";
      count.textContent = new Intl.NumberFormat("pt-BR").format(item.count);
      row.append(label, count);
      node.appendChild(row);
    });
  }

  function timeline(rows) {
    if (!el.timeline) return;
    el.timeline.textContent = "";
    if (!rows?.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "Ainda não há eventos consentidos neste intervalo.";
      row.appendChild(cell);
      el.timeline.appendChild(row);
      return;
    }
    rows.forEach((item) => {
      const row = document.createElement("tr");
      [item.date, item.visitors, item.cta_clicks, item.signups, item.checkout_started].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      el.timeline.appendChild(row);
    });
  }

  function render(data) {
    const funnel = data.funnel || {};
    ["visitors", "cta_clicks", "signup_started", "signup_confirmation_requested", "checkout_redirected", "checkout_failed"]
      .forEach((key) => setMetric(key, funnel[key]));
    list(el.sources, data.top_sources, "Nenhuma origem registrada ainda.");
    list(el.campaigns, data.top_campaigns, "Nenhuma campanha com consentimento registrada ainda.");
    timeline(data.timeline);
    text(el.notice, `Atualizado agora · últimos ${data.range?.days || currentDays} dias · ${funnel.page_views || 0} visualizações de página`);
  }

  async function load(days) {
    currentDays = days;
    const token = getToken();
    if (!token) {
      setVisible(el.loggedOut);
      return;
    }
    text(el.notice, "Atualizando as métricas…");
    try {
      const configResponse = await fetch("/config.json", { cache: "no-store" });
      const config = await configResponse.json();
      const baseUrl = String(config?.functionsUrl || "").replace(/\/$/, "");
      if (!baseUrl) throw new Error("analytics_unavailable");
      const response = await fetch(`${baseUrl}/analytics-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ days }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setVisible(el.loggedOut);
        return;
      }
      if (response.status === 403) {
        setVisible(el.forbidden);
        return;
      }
      if (!response.ok || !data?.ok) throw new Error(data?.error || "analytics_unavailable");
      setVisible(el.console);
      render(data);
    } catch (_) {
      setVisible(el.console);
      text(el.notice, "Não foi possível carregar as métricas agora. Tente novamente em alguns instantes.");
    }
  }

  document.querySelectorAll("[data-analytics-days]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-analytics-days]").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      void load(Number(button.dataset.analyticsDays || 7));
    });
  });

  void load(currentDays);
})();
