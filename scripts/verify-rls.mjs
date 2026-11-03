// Run manually against a disposable configured Supabase project.
// Creates two anonymous users (auth records remain) and cleans up test tasks.
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_ANON_KEY;
assert(url && key, "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const a = createClient(url, key, options),
  b = createClient(url, key, options),
  unsigned = createClient(url, key, options);
const ar = await a.auth.signInAnonymously(),
  br = await b.auth.signInAnonymously();
assert.ifError(ar.error);
assert.ifError(br.error);
assert(ar.data.user.id !== br.data.user.id);
const aid = ar.data.user.id,
  bid = br.data.user.id;
let taskId;
try {
  const made = await a
    .from("tasks")
    .insert({ title: "RLS integration fixture", user_id: aid })
    .select()
    .single();
  assert.ifError(made.error);
  taskId = made.data.id;
  const own = await a.from("tasks").select().eq("id", taskId);
  assert.ifError(own.error);
  assert.equal(own.data.length, 1);
  const hidden = await b.from("tasks").select().eq("id", taskId);
  assert.ifError(hidden.error);
  assert.equal(hidden.data.length, 0);
  const edit = await b
    .from("tasks")
    .update({ title: "FORBIDDEN" })
    .eq("id", taskId)
    .select();
  assert.ifError(edit.error);
  assert.equal(edit.data.length, 0);
  const del = await b.from("tasks").delete().eq("id", taskId).select();
  assert.ifError(del.error);
  assert.equal(del.data.length, 0);
  const spoof = await b
    .from("tasks")
    .insert({ title: "FORBIDDEN", user_id: aid });
  assert(spoof.error, "Forged owner insert must fail");
  const transfer = await a
    .from("tasks")
    .update({ user_id: bid })
    .eq("id", taskId);
  assert(transfer.error, "Owner transfer must fail");
  const badComment = await b
    .from("comments")
    .insert({ task_id: taskId, user_id: bid, body: "FORBIDDEN" });
  assert(badComment.error, "Cross-owner comment must fail");
  const comment = await a
    .from("comments")
    .insert({ task_id: taskId, user_id: aid, body: "Private note" })
    .select()
    .single();
  assert.ifError(comment.error);
  const hiddenComment = await b.from("comments").select().eq("task_id", taskId);
  assert.ifError(hiddenComment.error);
  assert.equal(hiddenComment.data.length, 0);
  const anonymous = await unsigned.from("tasks").select();
  assert(anonymous.error, "Unsigned access should have no table privileges");
  const changed = await a
    .from("tasks")
    .update({ status: "done" })
    .eq("id", taskId)
    .select()
    .single();
  assert.ifError(changed.error);
  assert.equal(changed.data.status, "done");
  console.log(
    "PASS: owner CRUD, cross-user isolation, forged-owner rejection, immutable ownership, comment isolation and unsigned denial.",
  );
} finally {
  if (taskId) await a.from("tasks").delete().eq("id", taskId);
  await a.auth.signOut();
  await b.auth.signOut();
}
