import { describe, it, expect } from "vitest";
import {
  filterTasks,
  isOverdue,
  initials,
  validateTask,
  type Task,
  type TaskInput,
} from "./model";
const task: Task = {
  id: "1",
  user_id: "u",
  title: "Ship the board",
  description: "",
  status: "todo",
  priority: "high",
  due_date: "2000-01-01",
  assignee: "Alex Chen",
  labels: ["Design"],
  created_at: "2026-01-01",
};
describe("board model", () => {
  it("search is case insensitive", () =>
    expect(filterTasks([task], "BOARD", "", "", "")).toHaveLength(1));
  it("combines filters", () => {
    expect(
      filterTasks([task], "ship", "high", "Alex Chen", "Design"),
    ).toHaveLength(1);
    expect(filterTasks([task], "ship", "low", "", "")).toHaveLength(0);
  });
  it("requires exact label and assignee", () => {
    expect(filterTasks([task], "", "", "Alex", "")).toHaveLength(0);
    expect(filterTasks([task], "", "", "", "Des")).toHaveLength(0);
  });
  it("ignores completed tasks when counting overdue", () => {
    expect(isOverdue(task)).toBe(true);
    expect(isOverdue({ ...task, status: "done" })).toBe(false);
    expect(isOverdue({ ...task, due_date: null })).toBe(false);
  });
  it("uses up to two initials", () => {
    expect(initials(" Alex  Chen ")).toBe("AC");
    expect(initials("")).toBe("");
    expect(initials("Maya")).toBe("M");
  });
  it("rejects blank and excessive titles", () => {
    expect(validateTask({ ...task, title: "  " })).toBeTruthy();
    expect(validateTask({ ...task, title: "a".repeat(181) })).toBeTruthy();
    expect(validateTask(task)).toBeNull();
  });
  it("enforces description length", () =>
    expect(
      validateTask({ ...task, description: "a".repeat(5001) }),
    ).toBeTruthy());
});
