// src/App.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const Calendar = React.lazy(() => import("./pages/Calendar"));
const Appointments = React.lazy(() => import("./pages/Appointments"));
const Messages = React.lazy(() => import("./pages/Messages"));
const HealthRecords = React.lazy(() => import("./pages/HealthRecords")); // ✅ NEW

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route
            path="/calendar"
            element={
              <React.Suspense fallback={<div>Loading calendar…</div>}>
                <Calendar />
              </React.Suspense>
            }
          />

          <Route
            path="/appointments"
            element={
              <React.Suspense fallback={<div>Loading appointments…</div>}>
                <Appointments />
              </React.Suspense>
            }
          />

          <Route
            path="/messages"
            element={
              <React.Suspense fallback={<div>Loading messages…</div>}>
                <Messages />
              </React.Suspense>
            }
          />

          {/* ✅ NEW ROUTE */}
          <Route
            path="/records"
            element={
              <React.Suspense fallback={<div>Loading health records…</div>}>
                <HealthRecords />
              </React.Suspense>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 h-12 flex items-center text-sm text-gray-500">
          © {new Date().getFullYear()} CareHub
        </div>
      </footer>
    </div>
  );
}
