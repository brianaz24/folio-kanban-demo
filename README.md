# Folio — a private Kanban workspace

A responsive React + TypeScript application backed by Supabase anonymous authentication and PostgreSQL row-level security. Designed around a quiet, warm workspace with four fixed stages and clear feedback.

## Local development

Requirements: Node.js 22+ and npm.

1. `npm ci`
2. Copy `.env.example` to `.env.local` and provide the Supabase project URL and **public anon / publishable key**. Never use a service-role key.
3. In a fresh Supabase free-tier project, run `supabase/schema.sql` through the SQL editor once. The migration creates tables, constraints, indexes, grants, triggers and RLS policies.
4. Enable anonymous sign-ins in Supabase Authentication settings. Anonymous users use the `authenticated` database role.
5. `npm run dev`, then open the local address.

Without environment values the app displays an honest setup state. “Explore a local preview” uses sample data held **only in memory**. It does not claim database persistence and is not the submission deployment.

## Features

- Anonymous session restored on reload; no signup form.
- Four-column board: To Do / In Progress / In Review / Done.
- Create, edit, delete and drag tasks across stages. Keyboard drag and the status dropdown offer alternatives to pointer dragging.
- Data is rendered after server-confirmed writes; failed writes leave existing board data intact and expose an error.
- Title search; combined priority, assignee and label filters.
- Priority, due dates, overdue indicators and overview statistics.
- Named assignees (lightweight, not real collaborating accounts) and multiple labels.
- Per-task comments with chronological timestamps.
- Responsive desktop/tablet/mobile layout, native dialog focus management, visible focus states, reduced-motion support, loading/empty/error states, validation and pending-write lock.

## Verification

`npm test` — 12 model and DOM interaction tests. `npm run build` — strict TypeScript check and production bundle.

The production build and 12 local tests passed. Live browser dragging, reload persistence, editing, comments and filtering, plus two-user RLS isolation checks, also passed against a configured deployment. Automated Playwright execution remains unverified; see `VERIFICATION.md`.

See `SECURITY.md` to repeat essential live two-user RLS tests on your own project. A successful local build does **not** verify database setup. Test two independent browser profiles against the live configured project: A must not read, edit, delete or comment on B's task, including direct requests with B's known IDs. Verify reload persistence and sign-out/session loss behavior before submission.

Manual UI checks: create blank/title task; edit; cancel/back/escape; drag; keyboard status update; combine and clear filters; delete confirmation and cancellation; add comments; narrow viewport; network failure; repeated save clicks.

## Deployment (free tier)

Build command `npm run build`, output `dist`. Use a Vercel/Netlify/Cloudflare Pages free project and set both Vite environment values **at build time**. Do not commit `.env.local`. Vite public keys are intentionally visible to browsers: RLS is the authorization boundary. Enable appropriate abuse protection for public anonymous auth; see SECURITY.md.

A live deployment has been verified; its demo URL and final submission links are intentionally omitted here. Do not commit assessment materials, applicant information or secrets. No paid resources are required.

## Design and tradeoffs

Folio uses a muted sage palette, thin borders, rounded surfaces, restrained type and consistent spacing to keep tasks readable. Custom CSS avoids a heavy component framework. Dnd Kit handles accessible drag interactions; status selection remains available on every task. Supabase's browser SDK reduces server complexity, with RLS enforcing ownership even for manually crafted requests.

The private anonymous workspace is not a shared multi-user team board. Assignees are labels, not invitations. Clearing browser storage loses access to that anonymous identity. Sorting within a column is by creation time; cross-column movement is persisted, but custom ordering is not implemented. Activity history and live multi-client subscriptions are not implemented. A future version would add account upgrades, normalized members/labels, an audit log, pagination, and more automated integration/accessibility coverage.

Fonts are loaded from Google Fonts with system fallbacks. No assessment PDF or private applicant data is included in this repository.
