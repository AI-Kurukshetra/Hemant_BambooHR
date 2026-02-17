export function jsonOk<T>(data: T) {
  return Response.json({ ok: true, data });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

