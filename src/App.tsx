import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ArrowUpRight,
  Plus,
  Search,
  LayoutGrid,
  Check,
  CalendarDays,
  X,
  ArrowRight,
  Flag,
  MessageSquare,
  Trash2,
  RefreshCw,
  PanelLeft,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Clock3,
  Inbox,
} from "lucide-react";
import * as api from "./api";
import {
  columns,
  filterTasks,
  initials,
  isOverdue,
  validateTask,
  type Task,
  type TaskInput,
  type Status,
  type Comment,
} from "./model";
const blank = (status: Status = "todo"): TaskInput => ({
  title: "",
  description: "",
  status,
  priority: "normal",
  due_date: null,
  assignee: "",
  labels: [],
});
const seed: Task[] = [
  {
    title: "Map the first-run experience",
    description:
      "Keep the path from a first idea to a finished task simple and considered.",
    status: "todo",
    priority: "high",
    labels: ["Research"],
    assignee: "Alex Chen",
  },
  {
    title: "Explore a quieter visual language",
    description: "A focused workspace with room to think.",
    status: "todo",
    priority: "normal",
    labels: ["Design"],
    assignee: "Maya Kim",
  },
  {
    title: "Build the board interactions",
    description: "Make movement between stages feel natural, on every screen.",
    status: "in_progress",
    priority: "high",
    labels: ["Engineering"],
    assignee: "Alex Chen",
  },
  {
    title: "Polish the small moments",
    description: "Empty states, helpful feedback, and a little less friction.",
    status: "in_review",
    priority: "normal",
    labels: ["Design"],
    assignee: "Maya Kim",
  },
  {
    title: "Define the project foundations",
    description: "Agree on a small, thoughtful scope.",
    status: "done",
    priority: "low",
    labels: ["Planning"],
    assignee: "Alex Chen",
  },
].map((t, i) => ({
  ...t,
  id: `preview-${i}`,
  user_id: "preview",
  created_at: new Date().toISOString(),
  due_date: null,
})) as Task[];
const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === "object" && e !== null && "message" in e && typeof e.message === "string"
      ? e.message
      : "Something went wrong. Please try again.";
