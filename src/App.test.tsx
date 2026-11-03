// @vitest-environment jsdom
import { afterEach, beforeAll, describe, it, expect } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
describe("preview interactions", () => {
  it("is explicit about missing configuration and no persistence", async () => {
    render(<App />);
    expect(
      screen.getByText("Your private workspace is almost ready"),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Explore a local preview" }),
    );
    expect(screen.getByText(/Changes live only in memory/)).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });
  it("validates, creates, edits status, filters and deletes a task", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Explore a local preview" }),
    );
    await user.click(
      screen.getByRole("button", { name: "New task" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Create task" }),
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "Give your task a title.",
    );
    await user.type(
      screen.getByLabelText("Task title"),
      "Write integration tests",
    );
    await user.type(screen.getByLabelText("Assignee"), "Test User");
    await user.click(
      screen.getByRole("button", { name: "Create task" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(
      screen.getByRole("heading", { name: "Write integration tests" }),
    );
    await user.selectOptions(screen.getByLabelText("Status"), "done");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      within(
        screen.getByRole("region", { name: "Done" }),
      ).getByRole("heading", { name: "Write integration tests" }),
    ).toBeTruthy();
    await user.type(screen.getByLabelText("Search tasks"), "integration");
    expect(document.querySelectorAll(".task-card")).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: "Clear" }),
    );
    await user.click(
      screen.getByRole("heading", { name: "Write integration tests" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete" }),
    );
    await user.click(screen.getByRole("button", { name: "Keep task" }));
    expect(
      screen.queryByRole("button", { name: "Delete permanently" }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Delete" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete permanently" }),
    );
    expect(
      screen.queryByRole("heading", { name: "Write integration tests" }),
    ).toBeNull();
  });
  it("cancels without saving and allows reopening", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Explore a local preview" }),
    );
    await user.click(
      screen.getByRole("button", { name: "New task" }),
    );
    await user.type(screen.getByLabelText("Task title"), "Discard me");
    await user.click(
      screen.getByRole("button", { name: "Cancel" }),
    );
    expect(screen.queryByRole("heading", { name: "Discard me" })).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "New task" }),
    );
    expect(
      (screen.getByLabelText("Task title") as HTMLInputElement).value,
    ).toBe("");
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { bubbles: true, cancelable: true }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
