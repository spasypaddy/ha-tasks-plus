/*
 * Tasks Plus \u2014 sidebar panel for Home Assistant.
 * Tasks with subtasks, notes, due dates and priorities, saved in Home Assistant.
 * Colours come from the active Home Assistant theme, so it matches light and dark mode.
 */

const STYLE = `
<style>
  :host {
    display: block; min-height: 100%;
    --bg: var(--primary-background-color, #fafafa);
    --surface: var(--card-background-color, var(--ha-card-background, #fff));
    --ink: var(--primary-text-color, #212121);
    --muted: var(--secondary-text-color, #727272);
    --line: var(--divider-color, rgba(0,0,0,.12));
    --accent: var(--primary-color, #03a9f4);
    --on-accent: var(--text-primary-color, #fff);
    --accent-soft: color-mix(in srgb, var(--accent) 16%, transparent);
    --danger: var(--error-color, #db4437);
    --danger-soft: color-mix(in srgb, var(--danger) 15%, transparent);
    --p-high: var(--red-color, #f44336);
    --p-medium: var(--orange-color, #ff9800);
    --p-low: var(--green-color, #4caf50);
    background: var(--bg); color: var(--ink);
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, "Noto Sans", sans-serif));
    font-size: 16px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  button { font: inherit; cursor: pointer; }

  .toolbar {
    position: sticky; top: 0; z-index: 4;
    display: flex; align-items: center; gap: 4px;
    height: var(--header-height, 56px);
    padding: 0 12px 0 max(4px, env(safe-area-inset-left, 0px));
    background: var(--app-header-background-color, var(--accent));
    color: var(--app-header-text-color, var(--on-accent));
    border-bottom: var(--app-header-border-bottom, none);
  }
  .toolbar .title { font-size: 20px; font-weight: 400; margin-left: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .wrap {
    max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px;
    padding-block: 24px 64px;
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
  header { display: flex; flex-direction: column; gap: 8px; }
  .date { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
  .progress { display: flex; align-items: center; gap: 12px; }
  .bar { flex: 1; height: 8px; background: var(--line); border-radius: 99px; overflow: hidden; }
  .bar span { display: block; height: 100%; width: 0; background: var(--accent); border-radius: 99px; transition: width .35s ease; }
  .count { font-size: 14px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

  form.add { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  form.add #newTask { flex: 1 1 240px; }
  form.add input {
    min-width: 0; font: inherit; color: var(--ink); background: var(--surface);
    border: 1.5px solid var(--line); border-radius: 12px; padding: 12px 14px;
  }
  form.add input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .datefield { display: flex; align-items: center; gap: 8px; flex: 0 1 auto; }
  .datefield span, .prio-pick > span { font-size: 13px; color: var(--muted); font-weight: 600; white-space: nowrap; }
  .btn-add { min-height: 48px; background: var(--accent); color: var(--on-accent); border: 0; border-radius: 12px; padding: 0 22px; font-weight: 600; }
  .prio-pick { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

  .tabs { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 4px; width: fit-content; }
  .tabs button { background: none; border: 0; color: var(--muted); padding: 6px 14px; border-radius: 7px; font-size: 14px; font-weight: 500; }
  .tabs button[aria-pressed="true"] { background: var(--accent-soft); color: var(--ink); }

  .list { list-style: none; margin: 0; padding: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
  .task { border-top: 1px solid var(--line); }
  .task:first-child { border-top: 0; }
  .task.p-high { box-shadow: inset 5px 0 0 var(--p-high); }
  .task.p-medium { box-shadow: inset 5px 0 0 var(--p-medium); }
  .task.p-low { box-shadow: inset 5px 0 0 var(--p-low); }
  .task.is-done { box-shadow: none; }

  .item { display: flex; align-items: center; gap: 12px; padding: 14px 10px 14px 16px; }
  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 3px; }
  .meta:empty { display: none; }
  .prio { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; white-space: nowrap; }
  .prio::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  .prio.high { color: var(--p-high); } .prio.medium { color: var(--p-medium); } .prio.low { color: var(--p-low); }
  .due { font-size: 12.5px; font-weight: 600; padding: 1px 9px; border-radius: 99px; background: var(--bg); color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; max-width: 100%; }
  .due.soon { background: var(--accent-soft); color: var(--accent); }
  .due.over { background: var(--danger-soft); color: var(--danger); }
  .subcount { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .subcount.all { color: var(--accent); font-weight: 600; }
  .notes-text { font-size: 14px; color: var(--muted); white-space: pre-wrap; overflow-wrap: anywhere; margin-top: 3px; line-height: 1.45; }

  .check { position: relative; flex: none; width: 24px; height: 24px; }
  .check input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
  .check .box { width: 24px; height: 24px; border: 2px solid var(--muted); border-radius: 7px; display: grid; place-items: center; transition: background .15s, border-color .15s; pointer-events: none; }
  .check .box svg { width: 14px; height: 14px; opacity: 0; transform: scale(.6); transition: opacity .15s, transform .15s; }
  .check input:checked + .box { background: var(--accent); border-color: var(--accent); }
  .check input:checked + .box svg { opacity: 1; transform: scale(1); }
  .check input:focus-visible + .box { outline: 2px solid var(--accent); outline-offset: 2px; }

  .text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .editable { background: none; border: 0; color: inherit; font: inherit; text-align: left; padding: 2px 6px; margin: -2px -6px; border-radius: 6px; cursor: text; }
  .editable:hover { background: var(--bg); }
  input.edit { flex: 1; min-width: 0; width: 100%; font: inherit; color: var(--ink); background: var(--bg); border: 1.5px solid var(--accent); border-radius: 7px; padding: 3px 8px; margin: -5px -10px; box-shadow: 0 0 0 3px var(--accent-soft); }
  input.edit:focus { outline: none; }
  .item.done .text, .sub.done .text { color: var(--muted); text-decoration: line-through; text-decoration-color: var(--muted); }

  .addsub { flex: none; background: none; border: 0; color: var(--muted); height: 32px; padding: 0 8px; border-radius: 8px; font-size: 13px; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; }
  .addsub svg { width: 15px; height: 15px; flex: none; }
  .addsub:hover, .addsub[aria-expanded="true"] { color: var(--accent); background: var(--bg); }
  .addsub.has { color: var(--accent); }
  .addsub.prio-btn.high { color: var(--p-high); } .addsub.prio-btn.medium { color: var(--p-medium); } .addsub.prio-btn.low { color: var(--p-low); }
  .del { flex: none; background: none; border: 0; color: var(--muted); width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; opacity: .55; }
  .del:hover { opacity: 1; color: var(--danger); background: var(--bg); }
  .del svg { width: 16px; height: 16px; }

  .chip { display: inline-flex; align-items: center; gap: 6px; background: var(--surface); border: 1.5px solid var(--line); color: var(--ink); border-radius: 99px; padding: 5px 12px; font-size: 14px; font-weight: 500; }
  .chip i { width: 10px; height: 10px; border-radius: 50%; background: var(--muted); }
  .chip.high i { background: var(--p-high); } .chip.medium i { background: var(--p-medium); } .chip.low i { background: var(--p-low); }
  .chip[aria-pressed="true"] { font-weight: 700; }
  .chip[aria-pressed="true"].high { border-color: var(--p-high); }
  .chip[aria-pressed="true"].medium { border-color: var(--p-medium); }
  .chip[aria-pressed="true"].low { border-color: var(--p-low); }
  .chip[aria-pressed="true"].none { border-color: var(--muted); }

  .panel-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 0 14px 14px 52px; }
  .panel-row input[type="date"] { font: inherit; font-size: 15px; color: var(--ink); background: var(--bg); border: 1.5px solid var(--line); border-radius: 9px; padding: 7px 10px; min-width: 0; }
  .noteedit { display: flex; flex-direction: column; gap: 8px; padding: 0 14px 14px 52px; }
  .noteedit textarea, .import textarea {
    font: inherit; font-size: 15px; color: var(--ink); background: var(--bg); border: 1.5px solid var(--line);
    border-radius: 9px; padding: 10px 12px; min-height: 96px; resize: vertical; width: 100%;
  }
  .btns { display: flex; gap: 8px; flex-wrap: wrap; }
  .mini { background: var(--accent-soft); color: var(--ink); border: 0; border-radius: 9px; padding: 7px 14px; font-weight: 600; font-size: 14px; }
  .mini.plain { background: none; color: var(--muted); }

  .subs { list-style: none; margin: 0; padding: 0 10px 8px 52px; display: flex; flex-direction: column; }
  .sub { display: flex; align-items: center; gap: 10px; padding: 5px 0 5px 8px; margin-left: -11px; font-size: 15px; border-left: 3px solid transparent; }
  .sub.p-high { border-left-color: var(--p-high); }
  .sub.p-medium { border-left-color: var(--p-medium); }
  .sub.p-low { border-left-color: var(--p-low); }
  .sub.done { border-left-color: transparent; }
  .sub .check, .sub .check .box { width: 20px; height: 20px; }
  .sub .check .box { border-radius: 6px; }
  .sub .check .box svg { width: 12px; height: 12px; }
  .sub .del, .sub .sub-prio { width: 28px; height: 28px; padding: 0; justify-content: center; }
  .sub .sub-prio:not(.high):not(.medium):not(.low) { opacity: .55; }
  .subprio { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0 8px 32px; }
  .subprio .chip { font-size: 13px; padding: 4px 10px; }
  .subadd { display: flex; gap: 8px; padding: 0 14px 14px 52px; }
  .subadd input { flex: 1; min-width: 0; font: inherit; font-size: 15px; color: var(--ink); background: var(--bg); border: 1.5px solid var(--line); border-radius: 9px; padding: 8px 12px; }
  .subadd button { background: var(--accent-soft); color: var(--ink); border: 0; border-radius: 9px; padding: 0 14px; font-weight: 600; font-size: 14px; }

  .noteedit textarea:focus, .import textarea:focus, .subadd input:focus, .panel-row input:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .empty { padding: 36px 20px; text-align: center; color: var(--muted); list-style: none; }
  .empty strong { display: block; font-size: 20px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }

  footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 14px; color: var(--muted); }
  .links { display: flex; gap: 16px; margin-left: auto; }
  .link { background: none; border: 0; color: var(--muted); text-decoration: underline; text-underline-offset: 3px; padding: 4px 0; }
  .link:hover { color: var(--ink); }
  .link.danger:hover { color: var(--danger); }
  .note { font-size: 13px; color: var(--muted); }
  .note.error { color: var(--danger); }
  .import { display: flex; flex-direction: column; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
  .import p { margin: 0; font-size: 14px; color: var(--muted); }

  @media (max-width: 480px) {
    .addsub { width: 32px; padding: 0; justify-content: center; }
    .addsub .lbl { display: none; }
    .item { gap: 4px; padding-left: 12px; padding-right: 4px; }
    .item .check { margin-right: 8px; }
    .subs, .subadd, .noteedit, .panel-row { padding-left: 44px; }
    form.add #newTask { flex-basis: 100%; }
    .datefield { flex: 1 1 auto; }
    .due { white-space: normal; }
    form.add .datefield input { flex: 1 1 auto; }
  }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>`;

