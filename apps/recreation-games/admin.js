const ADMIN_TOKEN_KEY = "recreation_admin_token";

let games = window.RecreationData.cloneGames(window.GAME_DATA);
let activeGameIndex = 0;
let activeCategoryIndex = 0;

const apiUrl = document.querySelector("#apiUrl");
const adminToken = document.querySelector("#adminToken");
const saveSettings = document.querySelector("#saveSettings");
const gameList = document.querySelector("#gameList");
const categoryList = document.querySelector("#categoryList");
const editorKicker = document.querySelector("#editorKicker");
const editorTitle = document.querySelector("#editorTitle");
const questionEditor = document.querySelector("#questionEditor");
const addQuestion = document.querySelector("#addQuestion");
const saveRemote = document.querySelector("#saveRemote");
const exportJson = document.querySelector("#exportJson");
const importJson = document.querySelector("#importJson");
const resetBundled = document.querySelector("#resetBundled");
const jsonBox = document.querySelector("#jsonBox");
const status = document.querySelector("#status");

function activeGame() {
  return games[activeGameIndex] ?? games[0];
}

function activeCategory() {
  return activeGame().categories[activeCategoryIndex] ?? activeGame().categories[0];
}

function setStatus(message) {
  status.textContent = message;
  status.classList.add("is-visible");
  window.clearTimeout(setStatus.timeout);
  setStatus.timeout = window.setTimeout(() => status.classList.remove("is-visible"), 4200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clampSelection() {
  activeGameIndex = Math.min(activeGameIndex, games.length - 1);
  activeCategoryIndex = Math.min(activeCategoryIndex, activeGame().categories.length - 1);
}

function renderLists() {
  gameList.innerHTML = games
    .map(
      (game, index) => `
        <button type="button" class="${index === activeGameIndex ? "is-active" : ""}" data-game-index="${index}">
          ${escapeHtml(game.title)}
          <small>${game.categories.reduce((sum, category) => sum + category.questions.length, 0)}문제</small>
        </button>
      `,
    )
    .join("");

  categoryList.innerHTML = activeGame()
    .categories.map(
      (category, index) => `
        <button type="button" class="${index === activeCategoryIndex ? "is-active" : ""}" data-category-index="${index}">
          ${escapeHtml(category.title)}
          <small>${category.questions.length}문제</small>
        </button>
      `,
    )
    .join("");
}

function renderEditor() {
  clampSelection();
  const game = activeGame();
  const category = activeCategory();
  editorKicker.textContent = `${game.title} · ${category.title}`;
  editorTitle.textContent = `${category.questions.length}문제`;
  questionEditor.innerHTML = category.questions
    .map(
      (question, index) => `
        <article class="question-row" data-question-index="${index}">
          <div class="question-index">${String(index + 1).padStart(2, "0")}</div>
          <div class="question-fields">
            <div class="question-field">
              <label>
                문제
                <textarea data-field="prompt">${escapeHtml(question.prompt)}</textarea>
              </label>
            </div>
            <div class="question-field">
              <label>
                정답 / 예시
                <textarea data-field="answer">${escapeHtml(question.answer)}</textarea>
              </label>
            </div>
            <div class="question-field">
              <label>
                진행 팁
                <textarea data-field="tip">${escapeHtml(question.tip)}</textarea>
              </label>
            </div>
          </div>
          <button class="delete-question" type="button" data-delete-question="${index}" aria-label="${index + 1}번 문제 삭제">×</button>
        </article>
      `,
    )
    .join("");
}

function render() {
  clampSelection();
  renderLists();
  renderEditor();
}

function validateGames(nextGames) {
  if (!Array.isArray(nextGames) || nextGames.length === 0) throw new Error("게임 배열이 필요합니다.");
  nextGames.forEach((game) => {
    if (!game.id || !game.title || !Array.isArray(game.categories)) {
      throw new Error("각 게임에는 id, title, categories가 필요합니다.");
    }
    game.categories.forEach((category) => {
      if (!category.title || !Array.isArray(category.questions)) {
        throw new Error("각 그룹에는 title, questions가 필요합니다.");
      }
      category.questions.forEach((question) => {
        if (!question.prompt || !question.answer || !question.tip) {
          throw new Error("각 문제에는 prompt, answer, tip이 필요합니다.");
        }
      });
    });
  });
}

apiUrl.value = window.RecreationData.getApiUrl();
adminToken.value = localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";

saveSettings.addEventListener("click", () => {
  window.RecreationData.setApiUrl(apiUrl.value);
  localStorage.setItem(ADMIN_TOKEN_KEY, adminToken.value.trim());
  setStatus("설정을 저장했습니다.");
});

gameList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-game-index]");
  if (!button) return;
  activeGameIndex = Number(button.dataset.gameIndex);
  activeCategoryIndex = 0;
  render();
});

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category-index]");
  if (!button) return;
  activeCategoryIndex = Number(button.dataset.categoryIndex);
  render();
});

questionEditor.addEventListener("input", (event) => {
  const field = event.target.closest("[data-field]");
  if (!field) return;
  const row = event.target.closest("[data-question-index]");
  const question = activeCategory().questions[Number(row.dataset.questionIndex)];
  question[field.dataset.field] = field.value;
});

questionEditor.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-question]");
  if (!button) return;
  activeCategory().questions.splice(Number(button.dataset.deleteQuestion), 1);
  render();
  setStatus("문제를 삭제했습니다.");
});

addQuestion.addEventListener("click", () => {
  activeCategory().questions.push({
    prompt: "새 문제",
    answer: "정답",
    tip: "진행 팁을 입력하세요.",
  });
  render();
  setStatus("새 문제를 추가했습니다.");
});

saveRemote.addEventListener("click", async () => {
  try {
    validateGames(games);
    localStorage.setItem(ADMIN_TOKEN_KEY, adminToken.value.trim());
    const result = await window.RecreationData.saveGames(games, adminToken.value.trim());
    setStatus(`DB 저장 완료: ${result.updatedAt}`);
  } catch (error) {
    setStatus(error.message);
  }
});

exportJson.addEventListener("click", () => {
  jsonBox.value = JSON.stringify(games, null, 2);
  setStatus("JSON을 내보냈습니다.");
});

importJson.addEventListener("click", () => {
  try {
    const nextGames = JSON.parse(jsonBox.value);
    validateGames(nextGames);
    games = nextGames;
    activeGameIndex = 0;
    activeCategoryIndex = 0;
    render();
    setStatus("JSON을 가져왔습니다. DB 저장을 눌러 반영하세요.");
  } catch (error) {
    setStatus(error.message);
  }
});

resetBundled.addEventListener("click", () => {
  games = window.RecreationData.cloneGames(window.GAME_DATA);
  activeGameIndex = 0;
  activeCategoryIndex = 0;
  render();
  setStatus("기본 문제로 되돌렸습니다. DB 저장을 눌러 반영하세요.");
});

async function init() {
  games = await window.RecreationData.loadGames(window.GAME_DATA);
  render();
}

init();
