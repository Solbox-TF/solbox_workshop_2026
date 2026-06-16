(function () {
  const API_URL_KEY = "recreation_api_url";

  function normalizeApiUrl(value) {
    return (value ?? "").trim().replace(/\/+$/, "");
  }

  function getApiUrl() {
    const override = normalizeApiUrl(localStorage.getItem(API_URL_KEY));
    if (override) return override;
    return normalizeApiUrl(window.RECREATION_CONFIG?.apiUrl);
  }

  function setApiUrl(value) {
    const normalized = normalizeApiUrl(value);
    if (normalized) {
      localStorage.setItem(API_URL_KEY, normalized);
    } else {
      localStorage.removeItem(API_URL_KEY);
    }
  }

  function cloneGames(games) {
    return JSON.parse(JSON.stringify(games));
  }

  async function loadGames(fallbackGames) {
    const apiUrl = getApiUrl();
    if (!apiUrl) return cloneGames(fallbackGames);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${apiUrl}/questions`, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (Array.isArray(payload.games) && payload.games.length > 0) {
        return payload.games;
      }
    } catch (error) {
      console.warn("Using bundled game data.", error);
    } finally {
      window.clearTimeout(timeout);
    }

    return cloneGames(fallbackGames);
  }

  async function saveGames(games, token) {
    const apiUrl = getApiUrl();
    if (!apiUrl) throw new Error("API URL이 설정되어 있지 않습니다.");

    const response = await fetch(`${apiUrl}/questions`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ games }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message ?? `저장 실패: HTTP ${response.status}`);
    }
    return payload;
  }

  window.RecreationData = {
    getApiUrl,
    setApiUrl,
    loadGames,
    saveGames,
    cloneGames,
  };
})();