const TEMPLATE = `
<div class="toolbar">
  <ha-menu-button></ha-menu-button>
  <div class="title" id="title">Tasks</div>
</div>
<div class="wrap">
  <header>
    <div class="date" id="today"></div>
    <div class="progress">
      <div class="bar" aria-hidden="true"><span id="bar"></span></div>
      <div class="count" id="count">Loading\u2026</div>
    </div>
  </header>

  <form class="add" id="addForm">
    <input id="newTask" type="text" placeholder="Add a task, e.g. Book dentist appointment" autocomplete="off" maxlength="200" aria-label="New task">
    <label class="datefield"><span>Due</span><input id="newDue" type="date" aria-label="Due date (optional)"></label>
    <div class="prio-pick" id="newPrio" role="group" aria-label="Priority (optional)">
      <span>Priority</span>
      <button type="button" class="chip high" data-p="high" aria-pressed="false"><i></i>High</button>
      <button type="button" class="chip medium" data-p="medium" aria-pressed="false"><i></i>Medium</button>
      <button type="button" class="chip low" data-p="low" aria-pressed="false"><i></i>Low</button>
    </div>
    <button class="btn-add" type="submit">Add</button>
  </form>

  <div class="tabs" role="group" aria-label="Show">
    <button type="button" data-f="todo" aria-pressed="true">To-Do</button>
    <button type="button" data-f="done" aria-pressed="false">Done</button>
    <button type="button" data-f="all" aria-pressed="false">All</button>
  </div>

  <ul class="list" id="list"><li class="empty"><strong>Loading your list\u2026</strong></li></ul>

  <footer>
    <span class="note" id="note"></span>
    <div class="links">
      <button type="button" class="link" id="importToggle" aria-expanded="false">Import tasks</button>
      <button type="button" class="link danger" id="clearDone" hidden>Clear completed</button>
    </div>
  </footer>

  <div class="import" id="importBox" hidden>
    <p>Paste tasks exported from your old list (JSON). They're added to this list; nothing here is replaced.</p>
    <textarea id="importText" aria-label="Tasks to import" spellcheck="false"></textarea>
    <div class="btns">
      <button type="button" class="mini" id="importGo">Import</button>
      <button type="button" class="mini plain" id="importCancel">Cancel</button>
    </div>
  </div>
</div>`;

