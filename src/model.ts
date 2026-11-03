export const columns = [
  { id: "todo", name: "To Do", color: "#8b8f98" },
  { id: "in_progress", name: "In Progress", color: "#c48c3b" },
  { id: "in_review", name: "In Review", color: "#8372ad" },
  { id: "done", name: "Done", color: "#548a70" },
] as const;
export type Status = (typeof columns)[number]["id"];
export type Priority = "low" | "normal" | "high";
export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due_date: string | null;
  assignee: string;
  labels: string[];
  user_id: string;
  created_at: string;
  updated_at?: string;
}
export type TaskInput = Pick<
  Task,
  | "title"
  | "description"
  | "status"
  | "priority"
  | "due_date"
  | "assignee"
  | "labels"
>;
export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
}
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const isOverdue = (t: Task) =>
  !!t.due_date && t.due_date < today() && t.status !== "done";
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
export function filterTasks(
  tasks: Task[],
  search: string,
  priority: string,
  assignee: string,
  label: string,
) {
  return tasks.filter(
    (t) =>
      (!search || t.title.toLowerCase().includes(search.toLowerCase())) &&
      (!priority || t.priority === priority) &&
      (!assignee || t.assignee === assignee) &&
      (!label || t.labels.includes(label)),
  );
}
export function validateTask(t: TaskInput) {
  if (!t.title.trim()) return "Give your task a title.";
  if (t.title.trim().length > 180)
    return "Keep the title under 180 characters.";
  if (t.description.length > 5000)
    return "Keep the description under 5,000 characters.";
  return null;
}
