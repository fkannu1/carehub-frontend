// src/api/endpoints.ts

/**
 * We accept either:
 *   VITE_API_BASE_URL=http://127.0.0.1:8000
 * or
 *   VITE_API_BASE_URL=http://127.0.0.1:8000/api
 * and always normalize to ".../api" (no trailing slash).
 */
const RAW = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8000";

let normalized = RAW.replace(/\/+$/, "");     // strip trailing slashes
if (!/\/api$/i.test(normalized)) normalized += "/api"; // ensure it ends with /api

export const API_BASE = normalized; // e.g., "http://127.0.0.1:8000/api"

// Build full URLs if you ever need to (rare when using axios baseURL)
export const url = (path: string) => `${API_BASE}${path.replace(/^\//, "/")}`;

export const ENDPOINTS = {
  // Health/ping
  health: "/health/",

  // Auth
  auth: {
    csrf: "/auth/csrf/",
    login: "/auth/login/",
    logout: "/auth/logout/",
    me: "/auth/me/",
  },

  // You can add more API groups here as you implement them:
  patients: "/patients/",
  physicians: "/physicians/",
  appointments: "/appointments/",
};
