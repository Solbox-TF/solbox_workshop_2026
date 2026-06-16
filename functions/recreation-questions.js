import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
const QUESTION_ITEM_KEY = "active";
const SCORE_ITEM_KEY = "scores";
const SCORE_TEAMS = ["A팀", "B팀", "C팀"];

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return JSON.parse(rawBody);
}

function assertQuestionSet(games) {
  if (!Array.isArray(games) || games.length === 0) {
    throw new Error("games must be a non-empty array");
  }

  games.forEach((game, gameIndex) => {
    if (!game?.id || !game?.title || !Array.isArray(game.categories)) {
      throw new Error(`game ${gameIndex + 1} is missing id, title, or categories`);
    }

    game.categories.forEach((category, categoryIndex) => {
      if (!category?.title || !Array.isArray(category.questions)) {
        throw new Error(`category ${gameIndex + 1}-${categoryIndex + 1} is missing title or questions`);
      }

      category.questions.forEach((question, questionIndex) => {
        if (!question?.prompt || !question?.answer || !question?.tip) {
          throw new Error(
            `question ${gameIndex + 1}-${categoryIndex + 1}-${questionIndex + 1} is missing prompt, answer, or tip`,
          );
        }
      });
    });
  });
}

function normalizeScores(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    SCORE_TEAMS.map((team) => {
      const score = Number.parseInt(source[team], 10);
      return [team, Number.isFinite(score) ? Math.max(0, score) : 0];
    }),
  );
}

function normalizeScoreEntry(entry, index = 0) {
  const game = String(entry?.game ?? "").trim();
  if (!game) return null;

  return {
    id: String(entry?.id ?? `score-${Date.now()}-${index}`),
    game: game.slice(0, 80),
    scores: normalizeScores(entry?.scores),
    createdAt: String(entry?.createdAt ?? new Date().toISOString()),
  };
}

function normalizeScoreEntries(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeScoreEntry).filter(Boolean);
}

function totalScoreEntries(entries) {
  return entries.reduce((totals, entry) => {
    SCORE_TEAMS.forEach((team) => {
      totals[team] += entry.scores[team] ?? 0;
    });
    return totals;
  }, normalizeScores());
}

function normalizeScoreState(value) {
  const source = value && typeof value === "object" ? value : {};
  const entries = normalizeScoreEntries(source.entries);
  const scores = entries.length > 0 ? totalScoreEntries(entries) : normalizeScores(source.scores);
  return { scores, entries };
}

async function getQuestions() {
  const result = await documentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: QUESTION_ITEM_KEY },
    }),
  );

  return response(200, {
    games: result.Item?.games ?? null,
    updatedAt: result.Item?.updatedAt ?? null,
  });
}

async function saveQuestions(event) {
  if (!ADMIN_TOKEN) {
    return response(503, { message: "ADMIN_TOKEN is not configured" });
  }

  const token = event.headers?.["x-admin-token"] ?? event.headers?.["X-Admin-Token"] ?? "";
  if (token !== ADMIN_TOKEN) {
    return response(401, { message: "Invalid admin token" });
  }

  const body = parseBody(event);
  assertQuestionSet(body.games);

  const updatedAt = new Date().toISOString();
  await documentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: QUESTION_ITEM_KEY,
        games: body.games,
        updatedAt,
      },
    }),
  );

  return response(200, { updatedAt });
}

async function getScores() {
  const result = await documentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: SCORE_ITEM_KEY },
    }),
  );
  const scoreState = normalizeScoreState(result.Item);

  return response(200, {
    ...scoreState,
    updatedAt: result.Item?.updatedAt ?? null,
  });
}

async function saveScores(event) {
  const body = parseBody(event);
  const scoreState = normalizeScoreState(body);
  const updatedAt = new Date().toISOString();

  await documentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: SCORE_ITEM_KEY,
        scores: scoreState.scores,
        entries: scoreState.entries,
        updatedAt,
      },
    }),
  );

  return response(200, { ...scoreState, updatedAt });
}

export async function handler(event) {
  if (!TABLE_NAME) {
    return response(500, { message: "TABLE_NAME is not configured" });
  }

  try {
    const method = event.requestContext?.http?.method;
    const path = event.rawPath ?? event.requestContext?.http?.path ?? "";

    if (path.endsWith("/scores")) {
      if (method === "GET") return getScores();
      if (method === "PUT") return saveScores(event);
      return response(405, { message: "Method not allowed" });
    }

    if (path.endsWith("/questions") || path === "") {
      if (method === "GET") return getQuestions();
      if (method === "PUT") return saveQuestions(event);
      return response(405, { message: "Method not allowed" });
    }

    return response(404, { message: "Not found" });
  } catch (error) {
    return response(400, { message: error.message });
  }
}
