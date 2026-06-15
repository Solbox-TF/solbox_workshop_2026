# Repository Guidelines

## Project Structure & Module Organization

This monorepo contains two static workshop tools:

- `apps/team-picker/`: team assignment page and local development server.
- `apps/recreation-games/`: recreation game selector, host screen, game data, styles, and local server.
- `.github/workflows/deploy.yml`: GitHub Actions production deployment.
- `sst.config.ts`: SST `StaticSite` infrastructure for `picker.ollida.kr` and `game.ollida.kr`.

Each app keeps browser files close together (`index.html`, CSS, JS, and `server.js`). Shared package scripts live in the root `package.json`. There is no dedicated test directory yet.

## Build, Test, and Development Commands

- `npm ci`: install exact dependencies from `package-lock.json`.
- `npm run start:team`: run the team picker locally at `http://localhost:1140`.
- `npm run start:recreation`: run recreation games locally at `http://localhost:4173`.
- `npm run check`: run JavaScript syntax checks for both apps.
- `npm run diff -- --stage production`: preview SST production infrastructure changes.
- `npm run deploy:aws`: deploy production via SST. Normal production deploys should happen through GitHub Actions on `main`.

## Coding Style & Naming Conventions

Use plain JavaScript, HTML, and CSS. Follow the existing style: two-space indentation in JS/CSS blocks, descriptive camelCase variables, and kebab-case CSS class names. Keep app-specific logic inside its app directory. Avoid adding build tooling unless it solves a real project need.

## Testing Guidelines

There is no formal test framework yet. Before committing, run `npm run check` and manually verify changed pages in a browser. For UI changes, test both desktop and mobile widths and confirm deployed URLs still return `200` after Actions completes.

## Commit & Pull Request Guidelines

Use concise, imperative commit messages matching recent history, for example:

- `feat: add game custom domain`
- `ci: deploy with github actions`
- `feat(team-picker): 참가자 선택 단계 추가`

Pull requests should include a short summary, verification steps, affected URLs/screens, and screenshots for visible UI changes. Link any relevant issue or event-planning note.

## Security & Configuration Tips

Do not commit AWS keys or local credentials. Deployment uses GitHub OIDC with `AWS_ROLE_ARN` and `AWS_REGION` configured in repository settings. Treat `.sst/` logs as local diagnostics and avoid relying on them as source files.
