let stageGames = window.GAME_DATA;

const gameSwitcher = document.querySelector("#gameSwitcher");
const categorySwitcher = document.querySelector("#categorySwitcher");
const questionStrip = document.querySelector("#questionStrip");
const gameType = document.querySelector("#gameType");
const questionNumber = document.querySelector("#questionNumber");
const promptLabel = document.querySelector("#promptLabel");
const gameTitle = document.querySelector("#gameTitle");
const stagePrompt = document.querySelector("#stagePrompt");
const answerPanel = document.querySelector("#answerPanel");
const answerText = document.querySelector("#answerText");
const answerTip = document.querySelector("#answerTip");
const toggleAnswer = document.querySelector("#toggleAnswer");
const startGame = document.querySelector("#startGame");
const backLink = document.querySelector("#backLink");

const query = new URLSearchParams(window.location.search);
let activeGameId = stageGames.some((game) => game.id === query.get("game")) ? query.get("game") : stageGames[0].id;
let activeCategoryIndex = Math.max(Number.parseInt(query.get("c"), 10) || 0, 0);
let activeQuestionIndex = Math.max((Number.parseInt(query.get("q"), 10) || 1) - 1, 0);
let isReadyPage = query.get("ready") === "1";

function getGame() {
  return stageGames.find((game) => game.id === activeGameId) ?? stageGames[0];
}

function getCategory() {
  const game = getGame();
  return game.categories[activeCategoryIndex] ?? game.categories[0];
}

function clampIndexes() {
  const game = getGame();
  activeCategoryIndex = Math.min(activeCategoryIndex, game.categories.length - 1);
  activeQuestionIndex = Math.min(activeQuestionIndex, getCategory().questions.length - 1);
}

function updateUrl() {
  const params = new URLSearchParams({
    game: activeGameId,
    c: String(activeCategoryIndex),
  });
  if (isReadyPage) {
    params.set("ready", "1");
  } else {
    params.set("q", String(activeQuestionIndex + 1));
  }
  history.replaceState(null, "", `game.html?${params.toString()}`);
  backLink.href = `index.html?game=${activeGameId}&c=${activeCategoryIndex}&q=${activeQuestionIndex + 1}`;
}

function hideAnswer() {
  answerPanel.classList.add("is-hidden");
  toggleAnswer.setAttribute("aria-expanded", "false");
  toggleAnswer.lastChild.textContent = " 정답 보기";
}

function render() {
  clampIndexes();
  const game = getGame();
  const category = getCategory();
  const question = category.questions[activeQuestionIndex];
  document.documentElement.style.setProperty("--active", game.color);
  document.body.classList.toggle("is-ready-page", isReadyPage);

  gameSwitcher.innerHTML = stageGames
    .map(
      (item) => `
        <button class="game-pill ${item.id === activeGameId ? "is-active" : ""}" type="button" data-game-id="${item.id}">
          ${item.title}
        </button>
      `,
    )
    .join("");

  categorySwitcher.innerHTML = game.categories
    .map(
      (item, index) => `
        <button class="category-pill ${index === activeCategoryIndex ? "is-active" : ""}" type="button" data-category-index="${index}">
          ${item.title}
        </button>
      `,
    )
    .join("");

  questionStrip.innerHTML = category.questions
    .map(
      (_, index) => `
        <button class="question-chip ${index === activeQuestionIndex ? "is-active" : ""}" type="button" data-question-index="${index}">
          ${String(index + 1).padStart(2, "0")}
        </button>
      `,
    )
    .join("");

  gameType.textContent = `${game.title} · ${category.title}`;
  questionNumber.textContent = isReadyPage ? "00" : String(activeQuestionIndex + 1).padStart(2, "0");
  promptLabel.textContent = isReadyPage ? `${category.questions.length}문제 · 준비` : game.promptLabel;
  gameTitle.textContent = game.title;
  stagePrompt.textContent = isReadyPage ? "준비" : question.prompt;

  answerText.textContent = question.answer;
  answerTip.textContent = isReadyPage ? "진행자가 시작 버튼을 누르면 1번 문제부터 공개됩니다." : question.tip;
  startGame.hidden = !isReadyPage;
  toggleAnswer.disabled = isReadyPage;
  updateUrl();
}

function selectGame(gameId) {
  activeGameId = gameId;
  activeCategoryIndex = 0;
  activeQuestionIndex = 0;
  isReadyPage = true;
  render();
  hideAnswer();
}

function selectCategory(index) {
  activeCategoryIndex = index;
  activeQuestionIndex = 0;
  isReadyPage = true;
  render();
  hideAnswer();
}

function selectQuestion(index) {
  const category = getCategory();
  activeQuestionIndex = (index + category.questions.length) % category.questions.length;
  isReadyPage = false;
  render();
  hideAnswer();
}

function startSelectedGame() {
  activeQuestionIndex = 0;
  isReadyPage = false;
  render();
  hideAnswer();
}

gameSwitcher.addEventListener("click", (event) => {
  const button = event.target.closest("[data-game-id]");
  if (!button) return;
  selectGame(button.dataset.gameId);
});

categorySwitcher.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category-index]");
  if (!button) return;
  selectCategory(Number(button.dataset.categoryIndex));
});

questionStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-question-index]");
  if (!button) return;
  selectQuestion(Number(button.dataset.questionIndex));
});

document.querySelector("#prevQuestion").addEventListener("click", () => selectQuestion(activeQuestionIndex - 1));
document.querySelector("#nextQuestion").addEventListener("click", () => selectQuestion(activeQuestionIndex + 1));
startGame.addEventListener("click", startSelectedGame);

document.querySelector("#randomQuestion").addEventListener("click", () => {
  const randomGame = stageGames[Math.floor(Math.random() * stageGames.length)];
  activeGameId = randomGame.id;
  activeCategoryIndex = Math.floor(Math.random() * randomGame.categories.length);
  const category = getCategory();
  activeQuestionIndex = Math.floor(Math.random() * category.questions.length);
  isReadyPage = false;
  render();
  hideAnswer();
});

toggleAnswer.addEventListener("click", () => {
  const isHidden = answerPanel.classList.toggle("is-hidden");
  toggleAnswer.setAttribute("aria-expanded", String(!isHidden));
  toggleAnswer.lastChild.textContent = isHidden ? " 정답 보기" : " 정답 숨김";
});

document.addEventListener("keydown", (event) => {
  if (isReadyPage && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    startSelectedGame();
    return;
  }
  if (isReadyPage) return;
  if (event.key === "ArrowLeft") selectQuestion(activeQuestionIndex - 1);
  if (event.key === "ArrowRight") selectQuestion(activeQuestionIndex + 1);
  if (event.key === " ") {
    event.preventDefault();
    toggleAnswer.click();
  }
});

async function init() {
  stageGames = await window.RecreationData.loadGames(window.GAME_DATA);
  if (!stageGames.some((game) => game.id === activeGameId)) {
    activeGameId = stageGames[0].id;
    activeCategoryIndex = 0;
    activeQuestionIndex = 0;
    isReadyPage = true;
  }
  render();
  hideAnswer();
}

init();
