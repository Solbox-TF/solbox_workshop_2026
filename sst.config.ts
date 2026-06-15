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
      teamPickerUrl: teamPicker.url,
    };
  },
});