const ICONS = {
  tick: '<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3L13 4.5" stroke="var(--on-accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cross: '<svg viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  plus: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  note: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 2.5h6l3 3v8h-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5.5 8h5M5.5 10.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  cal: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  flag: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 14V2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.5 3h8.5l-2 3 2 3H3.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity=".18"/></svg>',
};

const PRIOS = { high: "High", medium: "Medium", low: "Low" };
const prioRank = (t) => ({ high: 0, medium: 1, low: 2 })[t.priority] ?? 3;
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ---- dates are "YYYY-MM-DD" in the viewer's local calendar ---- */
function parseDay(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function daysUntil(s) {
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseDay(s) - today) / 86400000);
}
function dueLabel(s, done, lang) {
  const dt = parseDay(s), n = daysUntil(s);
  const sameYear = dt.getFullYear() === new Date().getFullYear();
  const pretty = dt.toLocaleDateString(lang, sameYear
    ? { weekday: "short", day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" });
  if (done) return ["Due " + pretty, ""];
  if (n < 0) return ["Overdue \u00b7 " + pretty, "over"];
  if (n === 0) return ["Due today", "soon"];
  if (n === 1) return ["Due tomorrow", "soon"];
  if (n < 7) return ["Due " + dt.toLocaleDateString(lang, { weekday: "long" }), ""];
  return ["Due " + pretty, ""];
}

/* Accept the old list's export: an array of tasks, {tasks:[...]}, or
   rows from a document store ({id, data:{...}} or {..., fields}). */
function parseImport(text) {
  const raw = JSON.parse(text);
  let rows = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.tasks) ? raw.tasks : null);
  if (!rows) throw new Error("Expected a list of tasks.");
  return rows.map((r) => (r && typeof r === "object" && r.data && typeof r.data === "object" ? r.data : r))
    .filter((r) => r && typeof r === "object" && typeof r.text === "string" && r.text.trim());
}

