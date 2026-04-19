# InstaInsights — Project Instructions

## Repo structure
- `webapp/` — Next.js 14 SaaS app (primary codebase)
- `data/` — Instagram export folders (**never committed to git**)
- `roles/` — role/feature specification docs

All active work happens inside `webapp/`. Run every command from `webapp/` unless stated otherwise.

## Commands
```bash
cd webapp
npm install           # install deps
npm run dev           # dev server → http://localhost:3000
npm run build         # production build (catches type errors)
npm run type-check    # tsc --noEmit (fast type validation)
npm test              # Jest (all suites)
npx jest --testPathPattern="foo"  # single test file
npm run lint          # ESLint
```

## Git workflow
- Branch from `dev`: `git checkout -b feat/<name> dev`
- Conventional commits: `feat|fix|chore|docs|refactor|test(scope): lowercase subject`
- PR target: `dev` (never directly to `main`)
- Squash merge via `gh pr merge --squash --delete-branch`
- Never push directly to `main`

## Stack
- **Framework**: Next.js 14 App Router, TypeScript strict
- **Styling**: Tailwind CSS + shadcn/ui components (manual, not CLI)
- **Charts**: Recharts
- **AI**: Multi-provider via `src/lib/ai-provider.ts` (Gemini default, fallback to mock)
- **Data fetching**: SWR (`/api/data`, `/api/insights`)
- **Theme**: next-themes (dark default)
- **i18n**: Flat FR/EN dictionary in `src/lib/i18n.ts`, `useT()` hook

## Architecture
- Route groups `(creator)` and `(agency)` for clean URL structure
- Instagram export parsed server-side (cheerio) in `/api/data`
- Falls back to `mock-data.ts` when no real export found
- localStorage stores follow the pattern in `invoice-store.ts` / `campaign-store.ts`
- All API routes return `{ success: boolean, ... }` or `{ error: string }`

## Testing conventions
- New pure-function modules → unit tests in `src/__tests__/<name>.test.ts`
- localStorage stores → `@jest-environment jsdom` + `crypto.randomUUID` polyfill in `beforeEach`
- 100% branch coverage for store CRUD + calculation functions
- Run full suite before every commit: `npx jest`

## Code style
- No default exports except Next.js pages/layouts
- Prefer `type` over `interface` for simple shapes; `interface` for extensible structures
- `cn()` from `src/lib/utils.ts` for conditional Tailwind classes
- Native `<input>` / `<textarea>` with Tailwind — no `@/components/ui/input` (doesn't exist)
- No `console.log` in committed code
- Avoid `any` — use `unknown` + type guard if needed

## Key files
- `src/types/instagram.ts` — all domain types
- `src/lib/mock-data.ts` — 5 mock creators for agency view
- `src/lib/ai-provider.ts` — multi-provider AI abstraction (`generateText`, `stripJsonFences`)
- `src/lib/i18n.ts` — all FR/EN translation strings (check before adding new keys)
- `src/lib/utils.ts` — `formatNumber`, `formatPercent`, `cn`
- `src/components/layout/Header.tsx` — shared nav header

## Security
- Never commit `.env.local` or anything under `data/`
- Validate all external input server-side in API routes
- No `dangerouslySetInnerHTML` without explicit sanitization
