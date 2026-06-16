(function () {
  const STORAGE_KEY = "recreation_scores_v1";
  const teams = ["A팀", "B팀", "C팀"];
  const REMOTE_SAVE_DELAY = 350;

  function emptyScores() {
    return Object.fromEntries(teams.map((team) => [team, 0]));
  }

  function normalizeScores(value) {
    const source = value && typeof value === "object" ? value : {};
    return Object.fromEntries(
      teams.map((team) => [team, Math.max(0, Number.parseInt(source[team], 10) || 0)]),
    );
  }

  function normalizeEntry(entry, index = 0) {
    const game = String(entry?.game ?? "").trim();
    if (!game) return null;

    return {
      id: String(entry?.id ?? `score-${Date.now()}-${index}`),
      game,
      scores: normalizeScores(entry?.scores),
      createdAt: String(entry?.createdAt ?? new Date().toISOString()),
    };
  }

  function normalizeEntries(value) {
    if (!Array.isArray(value)) return [];
    return value.map(normalizeEntry).filter(Boolean);
  }

  function totalEntries(entries) {
    return entries.reduce((totals, entry) => {
      teams.forEach((team) => {
        totals[team] += entry.scores[team] ?? 0;
      });
      return totals;
    }, emptyScores());
  }

  function normalizeState(value) {
    const source = value && typeof value === "object" ? value : {};
    const entries = normalizeEntries(source.entries);
    const scores = entries.length > 0 ? totalEntries(entries) : normalizeScores(source.scores ?? source);
    return { scores, entries };
  }

  function readState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (_) {
      return { scores: emptyScores(), entries: [] };
    }
  }

  let scoreState = readState();
  let status = {
    state: window.RecreationData ? "loading" : "local",
    message: window.RecreationData ? "DB 점수를 불러오는 중" : "이 브라우저에만 저장 중",
  };
  let saveTimer = null;

  function emit() {
    window.dispatchEvent(new CustomEvent("recreation:scores", { detail: getScores() }));
    window.dispatchEvent(new CustomEvent("recreation:score-state", { detail: getScoreState() }));
  }

  function emitStatus() {
    window.dispatchEvent(new CustomEvent("recreation:scores-status", { detail: getStatus() }));
  }

  function setStatus(nextStatus) {
    status = { ...status, ...nextStatus };
    emitStatus();
  }

  function getApiUrls() {
    return window.RecreationData?.getApiUrls?.() ?? [];
  }

  function getScores() {
    return { ...scoreState.scores };
  }

  function getEntries() {
    return scoreState.entries.map((entry) => ({
      ...entry,
      scores: { ...entry.scores },
    }));
  }

  function getScoreState() {
    return {
      scores: getScores(),
      entries: getEntries(),
    };
  }

  function getStatus() {
    return { ...status };
  }

  function saveLocal(nextState) {
    scoreState = normalizeState(nextState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scoreState));
    emit();
    return getScoreState();
  }

  async function fetchRemoteScores() {
    const apiUrls = getApiUrls();
    if (apiUrls.length === 0) {
      setStatus({ state: "local", message: "이 브라우저에만 저장 중" });
      return getScores();
    }

    let lastError;
    for (const apiUrl of apiUrls) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 2500);

      try {
        const response = await fetch(`${apiUrl}/scores`, {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        saveLocal({ scores: payload.scores, entries: payload.entries });
        setStatus({ state: "saved", message: "DB 점수와 연결됨" });
        return getScores();
      } catch (error) {
        lastError = error;
        console.warn(`Using local scores. Failed score API: ${apiUrl}`, error);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    setStatus({ state: "error", message: "DB 연결 실패 · 이 브라우저에 임시 저장 중", error: lastError?.message });
    return getScores();
  }

  async function saveRemoteScores(nextState) {
    const apiUrls = getApiUrls();
    if (apiUrls.length === 0) {
      setStatus({ state: "local", message: "이 브라우저에만 저장 중" });
      return;
    }

    setStatus({ state: "saving", message: "DB에 저장 중" });

    let lastError;
    for (const apiUrl of apiUrls) {
      try {
        const response = await fetch(`${apiUrl}/scores`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(nextState),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message ?? `HTTP ${response.status}`);
        saveLocal({ scores: payload.scores, entries: payload.entries });
        setStatus({ state: "saved", message: "DB에 저장됨" });
        return;
      } catch (error) {
        lastError = error;
        console.warn(`Failed to save scores through API: ${apiUrl}`, error);
      }
    }

    setStatus({ state: "error", message: "DB 저장 실패 · 이 브라우저에는 저장됨", error: lastError?.message });
  }

  function queueRemoteSave(nextState) {
    window.clearTimeout(saveTimer);
    const snapshot = normalizeState(nextState);
    saveTimer = window.setTimeout(() => {
      saveRemoteScores(snapshot);
    }, REMOTE_SAVE_DELAY);
  }

  function save(nextState, { remote = true } = {}) {
    const savedState = saveLocal(nextState);
    if (remote) queueRemoteSave(savedState);
    return savedState.scores;
  }

  function setScore(team, value) {
    if (!teams.includes(team)) return getScores();
    return save({ scores: { ...scoreState.scores, [team]: value }, entries: [] });
  }

  function addScore(team, delta) {
    return setScore(team, (scoreState.scores[team] ?? 0) + Number(delta));
  }

  function addEntry(game, entryScores) {
    const entry = normalizeEntry({
      id: `score-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      game,
      scores: entryScores,
      createdAt: new Date().toISOString(),
    });
    if (!entry) return getScoreState();

    return save({
      entries: [entry, ...scoreState.entries],
    });
  }

  function removeEntry(entryId) {
    return save({
      entries: scoreState.entries.filter((entry) => entry.id !== entryId),
    });
  }

  function resetScores() {
    return save({ scores: emptyScores(), entries: [] });
  }

  function loadScores() {
    return fetchRemoteScores();
  }

  function subscribe(handler) {
    const onScoreChange = (event) => handler(event.detail);
    const onStorageChange = (event) => {
      if (event.key !== STORAGE_KEY) return;
      scoreState = readState();
      handler(getScores());
      window.dispatchEvent(new CustomEvent("recreation:score-state", { detail: getScoreState() }));
    };
    window.addEventListener("recreation:scores", onScoreChange);
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener("recreation:scores", onScoreChange);
      window.removeEventListener("storage", onStorageChange);
    };
  }

  function subscribeState(handler) {
    const onStateChange = (event) => handler(event.detail);
    window.addEventListener("recreation:score-state", onStateChange);
    return () => {
      window.removeEventListener("recreation:score-state", onStateChange);
    };
  }

  function subscribeStatus(handler) {
    const onStatusChange = (event) => handler(event.detail);
    window.addEventListener("recreation:scores-status", onStatusChange);
    return () => {
      window.removeEventListener("recreation:scores-status", onStatusChange);
    };
  }

  window.RecreationScores = {
    teams,
    getScores,
    getEntries,
    getScoreState,
    getStatus,
    loadScores,
    setScore,
    addScore,
    addEntry,
    removeEntry,
    resetScores,
    subscribe,
    subscribeState,
    subscribeStatus,
  };
})();