function Card({
  task,
  onOpen,
  overlay = false,
}: {
  task: Task;
  onOpen: () => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: overlay ? `overlay-${task.id}` : task.id,
    data: task,
    disabled: overlay,
  });
  return (
    <article
      ref={setNodeRef}
      className={`task-card ${isDragging ? "dragging" : ""} ${overlay ? "lifted" : ""}`}
    >
      <div className="card-top">
        <span className="task-code">FL-{task.id.slice(-4).toUpperCase()}</span>
        <button
          aria-label={`Drag ${task.title}`}
          className="drag-handle"
          {...listeners}
          {...attributes}
        >
          ⠿
        </button>
      </div>
      <button className="card-open" onClick={onOpen}>
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
      </button>
      {task.labels.length > 0 && (
        <div className="tags">
          {task.labels.slice(0, 3).map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
      <div className="card-bottom">
        <span className={`priority ${task.priority}`}>
          <Flag size={12} />
          {task.priority}
        </span>
        {task.due_date && (
          <span className={isOverdue(task) ? "overdue" : "date"}>
            <CalendarDays size={12} />
            {task.due_date.slice(5)}
          </span>
        )}
        {task.assignee && (
          <span className="avatar" title={task.assignee}>
            {initials(task.assignee)}
          </span>
        )}
      </div>
    </article>
  );
}
function Column({
  id,
  name,
  color,
  tasks,
  onOpen,
  onNew,
}: {
  id: Status;
  name: string;
  color: string;
  tasks: Task[];
  onOpen: (t: Task) => void;
  onNew: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={`column ${isOver ? "drop-target" : ""}`}
      aria-label={name}
    >
      <div className="column-head">
        <span className="status-dot" style={{ background: color }} />
        <h2>{name}</h2>
        <span className="count">{tasks.length}</span>
        <button
          className="icon-button"
          onClick={onNew}
          aria-label={`Add task to ${name}`}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="cards">
        {tasks.map((t) => (
          <Card key={t.id} task={t} onOpen={() => onOpen(t)} />
        ))}
        {!tasks.length && (
          <div className="column-empty">
            <Inbox size={22} />
            <span>A little room for progress</span>
            <small>Drop a task here, or add a new one.</small>
          </div>
        )}
      </div>
      <button className="add-in-column" onClick={onNew}>
        <Plus size={15} /> Add task
      </button>
    </section>
  );
}
export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false),
    [search, setSearch] = useState(""),
    [priority, setPriority] = useState(""),
    [assignee, setAssignee] = useState(""),
    [label, setLabel] = useState(""),
    [editor, setEditor] = useState<TaskInput | null>(null),
    [editing, setEditing] = useState<Task | null>(null),
    [saving, setSaving] = useState(false),
    [formError, setFormError] = useState(""),
    [active, setActive] = useState<Task | null>(null),
    [toast, setToast] = useState(""),
    [comments, setComments] = useState<Comment[]>([]),
    [comment, setComment] = useState(""),
    [commentsLoading, setCommentsLoading] = useState(false),
    [commentError, setCommentError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const busy = useRef(false),
    dialog = useRef<HTMLDialogElement>(null),
    commentVersion = useRef(0),
    previewComments = useRef<Record<string, Comment[]>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  async function load() {
    setLoading(true);
    setError("");
    try {
      setTasks(await api.listTasks());
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (api.configured) void load();
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    if (editor) dialog.current?.showModal();
    else dialog.current?.close();
  }, [editor !== null]);
  function open(task: Task | null, status: Status = "todo") {
    if (busy.current) return;
    setEditing(task);
    setEditor(
      task
        ? {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            assignee: task.assignee,
            labels: task.labels,
          }
        : blank(status),
    );
    setFormError("");
    setCommentError("");
    setConfirmDelete(false);
    setComment("");
    setComments(
      preview && task ? (previewComments.current[task.id] ?? []) : [],
    );
    const version = ++commentVersion.current;
    if (task && !preview) {
      setCommentsLoading(true);
      api
        .listComments(task.id)
        .then((c) => {
          if (commentVersion.current === version) setComments(c);
        })
        .catch((e) => {
          if (commentVersion.current === version) setCommentError(message(e));
        })
        .finally(() => {
          if (commentVersion.current === version) setCommentsLoading(false);
        });
    } else setCommentsLoading(false);
  }
  function close() {
    if (busy.current) return;
    commentVersion.current++;
    setEditor(null);
  }
  async function persist() {
    if (!editor || busy.current) return;
    const invalid = validateTask(editor);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    busy.current = true;
    setSaving(true);
    setFormError("");
    try {
      const input = {
        ...editor,
        title: editor.title.trim(),
        assignee: editor.assignee.trim(),
        labels: [
          ...new Set(editor.labels.map((l) => l.trim()).filter(Boolean)),
        ],
      };
      const saved = preview
        ? {
            ...input,
            id: editing?.id ?? crypto.randomUUID(),
            user_id: "preview",
            created_at: editing?.created_at ?? new Date().toISOString(),
          }
        : await api.saveTask(input, editing?.id);
      setTasks((ts) =>
        editing
          ? ts.map((t) => (t.id === saved.id ? saved : t))
          : [saved, ...ts],
      );
      setEditor(null);
      setToast(editing ? "Changes saved" : "Task created");
    } catch (e) {
      setFormError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function move(event: DragEndEvent) {
    setActive(null);
    const status = event.over?.id as Status | undefined;
    const task = tasks.find((t) => t.id === event.active.id);
    if (
      !task ||
      !status ||
      task.status === status ||
      busy.current ||
      !columns.some((c) => c.id === status)
    )
      return;
    busy.current = true;
    setSaving(true);
    try {
      const { title, description, priority, due_date, assignee, labels } = task;
      const saved = preview
        ? { ...task, status }
        : await api.saveTask(
            {
              title,
              description,
              priority,
              due_date,
              assignee,
              labels,
              status,
            },
            task.id,
          );
      setTasks((ts) => ts.map((t) => (t.id === task.id ? saved : t)));
      setToast(`Moved to ${columns.find((c) => c.id === status)?.name}`);
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function destroy() {
    if (!editing || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      if (!preview) await api.removeTask(editing.id);
      setTasks((ts) => ts.filter((t) => t.id !== editing.id));
      setEditor(null);
      setToast("Task deleted");
    } catch (e) {
      setFormError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function sendComment() {
    if (!editing || !comment.trim() || busy.current || commentsLoading) return;
    busy.current = true;
    setSaving(true);
    setCommentError("");
    try {
      const saved = preview
        ? {
            id: crypto.randomUUID(),
            task_id: editing.id,
            user_id: "preview",
            body: comment.trim(),
            created_at: new Date().toISOString(),
          }
        : await api.addComment(editing.id, comment.trim());
      setComments((cs) => [...cs, saved]);
      if (preview)
        previewComments.current[editing.id] = [
          ...(previewComments.current[editing.id] ?? []),
          saved,
        ];
      setComment("");
    } catch (e) {
      setCommentError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const visible = filterTasks(tasks, search, priority, assignee, label),
    done = tasks.filter((t) => t.status === "done").length,
    people = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))],
    labels = [...new Set(tasks.flatMap((t) => t.labels))];
  const ready = api.configured || preview;
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Layers size={20} />
          </span>
          folio<span className="brand-period">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">S</span>
          <div>
            <b>Studio workspace</b>
            <small>Your ideas, in motion</small>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <div className="nav-item selected">
          <LayoutGrid size={17} /> Project board <span>{tasks.length}</span>
        </div>
        <div className="sidebar-note">
          <div className="note-spark">✳</div>
          <h3>
            Make room for
            <br />
            your next great idea.
          </h3>
          <p>
            Small steps. Clear priorities.
            <br />A little progress, every day.
          </p>
        </div>
        <div className="session-badge">
          <ShieldCheck size={17} />
          <div>
            <b>Private by default</b>
            <small>
              {preview ? "Preview session" : "Your anonymous workspace"}
            </small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <PanelLeft size={16} />
            <span>Workspace</span>
            <span className="slash">/</span>
            <b>Project board</b>
          </div>
          <span className="top-label">A SPACE TO MAKE THINGS HAPPEN</span>
        </header>
        <section className="content">
          <div className="project-header">
            <div>
              <div className="eyebrow">YOUR WORK, BEAUTIFULLY ORGANIZED</div>
              <h1>Good things take shape.</h1>
              <p>
                A clear view of what’s next. Move ideas forward, one task at a
                time.
              </p>
            </div>
            <button
              className="primary"
              disabled={!ready || loading || saving}
              onClick={() => open(null)}
            >
              <Plus size={17} /> New task
            </button>
          </div>
          <div className="summary">
            <div>
              <span className="summary-icon">
                <Layers size={18} />
              </span>
              <b>{tasks.length}</b>
              <span>Total tasks</span>
            </div>
            <div>
              <span className="summary-icon green">
                <CheckCircle2 size={18} />
              </span>
              <b>{done}</b>
              <span>Completed</span>
            </div>
            <div>
              <span className="summary-icon amber">
                <Clock3 size={18} />
              </span>
              <b>{tasks.filter(isOverdue).length}</b>
              <span>Overdue</span>
            </div>
            <div className="progress-summary">
              <span>
                {tasks.length ? Math.round((done / tasks.length) * 100) : 0}%
                complete
              </span>
              <div className="progress-track">
                <i
                  style={{
                    width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
          {!ready && (
            <div className="setup">
              <div>
                <ShieldCheck size={23} />
                <h2>Your private workspace is almost ready</h2>
                <p>
                  Connect Supabase to securely save your tasks. Set the two
                  public environment values, enable anonymous sign-in, and run
                  the supplied schema.
                </p>
                <small>
                  No credentials are configured. Nothing has been saved to a
                  server.
                </small>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  setPreview(true);
                  setTasks(seed);
                }}
              >
                Explore a local preview <ArrowRight size={15} />
              </button>
            </div>
          )}
          {preview && (
            <div className="notice">
              Preview mode · Changes live only in memory and disappear on
              refresh. Supabase is not connected.
            </div>
          )}
          {error && (
            <div role="alert" className="error-banner">
              <span>{error}</span>
              {!preview && (
                <button onClick={() => void load()} disabled={loading}>
                  <RefreshCw size={14} /> Try again
                </button>
              )}
            </div>
          )}
          <div className="board-toolbar">
            <div className="board-tab">
              <LayoutGrid size={16} /> Board <span>{visible.length}</span>
            </div>
            <div className="filters">
              <label className="search">
                <Search size={15} />
                <input
                  aria-label="Search tasks"
                  placeholder="Search tasks…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select
                aria-label="Filter by priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">All priorities</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
              <select
                aria-label="Filter by assignee"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Everyone</option>
                {people.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <select
                aria-label="Filter by label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              >
                <option value="">All labels</option>
                {labels.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              {(search || priority || assignee || label) && (
                <button
                  className="clear-filters"
                  onClick={() => {
                    setSearch("");
                    setPriority("");
                    setAssignee("");
                    setLabel("");
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <div className="loading" role="status">
              <RefreshCw className="spin" size={22} />
              <span>Preparing your workspace…</span>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={(e) =>
                setActive(tasks.find((t) => t.id === e.active.id) ?? null)
              }
              onDragCancel={() => setActive(null)}
              onDragEnd={(e) => void move(e)}
            >
              <div className="board">
                {columns.map((c) => (
                  <Column
                    key={c.id}
                    {...c}
                    tasks={visible.filter((t) => t.status === c.id)}
                    onOpen={(t) => open(t)}
                    onNew={() => ready && open(null, c.id)}
                  />
                ))}
              </div>
              <DragOverlay>
                {active ? (
                  <Card task={active} onOpen={() => {}} overlay />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
          <footer className="board-footer">
            <span>
              <ShieldCheck size={12} />
              {preview
                ? "Local preview — not persisted"
                : "Only you can see and edit your tasks"}
            </span>
            <span>
              {saving
                ? "Saving…"
                : "Drag a card to move it · Open a card to edit"}
            </span>
          </footer>
        </section>
      </main>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-content">
          {editor && (
            <>
              <header className="dialog-header">
                <div>
                  <span className="eyebrow">MAKE THE NEXT MOVE</span>
                  <h2 id="dialog-title">
                    {editing ? "Task details" : "A new beginning"}
                  </h2>
                </div>
                <button
                  onClick={close}
                  disabled={saving}
                  aria-label="Close task"
                  className="icon-button"
                >
                  <X size={20} />
                </button>
              </header>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void persist();
                }}
              >
                <label>
                  Task title
                  <input
                    autoFocus
                    maxLength={180}
                    placeholder="What would you like to work on?"
                    value={editor.title}
                    onChange={(e) =>
                      setEditor({ ...editor, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Description
                  <textarea
                    rows={3}
                    maxLength={5000}
                    placeholder="A little context goes a long way…"
                    value={editor.description}
                    onChange={(e) =>
                      setEditor({ ...editor, description: e.target.value })
                    }
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Status
                    <select
                      value={editor.status}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          status: e.target.value as Status,
                        })
                      }
                    >
                      {columns.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Priority
                    <select
                      value={editor.priority}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          priority: e.target.value as TaskInput["priority"],
                        })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label>
                    Due date
                    <input
                      type="date"
                      value={editor.due_date ?? ""}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          due_date: e.target.value || null,
                        })
                      }
                    />
                  </label>
                  <label>
                    Assignee
                    <input
                      maxLength={80}
                      list="people"
                      placeholder="Add a name"
                      value={editor.assignee}
                      onChange={(e) =>
                        setEditor({ ...editor, assignee: e.target.value })
                      }
                    />
                    <datalist id="people">
                      {people.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </label>
                </div>
                <label>
                  Labels <small>(comma-separated)</small>
                  <input
                    maxLength={300}
                    placeholder="Design, Engineering, Research"
                    value={editor.labels.join(",")}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        labels: e.target.value.split(","),
                      })
                    }
                  />
                </label>
                {formError && (
                  <div className="form-error" role="alert">
                    {formError}
                  </div>
                )}
                <div className="dialog-actions">
                  {editing && (
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => setConfirmDelete(!confirmDelete)}
                      disabled={saving}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  )}
                  <div />
                  <button
                    type="button"
                    className="secondary"
                    disabled={saving}
                    onClick={close}
                  >
                    Cancel
                  </button>
                  <button className="primary" disabled={saving}>
                    {saving
                      ? "Saving…"
                      : editing
                        ? "Save changes"
                        : "Create task"}
                  </button>
                </div>
              </form>
              {confirmDelete && (
                <div className="delete-confirm" role="alert">
                  Delete this task and its comments? This cannot be undone.
                  <button
                    className="danger"
                    disabled={saving}
                    onClick={() => void destroy()}
                  >
                    Delete permanently
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep task
                  </button>
                </div>
              )}
              {editing && (
                <section className="comments">
                  <h3>
                    <MessageSquare size={16} /> Conversation{" "}
                    <span>{comments.length}</span>
                  </h3>
                  {commentsLoading && <p>Loading comments…</p>}
                  {!commentsLoading && !comments.length && (
                    <p className="muted">Leave a note for your future self.</p>
                  )}
                  {comments.map((c) => (
                    <div className="comment" key={c.id}>
                      <div>
                        <b>You</b>
                        <time>{new Date(c.created_at).toLocaleString()}</time>
                      </div>
                      <p>{c.body}</p>
                    </div>
                  ))}
                  {commentError && (
                    <p role="alert" className="form-error">
                      {commentError}
                    </p>
                  )}
                  <textarea
                    aria-label="New comment"
                    maxLength={2000}
                    rows={2}
                    placeholder="Add a thoughtful note…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button
                    className="secondary"
                    disabled={saving || commentsLoading || !comment.trim()}
                    onClick={() => void sendComment()}
                  >
                    Add comment <ArrowUpRight size={14} />
                  </button>
                </section>
              )}
            </>
          )}
        </div>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
