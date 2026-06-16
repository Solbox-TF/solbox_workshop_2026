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

  function getApiUrls() {
    const override = normalizeApiUrl(localStorage.getItem(API_URL_KEY));
    if (override) return [override];

    const urls = [
      normalizeApiUrl(window.RECREATION_CONFIG?.apiUrl),
      ...(window.RECREATION_CONFIG?.fallbackApiUrls ?? []).map(normalizeApiUrl),
    ].filter(Boolean);

    return [...new Set(urls)];
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
    const apiUrls = getApiUrls();
    if (apiUrls.length === 0) return cloneGames(fallbackGames);

    for (const apiUrl of apiUrls) {
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
        console.warn(`Using bundled game data. Failed API: ${apiUrl}`, error);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    return cloneGames(fallbackGames);
  }

  async function saveGames(games, token) {
    const apiUrls = getApiUrls();
    if (apiUrls.length === 0) throw new Error("API URL이 설정되어 있지 않습니다.");

    let lastError;
    for (const apiUrl of apiUrls) {
      try {
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
      } catch (error) {
        lastError = error;
        console.warn(`Failed to save games through API: ${apiUrl}`, error);
      }
    }

    throw lastError ?? new Error("저장에 실패했습니다.");
  }

  window.RecreationData = {
    getApiUrl,
    getApiUrls,
    setApiUrl,
    loadGames,
    saveGames,
    cloneGames,
  };
})();
