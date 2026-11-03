# Security model and verification

## Boundary

Every guest receives a Supabase Auth user ID by `signInAnonymously()`. A signed-in guest has the `authenticated` database role. The public project key alone is not a session and has no access to these tables. All task and comment requests are checked by PostgreSQL Row Level Security; frontend filtering is only a convenience, never the security boundary.

Each guest owns a **private workspace**. Assignee strings are display names only: they do not invite people, grant access, or establish shared authentication. All per-task data is private to its owner. Refreshing the same browser retains the guest session; clearing browser storage, signing out, or switching devices loses access to that anonymous identity unless an account-linking flow is added later. Do not put sensitive personal information into this demonstration.

## Installation and key handling

1. Use a fresh Supabase free-tier project and run `supabase/schema.sql` once. The migration is transactional and intentionally errors if its tables already exist. Never drop existing tables to make it run without a separate backup/review.
2. Enable anonymous sign-ins in Supabase Authentication. No password or email identity is collected.
3. Configure the frontend with the project URL and **public anon or publishable key only**. A public key is intentionally shipped to the browser; it does not bypass RLS.
4. Never put the service-role key, secret API key, JWT signing secret, database password, or personal session token in a `VITE_` variable, source code, screenshots, final assessment document, or repository.
5. Use HTTPS for the live site. The project's auth storage is a browser-session credential: protect against XSS, avoid third-party scripts, and never log tokens. Text must be rendered through React's escaped text rendering, not unsanitized HTML.
6. Configure anonymous-auth abuse protection and appropriate rate limits before wider exposure. If enabling CAPTCHA in Supabase, the UI must collect and pass a valid CAPTCHA token; enabling it without that integration will block anonymous sign-in. Cleanup of abandoned anonymous accounts is a separate administrative process; deleting an auth user cascades their tasks and comments.

## Database invariants

- Only rows with `user_id = auth.uid()` are visible or writable.
- `WITH CHECK` prevents inserts or updates that claim another user's identity.
- Authenticated clients cannot update `id`, `user_id`, `created_at`, or `updated_at`; only task content fields are granted UPDATE. The trigger supplies `updated_at`.
- Comments require both matching `user_id` and ownership of the parent task. A caller cannot attach a comment to another guest's task even if they know its UUID. Clients cannot move comments between tasks.
- Task deletion cascades its comments. Auth user deletion cascades all owned data.
- Database checks reject blank/overlong titles, unknown status/priority, oversized descriptions/comments, oversized assignee names, and excessive/null labels.
- `anon` and `PUBLIC` receive no table privileges. Administrators/service credentials still have privileged powers and must never enter the browser.

## Required two-session integration test

Live two-user RLS checks passed against the configured deployment; see `VERIFICATION.md`. The following is a broader checklist to repeat against your own configured Supabase project; not every checklist item is covered by the included script or claimed as individually verified. Use separate browser profiles or two independent Supabase JS clients with `persistSession: false`; two tabs in the same browser may share one identity and are not an isolation test. Use only disposable sample data.

1. Create anonymous session A and separate anonymous session B. Confirm their IDs differ. Do not share their access tokens.
2. As A, insert task A1 using `user_id: A.id`. Select it back, update its title/status, reload, and verify persistence. Insert a comment on A1 and verify it reads back.
3. As B, select all tasks and comments: neither A1 nor A's comment may appear. A direct SELECT filtered by A1's known UUID must return an empty array.
4. As B, UPDATE A1's title and DELETE A1 using `.select()` on each mutation. Both must affect **zero rows**. PostgREST may return no error for an RLS-filtered update/delete; therefore checking `error === null` alone is not a valid security test. Re-read as A and verify A1 is unchanged.
5. As B, INSERT a task with `user_id: A.id`. Expect an RLS error. Insert a comment with `user_id: B.id` and `task_id: A1.id`. Expect an RLS error. Insert a comment pretending to be A and expect an RLS error.
6. As A, try to UPDATE `user_id` to B and try to UPDATE `id` or `created_at`. Expect a permission error because the client has no UPDATE grant on those columns, even before row-policy checks.
7. Repeat steps 2–5 with A and B swapped to check symmetric isolation.
8. Make unauthenticated table requests with only the public project key (no user JWT). Expect permission errors and no data exposure.
9. As A, submit whitespace-only titles, an invalid status, and invalid priority. Expect database constraint errors; the UI should show a helpful error without losing the user's draft.
10. Delete A1 as A. Confirm its comments no longer exist. Clean up B's test data using B's own session.

### Reproducible client setup (run in a private local test harness)

```js
import { createClient } from "@supabase/supabase-js";
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const a = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLIC_KEY,
  options,
);
const b = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLIC_KEY,
  options,
);
const { data: sa, error: ea } = await a.auth.signInAnonymously();
const { data: sb, error: eb } = await b.auth.signInAnonymously();
if (ea || eb || !sa.user || !sb.user || sa.user.id === sb.user.id) {
  throw new Error("Cannot establish distinct test users");
}
const { data: owned, error: insertError } = await a
  .from("tasks")
  .insert({ title: "Isolation test", user_id: sa.user.id })
  .select()
  .single();
if (insertError) throw insertError;
const { data: leaked, error: readError } = await b
  .from("tasks")
  .select("*")
  .eq("id", owned.id);
if (readError || leaked.length !== 0)
  throw new Error("Cross-user read check failed");
const { data: changed, error: changeError } = await b
  .from("tasks")
  .update({ title: "Should never happen" })
  .eq("id", owned.id)
  .select();
if (changeError || changed.length !== 0)
  throw new Error("Cross-user update check failed");
const { data: original, error: rereadError } = await a
  .from("tasks")
  .select("title")
  .eq("id", owned.id)
  .single();
if (rereadError || original.title !== "Isolation test")
  throw new Error("Owner data changed");
await a.from("tasks").delete().eq("id", owned.id);
```

The sample only covers the first cross-user read/update assertions; run the entire checklist, especially ownership spoofing and comments, before declaring full security verification complete. It creates real disposable auth users and rows in the configured project; do not run it against an unrelated production project.

## Sources

- [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
