# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: Next.js 15 app (App Router). Key areas: `app/` pages, `components/` UI and feature components, `lib/` shared utilities/state.
- `backend/`: Express + TypeScript service. Core logic in `backend/src/` with `controllers/`, `routes/`, `services/`, `middleware/`, and `utils/`.
- `storage/`: Local runtime data (uploads, HLS output, thumbnails, chunks, SQLite DB). Treat as generated data.
- `docker-compose.yml`: Local/production container orchestration.

## Build, Test, and Development Commands
- `docker-compose up -d`: Start full stack via Docker (expects `storage/` directories).
- `cd backend && pnpm dev`: Run backend with nodemon on port 3001.
- `cd frontend && pnpm dev`: Run frontend on port 3000.
- `cd backend && pnpm build`: Compile backend TypeScript to `backend/dist/`.
- `cd frontend && pnpm build`: Build Next.js production bundle.
- `cd frontend && pnpm lint`: Run Next.js ESLint rules.

## Coding Style & Naming Conventions
- Languages: TypeScript for both frontend and backend.
- Indentation: follow existing 2-space formatting in TS/TSX files.
- Naming: React components in `PascalCase`, hooks/utilities in `camelCase`, routes/controllers in `camelCase` filenames.
- Linting: frontend uses `eslint-config-next` via `pnpm lint`. Backend currently has no lint script.

## Testing Guidelines
- Automated tests are not yet implemented (`backend` test script exits). If you add tests, document the runner and add a `pnpm test` script.
- Prefer colocated tests (e.g., `frontend/app/.../__tests__/` or `backend/src/.../__tests__/`) and clear naming like `*.test.ts`.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (examples in history: `feat:`, `fix:`, `refactor:`, `build(...)`).
- PRs should include: brief summary, linked issue (if any), and screenshots for UI changes.

## Security & Configuration Tips
- Required/important env vars: `JWT_SECRET`, `FRONTEND_URL`, `BASE_URL`, `STORAGE_PATH`, `DB_PATH`, `UPLOAD_MAX_SIZE`.
- Do not commit secrets or generated `storage/` artifacts; keep runtime data local or in mounted volumes.
