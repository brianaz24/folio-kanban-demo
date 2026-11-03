# Folio — Task Manager Assessment

**Working draft. Final submission and demo links are intentionally omitted.**

## Overview
Folio is a four-stage private Kanban workspace built with React, TypeScript, Vite, Dnd Kit and Supabase. The design uses a calm sage palette and a consistent visual hierarchy to keep tasks and next steps easy to scan. The desktop sidebar and horizontal board collapse into a mobile-friendly vertical layout.

## Links
- A live frontend deployment exists and has been verified. Its URL is intentionally omitted from this draft.
- Add the intended repository link only when preparing the final submission.

## Data and authentication
The app establishes an anonymous Supabase session and restores it on later visits. Each task and comment is owned by the authenticated guest user. Database row-level security restricts every read/write to the owner. Comment policies also require ownership of the parent task. Public anonymous keys are safe to expose only because RLS is enforced; no service-role credentials belong in the frontend.

The full SQL schema is provided in `supabase/schema.sql`. Include its complete contents in the final PDF/DOCX.

## Local setup
Use Node.js 22+, run `npm ci`, configure `.env.local` from `.env.example`, enable Supabase anonymous sign-in, execute the fresh-project SQL migration, then run `npm run dev`. For deployment run `npm run build` and publish `dist` with the same public build-time environment values.

## Features
Task create/edit/delete; four stages; cross-column drag and status dropdown; priorities; labels and label filtering; named assignees; due dates and overdue flags; title search; combined filters; totals/completed/overdue counters; timestamped comments. Loading, failure, empty and pending-write states are explicit. Writes are server-confirmed and errors retain the previous board.

## Scope and tradeoffs
This is a private per-user board. Named assignees are display labels, not collaborating accounts. It does not implement team invitations, within-column manual ordering, activity history or realtime subscriptions. Anonymous identity is browser-bound: clearing storage loses access unless account upgrade functionality is added. With more time, I would add normalized members/labels, account upgrades, an audit trail, pagination and wider automated accessibility coverage.

## Verification
See `VERIFICATION.md` for results: the production build, 12 local tests, live browser task flows and two-user RLS checks passed. Automated Playwright execution remains unverified. This draft is not a final submission; links and final submission materials are intentionally omitted.
