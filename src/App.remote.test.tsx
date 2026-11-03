// @vitest-environment jsdom
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as api from "./api";
vi.mock("./api", () => ({
  configured: true,
  listTasks: vi.fn(),
  listComments: vi.fn(),
  addComment: vi.fn(),
}));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const task = { id: "task-a", user_id: "user-a", title: "Remote task", description: "", status: "todo" as const, priority: "normal" as const, due_date: null, assignee: "", labels: [], created_at: "2026-11-03T00:00:00Z" };
describe("remote state handling", () => {
  it("prevents adding a comment until the initial list resolves", async () => {
    vi.mocked(api.listTasks).mockResolvedValue([task]);
    let resolveComments!: (value: never[]) => void;
    vi.mocked(api.listComments).mockImplementation(() => new Promise(resolve => { resolveComments = resolve; }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("heading", { name: "Remote task" }));
    await user.type(screen.getByLabelText("New comment"), "Keep this comment");
    const button = screen.getByRole("button", { name: "Add comment" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await user.click(button);
    expect(api.addComment).not.toHaveBeenCalled();
    await act(async () => resolveComments([]));
    expect(button.disabled).toBe(false);
    vi.mocked(api.addComment).mockResolvedValue({ id: "comment-a", task_id: task.id, user_id: task.user_id, body: "Keep this comment", created_at: task.created_at });
    await user.click(button);
    expect(await screen.findByText("Keep this comment")).toBeTruthy();
    expect(api.addComment).toHaveBeenCalledTimes(1);
  });
  it("shows PostgREST plain-object error messages", async () => {
    vi.mocked(api.listTasks).mockRejectedValue({ message: "Database is unavailable" });
    render(<App />);
    expect((await screen.findByRole("alert")).textContent).toContain("Database is unavailable");
  });
});
