// src/pages/Appointments.tsx - FIXED VERSION
import { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // ✅ ADDED for React Router links
import { listMyAppointments, getMe, type Me } from "../api/appointments";

// ✅ Helper to extract peer ID from Django chat URL
function extractPeerIdFromChatUrl(url: string): string {
  // URL format: /chat/<peer_id>/ or /chat/<peer_id>
  const match = url.match(/\/chat\/([0-9a-f-]+)\/?/i);
  return match ? match[1] : "";
}

export default function AppointmentsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      setMe(await getMe());
      try {
        const data = await listMyAppointments();
        setItems(data);
      } catch (e: any) {
        setError(e?.response?.data ? JSON.stringify(e.response.data) : e?.message ?? String(e));
      }
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Appointments</h1>
      <p className="text-gray-600 mb-4">
        These are appointments booked with you (as physician) or with your physician (as patient).
      </p>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {!error && items.length === 0 && (
        <div className="text-gray-500 text-sm">No upcoming appointments.</div>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-md">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 border-b">Date</th>
                <th className="text-left px-4 py-2 border-b">Time</th>
                <th className="text-left px-4 py-2 border-b">Peer</th>
                <th className="text-left px-4 py-2 border-b">Status</th>
                <th className="text-left px-4 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => {
                // ✅ Extract peer ID from Django chat URL
                const peerId = extractPeerIdFromChatUrl(row.chat_url);
                
                return (
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    <td className="px-4 py-2 border-b">{row.date_str}</td>
                    <td className="px-4 py-2 border-b">{row.time_str}</td>
                    <td className="px-4 py-2 border-b">{row.peer_name}</td>
                    <td className="px-4 py-2 border-b">
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 border-b">
                      {/* ✅ FIXED: Use React Router Link instead of <a> */}
                      {peerId ? (
                        <Link
                          to={`/messages?peer=${peerId}`}
                          className="text-indigo-600 hover:underline"
                        >
                          Open Chat
                        </Link>
                      ) : (
                        <span className="text-gray-400">No chat available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}