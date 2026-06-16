import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
const ITEM_KEY = "active";

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

async function getQuestions() {
  const result = await documentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: ITEM_KEY },
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
        pk: ITEM_KEY,
        games: body.games,
        updatedAt,
      },
    }),
  );

  return response(200, { updatedAt });
}

export async function handler(event) {
  if (!TABLE_NAME) {
    return response(500, { message: "TABLE_NAME is not configured" });
  }

  try {
    if (event.requestContext?.http?.method === "GET") {
      return getQuestions();
    }
    if (event.requestContext?.http?.method === "PUT") {
      return saveQuestions(event);
    }
    return response(405, { message: "Method not allowed" });
  } catch (error) {
    return response(400, { message: error.message });
  }
}
