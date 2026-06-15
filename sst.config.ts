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
    const recreationGames = new sst.aws.StaticSite("RecreationGames", {
      path: "apps/recreation-games",
      domain: {
        name: "game.ollida.kr",
        dns: sst.aws.dns({
          zone: "Z09780493F6H2HR2PRAE4",
        }),
      },
      assets: {
        fileOptions: [
          {
            files: ["**/*.html", "**/*.js", "**/*.css", "**/*.json"],
            cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
          },
          {
            files: "assets/**/*",
            cacheControl: "max-age=31536000,public,immutable",
          },
        ],
      },
    });

    return {
      recreationGamesUrl: recreationGames.url,
    };
  },
});
