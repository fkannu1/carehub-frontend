import { useEffect, useState } from "react";
import { api } from "../api/client";

type HealthRecord = {
  id: number;
  created_at: string;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  sugar_fasting?: number | null;
  sugar_pp?: number | null;
  notes?: string | null;
  attachment?: string | null;
};

export default function HealthRecordsPage() {
  const [items, setItems] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/health-records/mine/");
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.results ?? [];
        setItems(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load records");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">My Health Records</h1>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="text-gray-600">No records yet.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">BP (Sys/Dia)</th>
                <th className="px-4 py-3 text-left">Sugar (F / PP)</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left">Attachment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    {r.systolic_bp ?? "—"} / {r.diastolic_bp ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {r.sugar_fasting ?? "—"} / {r.sugar_pp ?? "—"}
                  </td>
                  <td className="px-4 py-2">{r.notes ?? "—"}</td>
                  <td className="px-4 py-2">
                    {r.attachment ? (
                      <a className="text-blue-600 underline" href={r.attachment}>
                        Download
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