/* The list UI. `api` talks to Home Assistant; everything else is local state. */
function createApp(root, api) {
  const $ = (id) => root.getElementById(id);
  const listEl = $("list"), countEl = $("count"), barEl = $("bar"), noteEl = $("note"), clearBtn = $("clearDone");

  let tasks = [];
  let loaded = false;
  let filter = "todo";
  let openSub = null, subDraft = "", focusSub = false;
  let openNote = null, noteDraft = "", focusNote = false;
  let openDate = null, openPrio = null, openSubPrio = null;
  let editKey = null, editDraft = "", focusEdit = false;
  let newPrio = "";
  let rendering = false;

  const lang = () => api.lang();
  function setToday() {
    $("today").textContent = new Date().toLocaleDateString(lang(), { weekday: "long", day: "numeric", month: "long" });
  }
  setToday();

  function showError(msg) { noteEl.textContent = msg; noteEl.className = "note error"; }
  function showNote(msg) { noteEl.textContent = msg; noteEl.className = "note"; }
  const errText = (e) => (e && (e.message || e.code)) || "unknown error";

  // One write at a time per task, so quick taps land in order
  const queues = {};
  function enqueue(id, fn, failMsg) {
    queues[id] = (queues[id] || Promise.resolve()).then(fn).catch((e) => showError(failMsg + " (" + errText(e) + ")"));
    return queues[id];
  }

  function render() { rendering = true; try { draw(); } finally { rendering = false; } }

  function draw() {
    const active = root.activeElement && root.activeElement.id;
    focusEdit = focusEdit || active === "edit-input";
    focusSub = focusSub || active === "sub-input";
    focusNote = focusNote || active === "note-input";
    const total = tasks.length, done = tasks.filter((t) => t.done).length;
    const overdue = tasks.filter((t) => !t.done && t.due && daysUntil(t.due) < 0).length;
    countEl.textContent = loaded ? (total ? done + " of " + total + " done" + (overdue ? " \u00b7 " + overdue + " overdue" : "") : "Nothing yet") : "Loading\u2026";
    barEl.style.width = total ? (done / total * 100) + "%" : "0";
    clearBtn.hidden = done === 0;

    // Unfinished first; then priority (high to low, none last); then soonest date, undated last; then when added
    const shown = tasks
      .filter((t) => filter === "all" || (filter === "done" ? t.done : !t.done))
      .sort((a, b) => (a.done - b.done)
        || (prioRank(a) - prioRank(b))
        || ((a.due ? 0 : 1) - (b.due ? 0 : 1))
        || (a.due && b.due ? a.due.localeCompare(b.due) : 0)
        || (a.created - b.created));

    listEl.textContent = "";
    if (!shown.length) {
      const li = document.createElement("li");
      li.className = "empty";
      const s = document.createElement("strong");
      const p = document.createElement("span");
      if (!loaded) s.textContent = "Loading your list\u2026";
      else if (!total) { s.textContent = "Your list is empty"; p.textContent = "Type a task above and press Add."; }
      else if (filter === "done") s.textContent = "Nothing ticked off yet";
      else { s.textContent = "All done!"; p.textContent = "Every task is ticked off."; }
      li.append(s, p);
      listEl.append(li);
      focusSub = focusNote = focusEdit = false;
      return;
    }

    for (const t of shown) {
      const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
      const li = document.createElement("li");
      li.className = "task" + (PRIOS[t.priority] ? " p-" + t.priority : "") + (t.done ? " is-done" : "");

      const row = document.createElement("div");
      row.className = "item" + (t.done ? " done" : "");
      const [label] = checkbox("c-" + t.id, t.done, "Mark \u201c" + t.text + "\u201d as done", (v) => toggle(t, v));
      const main = document.createElement("div");
      main.className = "main";
      main.append(textEl(t, null, t.text));

      const meta = document.createElement("div");
      meta.className = "meta";
      if (PRIOS[t.priority]) {
        const pr = document.createElement("span");
        pr.className = "prio " + t.priority; pr.textContent = PRIOS[t.priority];
        meta.append(pr);
      }
      if (t.due) {
        const [txt, cls] = dueLabel(t.due, t.done, lang());
        const d = document.createElement("span");
        d.className = "due" + (cls ? " " + cls : ""); d.textContent = txt;
        meta.append(d);
      }
      if (subs.length) {
        const n = subs.filter((s) => s.done).length;
        const sc = document.createElement("span");
        sc.className = "subcount" + (n === subs.length ? " all" : "");
        sc.textContent = n + " of " + subs.length + " steps";
        meta.append(sc);
      }
      main.append(meta);
      if (t.notes && openNote !== t.id) {
        const nt = document.createElement("div");
        nt.className = "notes-text"; nt.textContent = t.notes;
        main.append(nt);
      }

      const addBtn = actionButton(ICONS.plus, "Subtask", "Add a subtask to \u201c" + t.text + "\u201d", openSub === t.id, "", () => {
        openSub = openSub === t.id ? null : t.id; subDraft = ""; focusSub = openSub !== null; render();
      });
      const prioBtn = actionButton(ICONS.flag, "Priority", "Set priority for \u201c" + t.text + "\u201d", openPrio === t.id,
        "prio-btn" + (PRIOS[t.priority] ? " " + t.priority : ""), () => { openPrio = openPrio === t.id ? null : t.id; render(); });
      const dateBtn = actionButton(ICONS.cal, "Date", (t.due ? "Change due date for \u201c" : "Set a due date for \u201c") + t.text + "\u201d",
        openDate === t.id, t.due ? "has" : "", () => { openDate = openDate === t.id ? null : t.id; render(); });
      const noteBtn = actionButton(ICONS.note, "Notes", (t.notes ? "Edit notes for \u201c" : "Add notes to \u201c") + t.text + "\u201d",
        openNote === t.id, t.notes ? "has" : "", () => {
          if (openNote === t.id) openNote = null;
          else { openNote = t.id; noteDraft = t.notes || ""; focusNote = true; }
          render();
        });
      const del = delButton("Delete \u201c" + t.text + "\u201d", () => remove(t));
      row.append(label, main, addBtn, prioBtn, dateBtn, noteBtn, del);
      li.append(row);

      if (openPrio === t.id) {
        li.append(prioPicker("panel-row", t.priority, "Priority for \u201c" + t.text + "\u201d", (p) => savePrio(t, p)));
      }

      if (openDate === t.id) {
        const de = document.createElement("div");
        de.className = "panel-row";
        const di = document.createElement("input");
        di.type = "date"; di.id = "date-input"; di.value = t.due || "";
        di.setAttribute("aria-label", "Due date for \u201c" + t.text + "\u201d");
        di.addEventListener("change", () => { if (di.value) saveDue(t, di.value); });
        de.append(di);
        if (t.due) de.append(miniButton("Remove date", true, () => saveDue(t, "")));
        de.append(miniButton("Done", false, () => { openDate = null; render(); }));
        li.append(de);
      }

      if (openNote === t.id) {
        const box = document.createElement("div");
        box.className = "noteedit";
        const ta = document.createElement("textarea");
        ta.id = "note-input"; ta.maxLength = 5000; ta.value = noteDraft;
        ta.placeholder = "Add details, links, phone numbers\u2026";
        ta.setAttribute("aria-label", "Notes for \u201c" + t.text + "\u201d");
        ta.addEventListener("input", () => { noteDraft = ta.value; });
        ta.addEventListener("keydown", (e) => { if (e.key === "Escape") { openNote = null; render(); } });
        const btns = document.createElement("div");
        btns.className = "btns";
        btns.append(
          miniButton("Save notes", false, () => saveNote(t, noteDraft.trim())),
          miniButton("Cancel", true, () => { openNote = null; render(); }),
        );
        box.append(ta, btns);
        li.append(box);
      }

      if (subs.length) {
        const ul = document.createElement("ul");
        ul.className = "subs";
        // Highest priority first; same priority keeps the order they were added
        const ordered = subs.map((s, i) => [s, i]).sort((a, b) => (prioRank(a[0]) - prioRank(b[0])) || (a[1] - b[1])).map((x) => x[0]);
        for (const s of ordered) {
          const sli = document.createElement("li");
          sli.className = "sub" + (s.done ? " done" : "") + (PRIOS[s.priority] ? " p-" + s.priority : "");
          const [sl] = checkbox("s-" + t.id + "-" + s.id, s.done, "Mark \u201c" + s.text + "\u201d as done",
            (v) => saveSubs(t, subs.map((x) => (x.id === s.id ? { ...x, done: v } : x))));
          const st = textEl(t, s, s.text);
          const skey = t.id + "/" + s.id;
          const sp = document.createElement("button");
          sp.type = "button"; sp.className = "addsub prio-btn sub-prio" + (PRIOS[s.priority] ? " " + s.priority : "");
          sp.innerHTML = ICONS.flag;
          sp.setAttribute("aria-expanded", String(openSubPrio === skey));
          sp.setAttribute("aria-label", "Set priority for \u201c" + s.text + "\u201d" + (PRIOS[s.priority] ? " (currently " + PRIOS[s.priority] + ")" : ""));
          sp.addEventListener("click", () => { openSubPrio = openSubPrio === skey ? null : skey; render(); });
          const sd = delButton("Delete \u201c" + s.text + "\u201d", () => saveSubs(t, subs.filter((x) => x.id !== s.id)));
          sli.append(sl, st, sp, sd);
          ul.append(sli);
          if (openSubPrio === skey) {
            const pli = prioPicker("subprio", s.priority, "Priority for \u201c" + s.text + "\u201d", (p) => {
              openSubPrio = null;
              saveSubs(t, subs.map((x) => (x.id === s.id ? { ...x, priority: p } : x)));
            }, "li");
            ul.append(pli);
          }
        }
        li.append(ul);
      }

      if (openSub === t.id) {
        const f = document.createElement("form");
        f.className = "subadd";
        const inp = document.createElement("input");
        inp.type = "text"; inp.id = "sub-input"; inp.maxLength = 200; inp.autocomplete = "off";
        inp.placeholder = "Add a step"; inp.setAttribute("aria-label", "New subtask for \u201c" + t.text + "\u201d");
        inp.value = subDraft;
        inp.addEventListener("input", () => { subDraft = inp.value; });
        inp.addEventListener("keydown", (e) => { if (e.key === "Escape") { openSub = null; subDraft = ""; render(); } });
        const b = document.createElement("button");
        b.type = "submit"; b.textContent = "Add";
        f.append(inp, b);
        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const text = inp.value.trim();
          if (!text) { inp.focus(); return; }
          subDraft = ""; focusSub = true;
          saveSubs(t, subs.concat([{ id: newId(), text, done: false, priority: "" }]));
        });
        li.append(f);
      }
      listEl.append(li);
    }

    const ei = $("edit-input"), si = $("sub-input"), ni = $("note-input");
    if (focusEdit && ei) { ei.focus(); ei.setSelectionRange(ei.value.length, ei.value.length); }
    else if (focusSub && si) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
    else if (focusNote && ni) { ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); }
    focusSub = focusNote = focusEdit = false;
  }

  /* ---- small builders ---- */
  function checkbox(id, checked, aria, onChange) {
    const label = document.createElement("label");
    label.className = "check";
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = !!checked; cb.id = id;
    cb.setAttribute("aria-label", aria);
    cb.addEventListener("change", () => onChange(cb.checked));
    const box = document.createElement("span");
    box.className = "box"; box.innerHTML = ICONS.tick;
    label.append(cb, box);
    return [label, cb];
  }
  function delButton(aria, onClick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "del"; b.innerHTML = ICONS.cross;
    b.setAttribute("aria-label", aria);
    b.addEventListener("click", onClick);
    return b;
  }
  function actionButton(icon, label, aria, expanded, extra, onClick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "addsub" + (extra ? " " + extra : "");
    b.innerHTML = icon + '<span class="lbl">' + label + "</span>";
    b.setAttribute("aria-expanded", String(expanded));
    b.setAttribute("aria-label", aria);
    b.addEventListener("click", onClick);
    return b;
  }
  function miniButton(text, plain, onClick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "mini" + (plain ? " plain" : ""); b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }
  function prioPicker(cls, current, aria, onPick, tag = "div") {
    const box = document.createElement(tag);
    box.className = cls; box.setAttribute("role", "group"); box.setAttribute("aria-label", aria);
    for (const p of ["high", "medium", "low", ""]) {
      const c = document.createElement("button");
      c.type = "button"; c.className = "chip " + (p || "none");
      c.setAttribute("aria-pressed", String((current || "") === p));
      c.append(document.createElement("i"), document.createTextNode(p ? PRIOS[p] : "None"));
      c.addEventListener("click", () => onPick(p));
      box.append(c);
    }
    return box;
  }

  // Tap a task or subtask name to edit it in place
  function textEl(t, s, text) {
    const key = t.id + "/" + (s ? s.id : "");
    if (editKey === key) {
      const inp = document.createElement("input");
      inp.type = "text"; inp.id = "edit-input"; inp.className = "edit"; inp.maxLength = 200; inp.value = editDraft;
      inp.setAttribute("aria-label", "Edit \u201c" + text + "\u201d");
      inp.addEventListener("input", () => { editDraft = inp.value; });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
        else if (e.key === "Escape") { editKey = null; render(); }
      });
      inp.addEventListener("blur", () => { if (!rendering && editKey === key) commitEdit(); });
      return inp;
    }
    const b = document.createElement("button");
    b.type = "button"; b.className = "text editable"; b.textContent = text; b.title = "Tap to edit";
    b.setAttribute("aria-label", "Edit \u201c" + text + "\u201d");
    b.addEventListener("click", () => { editKey = key; editDraft = text; focusEdit = true; render(); });
    return b;
  }
  function commitEdit() {
    const [tid, sid] = editKey.split("/");
    const text = editDraft.trim();
    editKey = null;
    const t = tasks.find((x) => x.id === tid);
    if (!t || !text) { render(); return; } // an empty name keeps the old one
    if (!sid) {
      if (text === t.text) { render(); return; }
      t.text = text; render();
      enqueue(t.id, () => api.update(t.id, { text }), "Couldn't save that change.");
    } else {
      const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
      const cur = subs.find((x) => x.id === sid);
      if (!cur || cur.text === text) { render(); return; }
      saveSubs(t, subs.map((x) => (x.id === sid ? { ...x, text } : x)));
    }
  }

  /* ---- changes: update the screen at once, then save to Home Assistant ---- */
  function toggle(t, done) {
    const change = { done };
    if (done && Array.isArray(t.subtasks) && t.subtasks.some((s) => !s.done)) {
      t.subtasks = t.subtasks.map((s) => ({ ...s, done: true })); // completing a task ticks its subtasks
    }
    t.done = done; render();
    enqueue(t.id, () => api.update(t.id, change), "Couldn't save that change.");
  }
  function savePrio(t, priority) {
    openPrio = null; t.priority = priority; render();
    enqueue(t.id, () => api.update(t.id, { priority }), "Couldn't save that priority.");
  }
  function saveDue(t, due) {
    openDate = null; t.due = due; render();
    enqueue(t.id, () => api.update(t.id, { due }), "Couldn't save that date.");
  }
  function saveNote(t, notes) {
    openNote = null; noteDraft = ""; t.notes = notes; render();
    enqueue(t.id, () => api.update(t.id, { notes }), "Couldn't save those notes.");
  }
  function saveSubs(t, subs) {
    t.subtasks = subs; render();
    enqueue(t.id, () => api.update(t.id, { subtasks: subs }), "Couldn't save that subtask.");
  }
  function remove(t) {
    tasks = tasks.filter((x) => x !== t); render();
    enqueue(t.id, () => api.remove([t.id]), "Couldn't delete that task.");
  }

  $("addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("newTask");
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    const dueEl = $("newDue");
    const data = { text };
    if (dueEl.value) data.due = dueEl.value;
    if (newPrio) data.priority = newPrio;
    input.value = ""; dueEl.value = ""; setNewPrio("");
    if (filter === "done") setFilter("todo");
    api.add(data).catch((err) => { showError("Couldn't add that task (" + errText(err) + ")."); input.value = input.value || text; });
  });

  function setNewPrio(p) {
    newPrio = p;
    root.querySelectorAll("#newPrio .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.p === p)));
  }
  root.querySelectorAll("#newPrio .chip").forEach((c) => c.addEventListener("click", () => setNewPrio(newPrio === c.dataset.p ? "" : c.dataset.p)));

  clearBtn.addEventListener("click", () => {
    const ids = tasks.filter((t) => t.done).map((t) => t.id);
    if (!ids.length) return;
    tasks = tasks.filter((t) => !t.done); render();
    api.remove(ids).catch((err) => showError("Couldn't clear completed tasks (" + errText(err) + ")."));
  });

  function setFilter(f) {
    filter = f;
    root.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === f)));
    render();
  }
  root.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.f)));

  /* ---- import from the old list ---- */
  const importBox = $("importBox"), importToggle = $("importToggle"), importText = $("importText");
  function showImport(open) {
    importBox.hidden = !open; importToggle.setAttribute("aria-expanded", String(open));
    if (open) importText.focus(); else importText.value = "";
  }
  importToggle.addEventListener("click", () => showImport(importBox.hidden));
  $("importCancel").addEventListener("click", () => showImport(false));
  $("importGo").addEventListener("click", async () => {
    let rows;
    try { rows = parseImport(importText.value); }
    catch (e) { showError("That doesn't look like a task list: " + errText(e)); return; }
    if (!rows.length) { showError("No tasks found to import."); return; }
    try {
      const res = await api.importTasks(rows);
      showImport(false);
      showNote("Imported " + res.imported + (res.imported === 1 ? " task." : " tasks."));
    } catch (e) { showError("Import failed (" + errText(e) + ")."); }
  });

  render();
  return {
    setTasks(list) { tasks = Array.isArray(list) ? list.map((t) => ({ ...t })) : []; loaded = true; render(); },
    setLoaded() { loaded = true; render(); },
    showError,
    refreshDates() { setToday(); render(); },
  };
}

class TasksPlusPanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (this._menu) this._menu.hass = hass;
    this._maybeSubscribe();
  }
  get hass() { return this._hass; }

  set narrow(narrow) {
    this._narrow = narrow;
    if (this._menu) this._menu.narrow = narrow;
  }
  get narrow() { return this._narrow; }

  set panel(panel) {
    this._panel = panel;
    if (this._titleEl) this._titleEl.textContent = (panel && panel.config && panel.config.title) || "Tasks";
  }
  get panel() { return this._panel; }

  connectedCallback() {
    if (!this._app) this._init();
    this._maybeSubscribe();
    // Keep "Due today"/"Overdue" right if the panel stays open past midnight
    this._timer = setInterval(() => this._app && this._app.refreshDates(), 15 * 60 * 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    this._unsubscribe();
  }

  _init() {
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = STYLE + TEMPLATE;
    this._menu = root.querySelector("ha-menu-button");
    this._titleEl = root.getElementById("title");
    if (this._hass) this._menu.hass = this._hass;
    this._menu.narrow = this._narrow;
    this.panel = this._panel;
    const call = (msg) => this._hass.callWS(msg);
    this._app = createApp(root, {
      lang: () => (this._hass && this._hass.locale && this._hass.locale.language) || undefined,
      add: (data) => call({ type: "tasks_plus/add", ...data }),
      update: (taskId, changes) => call({ type: "tasks_plus/update", task_id: taskId, changes }),
      remove: (ids) => call({ type: "tasks_plus/delete", task_ids: ids }),
      importTasks: (rows) => call({ type: "tasks_plus/import", tasks: rows }),
    });
  }

  async _maybeSubscribe() {
    if (!this.isConnected || !this._hass || !this._app || this._unsub || this._subscribing) return;
    this._subscribing = true;
    try {
      const unsub = await this._hass.connection.subscribeMessage(
        (msg) => this._app.setTasks(msg.tasks),
        { type: "tasks_plus/subscribe" },
      );
      if (this.isConnected) this._unsub = unsub;
      else unsub();
    } catch (err) {
      this._app.showError("Couldn't load your tasks: " + ((err && (err.message || err.code)) || "unknown error"));
      this._app.setLoaded();
    } finally {
      this._subscribing = false;
    }
  }

  _unsubscribe() {
    const unsub = this._unsub;
    this._unsub = null;
    if (unsub) Promise.resolve().then(unsub).catch(() => {});
  }
}

if (!customElements.get("tasks-plus-panel")) {
  customElements.define("tasks-plus-panel", TasksPlusPanel);
}
