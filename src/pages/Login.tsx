import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, ensureCsrfCookie } from "../api/client";
import { API_BASE, ENDPOINTS } from "../api/endpoints";

type WhoAmI = {
  user: {
    id: string;
    username: string;
    role: string;
  };
};

type Patient = {
  public_id: string;
  full_name: string;
  physician_name?: string | null;
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // NEW: patients preview after login
  const [patients, setPatients] = useState<Patient[]>([]);
  const [me, setMe] = useState<WhoAmI["user"] | null>(null);

  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const next = params.get("next") || "/dashboard";

  useEffect(() => {
    console.log("[Login] API_BASE =", API_BASE);
    ensureCsrfCookie();
  }, []);

  const clear = () => {
    setResult(null);
    setError(null);
  };

  async function fetchMyPatients() {
    // Server-side viewset should already filter by logged-in physician
    const res = await api.get("/patient-profiles/");
    const data = res.data;
    const rows: Patient[] = (data?.results ?? data) as Patient[];
    setPatients(rows);
    // cache for the Dashboard (optional)
    sessionStorage.setItem("carehub.patients", JSON.stringify(rows));
  }

  const handleLogin = async () => {
    clear();
    setBusy(true);
    try {
      await ensureCsrfCookie();
      const res = await api.post(ENDPOINTS.auth.login, { username, password });
      setResult(res.data);

      // persist the user for Dashboard usage
      const loggedUser = res.data?.user as WhoAmI["user"];
      setMe(loggedUser);
      sessionStorage.setItem("carehub.user", JSON.stringify(loggedUser));

      // fetch patients (filtered by backend) and cache them
      await fetchMyPatients();

      // small tick lets the preview render once; then navigate
      navigate(next, { replace: true });
    } catch (e: any) {
      const payload = e?.response?.data ?? e?.message ?? "Login failed";
      setError(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
    } finally {
      setBusy(false);
    }
  };

  const handleMe = async () => {
    clear();
    setBusy(true);
    try {
      const res = await api.get<WhoAmI>(ENDPOINTS.auth.me);
      setResult(res.data);
      setMe(res.data.user);
    } catch (e: any) {
      const payload = e?.response?.data ?? e?.message ?? "Request failed";
      setError(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    clear();
    setBusy(true);
    try {
      await ensureCsrfCookie();
      const res = await api.post(ENDPOINTS.auth.logout);
      setResult(res.data);
      setMe(null);
      setPatients([]);
      sessionStorage.removeItem("carehub.user");
      sessionStorage.removeItem("carehub.patients");
    } catch (e: any) {
      const payload = e?.response?.data ?? e?.message ?? "Logout failed";
      setError(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      <div className="grid gap-3 max-w-md">
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Username</span>
          <input
            className="border rounded px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourusername"
            autoComplete="username"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Password</span>
          <input
            className="border rounded px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleLogin}
            disabled={busy}
            className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
          >
            {busy ? "Working…" : "Login"}
          </button>

          <button
            onClick={handleMe}
            disabled={busy}
            className="rounded bg-neutral-200 px-4 py-2 disabled:opacity-50"
          >
            Who am I?
          </button>

          <button
            onClick={handleLogout}
            disabled={busy}
            className="rounded bg-neutral-200 px-4 py-2 disabled:opacity-50"
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <pre className="bg-rose-50 text-rose-700 border border-rose-200 rounded p-3 text-sm overflow-auto">
          {error}
        </pre>
      )}

      {result && (
        <pre className="bg-slate-50 border rounded p-3 text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      {/* Optional inline preview after login (useful while wiring the Dashboard) */}
      {me && patients && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2">My Patients</h2>
          {patients.length === 0 ? (
            <p className="text-sm text-gray-600">No patients yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[520px] border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left">Name</th>
                    <th className="border p-2 text-left">Physician</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.public_id}>
                      <td className="border p-2">{p.full_name}</td>
                      <td className="border p-2">{p.physician_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
