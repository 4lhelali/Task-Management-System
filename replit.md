# TaskFlow

A modern full-stack task management web app with role-based access control for teams. Admins can create, assign, and manage tasks and users; employees see their assigned work and receive notifications.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — express-session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/taskflow`), wouter routing, shadcn/ui, Tailwind CSS, Outfit + Space Mono fonts
- API: Express 5 (`artifacts/api-server`), session-based auth via `express-session`
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — auto-generated React Query hooks and Zod schemas (do not edit)
- `lib/api-zod/src/` — Zod schemas for request/response validation on server
- `lib/db/src/schema/` — Drizzle ORM table definitions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/taskflow/src/pages/` — React page components
- `artifacts/taskflow/src/components/` — Shared UI components (layout, shadcn/ui)
- `artifacts/taskflow/src/lib/auth-context.tsx` — Auth context and `useAuth` hook

## Architecture decisions

- Contract-first API: OpenAPI spec defines all routes, then Orval generates typed React Query hooks and Zod schemas. The server validates all inputs/outputs against these Zod schemas.
- Session auth: `express-session` with PostgreSQL-backed sessions. Passwords hashed with bcryptjs. No JWT.
- Shared proxy routing: Frontend at `/`, API at `/api` — handled by Replit's reverse proxy. No Vite proxy config needed.
- Role-based access: `admin` role sees all tasks, can manage users; `employee` only sees assigned tasks.
- Error handling pattern: `(err as any).data?.error` — `ApiError<T>.data` contains the server error body.

## Product

- **Login / Signup** — session-based authentication
- **Dashboard** — overview stats (total tasks, pending, in progress, completed, overdue), recent activity feed
- **Tasks** — admin sees all tasks with filter/search; employees see only their assignments; status updates, delete
- **Task Form** — create/edit tasks with title, description, assignee, due date, status
- **Users** — admin-only; CRUD for team members with role management
- **Notifications** — per-user notification feed with mark-read / mark-all-read
- **Profile** — update display name or password

## Test credentials

All users have password `password123`:
- `admin` / `password123` — admin role (full access)
- `sarah` / `password123` — employee
- `marcus` / `password123` — employee
- `priya` / `password123` — employee

## Gotchas

- After any `lib/` schema/type change, run `pnpm run typecheck:libs` before checking api-server.
- Google Fonts `@import url(...)` must be the FIRST line of `index.css` before any other CSS.
- Never call service ports directly (e.g. 5000); always go through `localhost:80/api` via the shared proxy.
- `useGetMe` / `useGetTask` / `useGetTasks` query options require `as any` cast due to TanStack v5 requiring `queryKey` in `UseQueryOptions` — the hooks provide it internally but the type doesn't reflect that.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
