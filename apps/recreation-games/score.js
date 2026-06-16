const scoreStore = window.RecreationScores;
const scoreEntryForm = document.querySelector("#scoreEntryForm");
const gameNameInput = document.querySelector("#gameNameInput");
const scoreInputs = document.querySelector("#scoreInputs");
const scoreSummary = document.querySelector("#scoreSummary");
const scoreHistory = document.querySelector("#scoreHistory");
const scoreSaveState = document.querySelector("#scoreSaveState");
const resetScores = document.querySelector("#resetScores");

function sortedScores(scores) {
  return [...scoreStore.teams]
    .map((team) => ({ team, score: scores[team] ?? 0 }))
    .sort((left, right) => right.score - left.score || left.team.localeCompare(right.team));
}

function renderSummary(scores) {
  const ranking = sortedScores(scores);
  const topScore = ranking[0]?.score ?? 0;
  scoreSummary.innerHTML = ranking
    .map(
      ({ team, score }, index) => `
        <article class="score-rank ${score === topScore && score > 0 ? "is-leader" : ""}">
          <span>${index + 1}위 · ${team}</span>
          <strong>${score}</strong>
        </article>
      `,
    )
    .join("");
}

function renderInputControls() {
  scoreInputs.innerHTML = scoreStore.teams
    .map(
      (team) => `
        <label class="score-card">
          <span class="score-card__top">
            <span>
              <span class="eyebrow">earned score</span>
              <strong>${team}</strong>
            </span>
          </span>
          <input class="score-value" value="0" inputmode="numeric" data-score-input="${team}" aria-label="${team} 획득 점수" />
        </label>
      `,
    )
    .join("");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderHistory(entries) {
  if (entries.length === 0) {
    scoreHistory.innerHTML = `
      <article class="score-empty">
        아직 입력된 게임 점수가 없습니다.
      </article>
    `;
    return;
  }

  scoreHistory.innerHTML = entries
    .map(
      (entry) => `
        <article class="score-history-row">
          <div class="score-history-row__main">
            <span class="score-history-row__time">${formatDate(entry.createdAt)}</span>
            <strong>${entry.game}</strong>
          </div>
          <div class="score-history-row__scores">
            ${scoreStore.teams
              .map((team) => `<span><b>${team}</b>${entry.scores[team] ?? 0}</span>`)
              .join("")}
          </div>
          <button class="score-delete" type="button" data-remove-entry="${entry.id}" aria-label="${entry.game} 점수 삭제">삭제</button>
        </article>
      `,
    )
    .join("");
}

function renderStatus(status = scoreStore.getStatus()) {
  scoreSaveState.textContent = status.message;
  scoreSaveState.dataset.state = status.state;
}

function renderScoreState(state = scoreStore.getScoreState()) {
  renderSummary(state.scores);
  renderHistory(state.entries);
}

function readEntryScores() {
  return Object.fromEntries(
    [...scoreInputs.querySelectorAll("[data-score-input]")].map((input) => [
      input.dataset.scoreInput,
      Number.parseInt(input.value, 10) || 0,
    ]),
  );
}

function clearForm() {
  gameNameInput.value = "";
  scoreInputs.querySelectorAll("[data-score-input]").forEach((input) => {
    input.value = "0";
  });
  gameNameInput.focus();
}

scoreEntryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const game = gameNameInput.value.trim();
  if (!game) {
    gameNameInput.focus();
    return;
  }

  scoreStore.addEntry(game, readEntryScores());
  clearForm();
});

scoreHistory.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-entry]");
  if (!button) return;
  if (!confirm("이 게임 점수 기록을 삭제할까요?")) return;
  scoreStore.removeEntry(button.dataset.removeEntry);
});

resetScores.addEventListener("click", () => {
  if (!confirm("모든 게임 점수 기록과 누적 점수를 0점으로 초기화할까요?")) return;
  scoreStore.resetScores();
});

scoreStore.subscribeState(renderScoreState);
scoreStore.subscribeStatus(renderStatus);
renderInputControls();
renderScoreState();
renderStatus();
scoreStore.loadScores().then(() => renderScoreState());
