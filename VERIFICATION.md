# Verification record

## Local checks
- Production build and strict TypeScript checks: PASS.
- Seven model tests: PASS.
- Three JSDOM interaction tests: PASS. Covers setup disclosure, preview, empty-title validation, creation, status edit, filters, delete cancel/confirm, dialog cancellation/reopening.
- Two mocked remote-state tests: PASS. Blocks posting until initial comments load completes; surfaces PostgREST plain-object error messages. These do not exercise a live database.

## Live verification
The following checks were completed against the configured deployment and reported by the deployment verification task:
- Live browser task dragging, reload persistence, editing, comments and filtering: PASS.
- Live two-user row-level-security isolation checks: PASS.
- A live deployment exists. Final submission and demo links are intentionally omitted from this repository copy.

## Automated browser coverage
Four Playwright browser tests exist in `e2e/board.spec.ts`. Execution was blocked before page load by the execution environment prohibiting Chromium IPC sockets. They are not claimed as passed. Run `npx playwright install chromium` then `npm run test:e2e` in a supported environment. For a system Chromium use `CHROMIUM_PATH=/path/to/chromium`.

## Repeating live security checks
`scripts/verify-rls.mjs` tests two real anonymous sessions against a configured disposable project with public environment values. It creates two anonymous auth records and removes fixture tasks/comments, not auth records. See `SECURITY.md` for the broader manual checklist. Passing checks do not replace reviewing the deployed configuration or additional security testing.

The absent-configuration setup screen and in-memory preview remain intentionally explicit. The preview does not persist data.
