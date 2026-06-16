/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    const isProduction = input.stage === "production";

    return {
      name: "solbox-workshop-2026",
      home: "aws",
      removal: isProduction ? "retain" : "remove",
      protect: isProduction,
    };
  },
  async run() {
    const htmlNoCache = {
      files: ["**/*.html", "**/*.js", "**/*.css", "**/*.json"],
      cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
    };
    const longCacheAssets = {
      files: "assets/**/*",
      cacheControl: "max-age=31536000,public,immutable",
    };
    const ollidaDns = sst.aws.dns({
      zone: "Z09780493F6H2HR2PRAE4",
    });
    const questionsTable = new sst.aws.Dynamo("RecreationQuestions", {
      fields: {
        pk: "string",
      },
      primaryIndex: { hashKey: "pk" },
    });
    const questionsApi = new sst.aws.ApiGatewayV2("RecreationQuestionsApi", {
      domain: {
        name: "game-api.ollida.kr",
        dns: ollidaDns,
      },
      cors: {
        allowOrigins: [
          "https://game.ollida.kr",
          "http://localhost:4173",
          "http://127.0.0.1:4173",
          "http://localhost:4174",
          "http://127.0.0.1:4174",
          "null",
        ],
        allowMethods: ["GET", "PUT", "OPTIONS"],
        allowHeaders: ["content-type", "x-admin-token"],
      },
    });
    const questionsHandler = {
      handler: "functions/recreation-questions.handler",
      link: [questionsTable],
      environment: {
        TABLE_NAME: questionsTable.name,
        ADMIN_TOKEN: process.env.ADMIN_TOKEN ?? "",
      },
      permissions: [
        {
          actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
          resources: [questionsTable.arn],
        },
      ],
    };

    questionsApi.route("GET /questions", questionsHandler);
    questionsApi.route("PUT /questions", questionsHandler);
    questionsApi.route("GET /scores", questionsHandler);
    questionsApi.route("PUT /scores", questionsHandler);

    const recreationGames = new sst.aws.StaticSite("RecreationGames", {
      path: "apps/recreation-games",
      domain: {
        name: "game.ollida.kr",
        dns: ollidaDns,
      },
      assets: {
        fileOptions: [htmlNoCache, longCacheAssets],
      },
    });

    const teamPicker = new sst.aws.StaticSite("TeamPicker", {
      path: "apps/team-picker",
      domain: {
        name: "picker.ollida.kr",
        dns: ollidaDns,
      },
      assets: {
        fileOptions: [htmlNoCache],
      },
    });

    return {
      recreationGamesUrl: recreationGames.url,
      recreationQuestionsApiUrl: questionsApi.url,
      teamPickerUrl: teamPicker.url,
    };
  },
});
