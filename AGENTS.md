# Repository Guidelines

## Project Structure & Module Organization
This is a SvelteKit 2 / Svelte 5 TypeScript app for the SWFT space-weather dashboard, deployed on Cloudflare Pages with a scheduled ingest Worker.

- `src/routes/` contains SvelteKit pages and API endpoints. Public API routes live under `src/routes/api/v1/`; admin and feature pages live in named route folders such as `admin/`, `notifications/`, and `data-sources/`.
- `src/lib/` holds shared code: `components/`, `server/`, `stores/`, `types/`, and `utils/`.
- `workers/cron-ingest/` contains the Cloudflare Worker that ingests NOAA and fallback source data.
- `tests/` contains Vitest unit tests named `*.test.ts`.
- `migrations/` contains D1 schema migrations. Verify schemas with `PRAGMA table_info(table_name)` before writing SQL.
- `static/` stores static assets, and `docs/` contains deployment and operational documentation.

## Build, Test, and Development Commands

- `npm run dev` starts the local Vite/SvelteKit development server.
- `npm run build` builds the production app.
- `npm run preview` previews the production build locally.
- `npm run check` runs `svelte-kit sync` and `svelte-check` against `tsconfig.json`.
- `npm test` runs the Vitest suite once.
- `npm run test:watch` runs Vitest in watch mode.

Run `npm run check` and `npm test` before considering code complete. Address warnings rather than ignoring them.

## Coding Style & Naming Conventions
Use TypeScript and Svelte conventions already present in the repo. Keep modules focused by responsibility: data access in server modules, UI in Svelte components, shared contracts in `src/lib/types/`, and formatting helpers in `src/lib/utils/`. Prefer clear kebab-case route folders and descriptive file names such as `dispatch-notifications.ts` or `timeFormat.ts`. Add concise comments only for non-obvious logic.

## Testing Guidelines
Use Vitest for unit coverage. Place tests in `tests/` and name them after the behavior or module under test, for example `gnss-risk.test.ts` or `notif-schedule.test.ts`. Cover risk scoring, notification decisions, parser behavior, and API contract changes when touched.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries, sometimes with scope context, such as `Add subscription notifications: Discord webhooks, SMS, CF Access auth`. Keep commits focused and avoid `Co-Authored-By` trailers.

Pull requests should include a concise description, linked issue or task when applicable, test results (`npm run check`, `npm test`, build status), migration notes, Cloudflare/Wrangler changes, and screenshots for visible UI updates.

## Security & Configuration Tips
Keep secrets in `.dev.vars`, Cloudflare Pages secrets, or Wrangler-managed bindings; do not commit credentials. Reference `docs/DEPLOY.md`, `wrangler.toml`, and migrations before changing deployment, D1, or Worker behavior.
