const CORE = (window.VOLYNX_CORE_URL || "").replace(/\/$/, "");

export const api = {
  async request(endpoint, options = {}) {
    const url = `${CORE}/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  },

  register(email, password, organizationName) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, organizationName }),
    });
  },

  login(email, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  logout() {
    return this.request("/auth/logout", { method: "POST" });
  },

  getMe() {
    return this.request("/auth/me");
  },

  getLinks() {
    return this.request("/links");
  },

  createLink(destination_url, name, style_json) {
    return this.request("/links", {
      method: "POST",
      body: JSON.stringify({ destination_url, name, style_json }),
    });
  },

  updateLink(token, updates) {
    return this.request(`/links/${token}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  downloadLink(token, format) {
    return this.request(`/links/${token}/download`, {
      method: "POST",
      body: JSON.stringify({ format }),
    });
  },

  deleteLink(token) {
    return this.request(`/links/${token}`, { method: "DELETE" });
  },
};

window.api = api;
