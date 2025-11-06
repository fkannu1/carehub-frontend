import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  timeout: 30_000,
});

export function extractErrorMessage(err: unknown): string {
  const ax = err as AxiosError;
  if (ax?.response) {
    const { status, statusText, data, headers } = ax.response as any;
    const ct = String(headers?.["content-type"] || headers?.get?.("content-type") || "");
    if (ct.includes("application/json")) {
      if (typeof data === "string") return `${status} ${statusText}: ${data}`;
      if (data?.detail) return `${status} ${statusText}: ${data.detail}`;
      if (typeof data === "object" && data) {
        const parts: string[] = [];
        for (const [k, v] of Object.entries<any>(data)) {
          if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
          else if (typeof v === "string") parts.push(`${k}: ${v}`);
        }
        if (parts.length) return `${status} ${statusText}: ${parts.join(" | ")}`;
      }
      return `${status} ${statusText}`;
    }
    const html = typeof data === "string" ? data : "";
    const snippet = html.replace(/\s+/g, " ").replace(/<[^>]+>/g, " ").trim().slice(0, 300);
    return `${status} ${statusText}${snippet ? `: ${snippet}…` : ""}`;
  }
  if (ax?.message) return ax.message;
  return String(err);
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    (error as any).readableMessage = extractErrorMessage(error);
    return Promise.reject(error);
  }
);

let csrfReady = false;
export async function ensureCsrfCookie(): Promise<void> {
  if (csrfReady) return;
  await api.get("/auth/csrf/");
  csrfReady = true;
}
export function resetCsrfReady() { csrfReady = false; }
