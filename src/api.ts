import { createClient } from "@supabase/supabase-js";
import type { Task, TaskInput, Comment } from "./model";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = !!url && !!key && !url.includes("YOUR_PROJECT");
const client = configured ? createClient(url, key) : null;
let sessionPromise: Promise<string> | null = null;
export function session() {
  if (!client) throw new Error("Supabase is not configured.");
  if (!sessionPromise)
    sessionPromise = (async () => {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data.session) return data.session.user.id;
      const result = await client.auth.signInAnonymously();
      if (result.error) throw result.error;
      return result.data.user!.id;
    })().catch((e) => {
      sessionPromise = null;
      throw e;
    });
  return sessionPromise;
}
export async function listTasks() {
  await session();
  const { data, error } = await client!
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Task[];
}
export async function saveTask(input: TaskInput, id?: string) {
  const user_id = await session();
  const query = id
    ? client!.from("tasks").update(input).eq("id", id).select().single()
    : client!
        .from("tasks")
        .insert({ ...input, user_id })
        .select()
        .single();
  const { data, error } = await query;
  if (error) throw error;
  return data as Task;
}
export async function removeTask(id: string) {
  await session();
  const { data, error } = await client!
    .from("tasks")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data?.length)
    throw new Error("Task was not found or could not be deleted.");
}
export async function listComments(id: string) {
  await session();
  const { data, error } = await client!
    .from("comments")
    .select("*")
    .eq("task_id", id)
    .order("created_at");
  if (error) throw error;
  return data as Comment[];
}
export async function addComment(id: string, body: string) {
  const user_id = await session();
  const { data, error } = await client!
    .from("comments")
    .insert({ task_id: id, user_id, body })
    .select()
    .single();
  if (error) throw error;
  return data as Comment;
}
