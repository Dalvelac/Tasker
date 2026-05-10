interface Env {
  DB: D1Database;
}

type TaskInput = {
  title?: string;
  notes?: string;
  priority?: string;
  due_date?: string;
};

export async function onRequestGet(context: { env: Env }) {
  const { results } = await context.env.DB
    .prepare(
      `SELECT id, title, notes, status, priority, due_date, created_at, updated_at
       FROM tasks
       ORDER BY
         CASE status WHEN 'pending' THEN 0 ELSE 1 END,
         due_date IS NULL,
         due_date ASC,
         id DESC`,
    )
    .all();

  return Response.json(results);
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const body = (await context.request.json()) as TaskInput;

  if (!body.title || body.title.trim().length < 1) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const result = await context.env.DB
    .prepare(
      `INSERT INTO tasks (title, notes, priority, due_date)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(
      body.title.trim(),
      body.notes ?? null,
      body.priority ?? "normal",
      body.due_date ?? null,
    )
    .run();

  return Response.json({ ok: true, id: result.meta.last_row_id });
}

export async function onRequestPatch(context: { request: Request; env: Env }) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  await context.env.DB
    .prepare(
      `UPDATE tasks
       SET status = CASE status WHEN 'done' THEN 'pending' ELSE 'done' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(id)
    .run();

  return Response.json({ ok: true });
}

export async function onRequestDelete(context: { request: Request; env: Env }) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  await context.env.DB.prepare(`DELETE FROM tasks WHERE id = ?`).bind(id).run();

  return Response.json({ ok: true });
}
