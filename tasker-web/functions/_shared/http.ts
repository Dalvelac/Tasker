export function json<T>(data: T, init?: ResponseInit) {
  return Response.json({ data }, init);
}

export function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function getNumericParam(params: Record<string, string> | undefined, name: string) {
  const raw = params?.[name];
  const id = Number(raw);

  return Number.isInteger(id) && id > 0 ? id : null;
}
