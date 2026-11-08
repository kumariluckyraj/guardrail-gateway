const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Opts = Omit<RequestInit, "body"> & { json?: unknown };

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const { json, headers, ...rest } = opts;
  const res = await fetch(BASE + path, {
    ...rest,
    credentials: "include", // sends the httpOnly login cookie
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (res.status === 204) return undefined as T;

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const d = data?.detail;
    const message =
      typeof d === "string"
        ? d
        : Array.isArray(d)
        ? d.map((x: any) => x.msg).join(", ")
        : "Something went wrong";
    throw new ApiError(res.status, message);
  }
  return data as T;
}