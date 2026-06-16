let games = window.GAME_DATA;
const teams = window.RecreationScores.teams;
let scores = window.RecreationScores.getScores();

const gameTabs = document.querySelector("#gameTabs");
const scoreGrid = document.querySelector("#scoreGrid");
const categoryGrid = document.querySelector("#categoryGrid");
const questionGrid = document.querySelector("#questionGrid");
const bankKicker = document.querySelector("#bankKicker");
const questionCount = document.querySelector("#questionCount");
const detailKicker = document.querySelector("#detailKicker");
const detailTitle = document.querySelector("#detail-title");
const scoreBadge = document.querySelector("#scoreBadge");
const promptLabel = document.querySelector("#promptLabel");
const promptText = document.querySelector("#promptText");
const ruleList = document.querySelector("#ruleList");
const answerTitle = document.querySelector("#answerTitle");
const answerContent = document.querySelector("#answerContent");
const toggleAnswer = document.querySelector("#toggleAnswer");
const heroGameScreenLink = document.querySelector("#heroGameScreenLink");
const currentGameScreenLink = document.querySelector("#currentGameScreenLink");

const query = new URLSearchParams(window.location.search);
let activeGameId = games.some((game) => game.id === query.get("game")) ? query.get("game") : games[0].id;
let activeCategoryIndex = Math.max(Number.parseInt(query.get("c"), 10) || 0, 0);
let activeQuestionIndex = Math.max((Number.parseInt(query.get("q"), 10) || 1) - 1, 0);

function getActiveGame() {
  return games.find((game) => game.id === activeGameId) ?? games[0];
}

function getActiveCategory() {
  const game = getActiveGame();
  return game.categories[activeCategoryIndex] ?? game.categories[0];
}

function clampIndexes() {
  const game = getActiveGame();
  activeCategoryIndex = Math.min(activeCategoryIndex, game.categories.length - 1);
  activeQuestionIndex = Math.min(activeQuestionIndex, getActiveCategory().questions.length - 1);
}

function renderGameTabs() {
  gameTabs.innerHTML = games
    .map((game) => {
      const count = game.categories.reduce((sum, category) => sum + category.questions.length, 0);
      return `
        <button class="game-tab ${game.id === activeGameId ? "is-active" : ""}" type="button" data-game-id="${game.id}" style="--tab-color: ${game.color}">
          <span class="game-tab__top">
            <span class="game-tab__icon" aria-hidden="true">${game.icon}</span>
            <span>${count}문제</span>
          </span>
          <span>
            <span class="game-tab__title">${game.title}</span>
            <span class="game-tab__meta">${game.label}<br>${game.score}/정답</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderScores() {
  scoreGrid.innerHTML = teams
    .map(
      (team) => `
        <div class="team-score">
          <strong>${team}</strong>
          <div class="score-controls">
            <button type="button" data-score-team="${team}" data-score-delta="-10" aria-label="${team} 10점 빼기">−</button>
            <input value="${scores[team]}" inputmode="numeric" data-score-input="${team}" aria-label="${team} 점수" />
            <button type="button" data-score-team="${team}" data-score-delta="10" aria-label="${team} 10점 더하기">+</button>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderCategories() {
  const game = getActiveGame();
  categoryGrid.innerHTML = game.categories
    .map(
      (category, index) => `
        <button class="category-button ${index === activeCategoryIndex ? "is-active" : ""}" type="button" data-category-index="${index}">
          ${category.title}
          <span>${category.questions.length}</span>
        </button>
      `,
    )
    .join("");
}

function renderQuestionGrid() {
  const game = getActiveGame();
  const category = getActiveCategory();
  bankKicker.textContent = `${game.title} · ${category.title}`;
  questionCount.textContent = `${category.questions.length}문제`;
  questionGrid.innerHTML = category.questions
    .map(
      (_, index) => `
        <button class="question-button ${index === activeQuestionIndex ? "is-active" : ""}" type="button" data-question-index="${index}" style="--active-color: ${game.color}">
          ${String(index + 1).padStart(2, "0")}
        </button>
      `,
    )
    .join("");
}

function renderDetail() {
  clampIndexes();
  const game = getActiveGame();
  const category = getActiveCategory();
  const question = category.questions[activeQuestionIndex];
  detailKicker.textContent = `${category.title} · ${String(activeQuestionIndex + 1).padStart(2, "0")}`;
  detailTitle.textContent = game.title;
  scoreBadge.textContent = game.score;
  promptLabel.textContent = game.promptLabel;
  promptText.textContent = question.prompt;

  ruleList.innerHTML = game.rules.map((rule) => `<li>${rule}</li>`).join("");
  answerTitle.textContent = game.id === "chain" ? "예시 답 / 진행 팁" : "정답 / 진행 팁";
  answerContent.innerHTML = `
    <div class="answer-line"><strong>${game.id === "chain" ? "예시 답" : "정답"}</strong>${question.answer}</div>
    <div class="answer-line"><strong>진행 팁</strong>${question.tip}</div>
  `;
  updateGameScreenLinks();
}

function gameScreenUrl({ ready = false } = {}) {
  const params = new URLSearchParams({
    game: activeGameId,
    c: String(activeCategoryIndex),
  });
  if (ready) {
    params.set("ready", "1");
  } else {
    params.set("q", String(activeQuestionIndex + 1));
  }
  return `game.html?${params.toString()}`;
}

function updateGameScreenLinks() {
  heroGameScreenLink.href = gameScreenUrl({ ready: true });
  currentGameScreenLink.href = gameScreenUrl();
}

function hideAnswer() {
  answerContent.classList.add("is-hidden");
  toggleAnswer.setAttribute("aria-expanded", "false");
  toggleAnswer.lastChild.textContent = " 보기";
}

function renderAll() {
  clampIndexes();
  renderGameTabs();
  renderCategories();
  renderQuestionGrid();
  renderDetail();
}

function selectGame(gameId) {
  activeGameId = gameId;
  activeCategoryIndex = 0;
  activeQuestionIndex = 0;
  renderAll();
  hideAnswer();
}

function selectCategory(index) {
  activeCategoryIndex = index;
  activeQuestionIndex = 0;
  renderAll();
  hideAnswer();
}

function selectQuestion(index) {
  activeQuestionIndex = index;
  renderAll();
  hideAnswer();
  document.querySelector(".question-detail").scrollIntoView({ behavior: "smooth", block: "start" });
}

gameTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-game-id]");
  if (!tab) return;
  selectGame(tab.dataset.gameId);
});

categoryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category-index]");
  if (!button) return;
  selectCategory(Number(button.dataset.categoryIndex));
});

questionGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-question-index]");
  if (!button) return;
  selectQuestion(Number(button.dataset.questionIndex));
});

scoreGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-score-team]");
  if (!button) return;
  scores = window.RecreationScores.addScore(button.dataset.scoreTeam, Number(button.dataset.scoreDelta));
});

scoreGrid.addEventListener("change", (event) => {
  const input = event.target.closest("[data-score-input]");
  if (!input) return;
  scores = window.RecreationScores.setScore(input.dataset.scoreInput, input.value);
});

toggleAnswer.addEventListener("click", () => {
  const isHidden = answerContent.classList.toggle("is-hidden");
  toggleAnswer.setAttribute("aria-expanded", String(!isHidden));
  toggleAnswer.lastChild.textContent = isHidden ? " 보기" : " 숨김";
});

document.querySelector("#randomQuestion").addEventListener("click", () => {
  const randomGame = games[Math.floor(Math.random() * games.length)];
  activeGameId = randomGame.id;
  activeCategoryIndex = Math.floor(Math.random() * randomGame.categories.length);
  const category = getActiveCategory();
  activeQuestionIndex = Math.floor(Math.random() * category.questions.length);
  renderAll();
  hideAnswer();
  document.querySelector(".question-detail").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#resetScores").addEventListener("click", () => {
  scores = window.RecreationScores.resetScores();
});

async function init() {
  window.RecreationScores.subscribe((nextScores) => {
    scores = nextScores;
    renderScores();
  });

  renderScores();
  renderAll();
  hideAnswer();

  const [loadedGames, loadedScores] = await Promise.allSettled([
    window.RecreationData.loadGames(window.GAME_DATA),
    window.RecreationScores.loadScores(),
  ]);

  if (loadedGames.status === "fulfilled") {
    games = loadedGames.value;
  }
  if (loadedScores.status === "fulfilled") {
    scores = loadedScores.value;
  }
  if (!games.some((game) => game.id === activeGameId)) {
    activeGameId = games[0].id;
    activeCategoryIndex = 0;
    activeQuestionIndex = 0;
  }
  renderScores();
  renderAll();
  hideAnswer();
}

init();
