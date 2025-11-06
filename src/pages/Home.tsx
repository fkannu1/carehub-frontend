import { useState } from "react";
import { api } from "../api/client";
import { API_BASE, ENDPOINTS } from "../api/endpoints";

export default function Home() {
  const [out, setOut] = useState<string>("");

  const testApi = async () => {
    setOut("");
    try {
      const res = await api.get(ENDPOINTS.health); // "/health/"
      setOut(JSON.stringify(res.data, null, 2));
    } catch (e: any) {
      const payload = {
        kind: "axios-error",
        status: e?.response?.status ?? null,
        statusText: e?.response?.statusText ?? null,
        url: e?.config?.baseURL
          ? `${e.config.baseURL}${e.config.url || ""}`
          : e?.config?.url,
        data: e?.response?.data ?? null,
        code: e?.code,
        message: e?.message,
      };
      setOut(JSON.stringify(payload, null, 2));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Welcome to CareHub</h1>
      <p className="text-gray-600 mb-4">React + Django starter is ready.</p>

      <button
        onClick={testApi}
        className="rounded bg-blue-600 text-white px-4 py-2"
      >
        Test API Connection
      </button>

      <div className="mt-6">
        <div className="text-sm text-gray-500 mb-2">
          Using API_BASE: <code>{API_BASE}</code>
        </div>
        {out && (
          <pre className="bg-slate-50 border rounded p-3 text-sm overflow-auto">
            {out}
          </pre>
        )}
      </div>
    </div>
  );
}
