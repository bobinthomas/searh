// Small client-side fetch helpers.
//
// Every API route answers with { error } on failure, so these unwrap that and
// return something call sites can branch on without try/catch noise.

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
}

async function request<T>(
  url: string,
  method: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}) as T & { error?: string });
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "Connection problem. Try again." } as T & { error?: string },
    };
  }
}

export const postJson = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, "POST", body);

export const patchJson = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, "PATCH", body);

export const putJson = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, "PUT", body);

export const deleteJson = <T = unknown>(url: string) =>
  request<T>(url, "DELETE");

export const getJson = <T = unknown>(url: string) => request<T>(url, "GET");
