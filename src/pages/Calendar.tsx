// src/pages/Calendar.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { api, ensureCsrfCookie } from "../api/client";

type Me = { id: string; username: string; role: "PATIENT" | "PHYSICIAN" | string };

type CalEvent = {
  id?: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  display?: "auto" | "background" | "inverse-background" | "none";
  extendedProps?: Record<string, any>;
};

type PhysicianOption = { id: string; name: string };

// --- helpers -------------------------------------------------------------

function stringOrEmpty(x: any): string {
  return typeof x === "string" ? x : "";
}

function buildPhysicianName(x: any): string {
  // Try several common fields and make sure it’s really a string
  const full =
    stringOrEmpty(x?.full_name) ||
    stringOrEmpty(x?.name) ||
    [stringOrEmpty(x?.first_name), stringOrEmpty(x?.last_name)].filter(Boolean).join(" ") ||
    stringOrEmpty(x?.user?.username) ||
    stringOrEmpty(x?.username);

  // Always fall back to a stable string
  return (full && full.trim()) || String(x?.user?.id ?? x?.public_id ?? "Unknown");
}

function pickPhysicianIdFromProfile(x: any): string {
  // your /api/physician-profiles/ returns { user: { id, ... }, public_id, ... }
  const uid =
    x?.user?.id ??
    x?.user ??          // if serializer changed to raw id
    x?.public_id ??     // last resort (but your slots endpoints expect user id)
    x?.id;
  return uid ? String(uid) : "";
}

function inferPhysicianIdFromPatientProfile(profile: any): string {
  // Accept several common shapes
  const candidates = [
    profile?.physician,               // "uuid" | { id } | { user } | { uuid }
    profile?.physician_id,
    profile?.physician_uuid,
    profile?.preferred_physician,
    profile?.primary_physician,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    if (typeof raw === "string") return raw;
    if (typeof raw === "object") {
      if (raw.id) return String(raw.id);
      if (raw.user) return String(raw.user);
      if (raw.uuid) return String(raw.uuid);
    }
  }

  if (profile?.physician?.user) return String(profile.physician.user);
  if (profile?.physician_profile?.id) return String(profile.physician_profile.id);
  return "";
}

// ------------------------------------------------------------------------

export default function CalendarPage() {
  const calRef = useRef<FullCalendar | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [physicianId, setPhysicianId] = useState<string>("");
  const [physicians, setPhysicians] = useState<PhysicianOption[]>([]);
  const [duration, setDuration] = useState<number>(30);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string>("");

  // who am I + try to infer physician for patients
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/auth/me/");
        const user: Me = r.data?.user ?? null;
        setMe(user);

        if (user?.role === "PHYSICIAN") {
          setPhysicianId(String(user.id));
          setNotice("");
          return;
        }

        if (user?.role === "PATIENT") {
          const p = await api.get("/patient-profiles/");
          const first = (p.data?.results ?? p.data)?.[0];
          const inferred = inferPhysicianIdFromPatientProfile(first);
          if (inferred) {
            setPhysicianId(inferred);
            setNotice("");
          } else {
            setNotice("Could not infer physician id from patient profile.");
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // If we couldn't infer, fetch list so the user can choose
  useEffect(() => {
    (async () => {
      if (me?.role !== "PATIENT") return;
      if (physicianId) return; // already set
      try {
        // 🔁 FIX: fetch from physician profiles
        const r = await api.get("/physician-profiles/");
        const rows = (r.data?.results ?? r.data) || [];
        const opts: PhysicianOption[] = rows
          .map((x: any) => ({
            id: pickPhysicianIdFromProfile(x),   // use user.id for the slots endpoints
            name: buildPhysicianName(x),
          }))
          .filter((o: PhysicianOption) => o.id);

        setPhysicians(opts);

        // If there’s exactly one doctor, pick it automatically.
        if (!physicianId && opts.length === 1) {
          setPhysicianId(opts[0].id);
          setNotice("");
        }
      } catch {
        /* ignore */
      }
    })();
  }, [me, physicianId]);

  const headerToolbar = useMemo(
    () => ({ left: "prev,next today", center: "title", right: "timeGridWeek,timeGridDay,dayGridMonth" }),
    []
  );

  // --- Fetch events for the visible range ---
  const loadRange = async (rangeStart?: string, rangeEnd?: string) => {
    if (!physicianId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (rangeStart) qs.set("start", rangeStart);
      if (rangeEnd) qs.set("end", rangeEnd);
      if (duration) qs.set("duration", String(duration));

      const r = await api.get<CalEvent[]>(
        `/physicians/${physicianId}/slots/events/${qs.toString() ? "?" + qs.toString() : ""}`
      );
      setEvents(Array.isArray(r.data) ? r.data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const reloadVisible = async () => {
    const apiCal = (calRef.current as any)?.getApi?.();
    if (!apiCal || !physicianId) return;
    await loadRange(apiCal.view.currentStart.toISOString(), apiCal.view.currentEnd.toISOString());
  };

  const handleDatesSet = (arg: any) => {
    loadRange(arg.start.toISOString(), arg.end.toISOString());
  };

  // React to physician/duration change
  useEffect(() => {
    if (!physicianId) return;
    reloadVisible();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physicianId, duration]);

  // Physician: drag to create availability
  const handleSelect = async (arg: any) => {
    if (!me || me.role !== "PHYSICIAN") return;
    if (!window.confirm(`Create availability from\n${arg.start.toLocaleString()} to ${arg.end.toLocaleString()}?`))
      return;
    try {
      await ensureCsrfCookie();
      await api.post(`/physicians/${me.id}/slots/`, {
        start: arg.start.toISOString(),
        end: arg.end.toISOString(),
      });
      await reloadVisible();
    } catch (e: any) {
      alert("Failed to create slot:\n" + (e?.response?.data ? JSON.stringify(e.response.data) : e?.message));
    }
  };

  // Patient: click green slot to book
  const handleEventClick = async (click: any) => {
    if (!me || me.role !== "PATIENT") return;
    const kind = click.event.extendedProps?.type;
    if (kind !== "AVAILABLE" && kind !== "AVAILABLE_ROW") return;

    const start = click.event.start!;
    const end = click.event.end!;
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);

    if (!window.confirm(`Book this appointment?\n${start.toLocaleString()} – ${end.toLocaleString()} (${minutes} min)`))
      return;

    try {
      await ensureCsrfCookie();
      await api.post("/clinic/flex-appointments/", {
        physician: physicianId,
        start: start.toISOString(),
        duration_minutes: minutes,
        notes: "",
      });
      await reloadVisible();
    } catch (e: any) {
      alert("Failed to book:\n" + (e?.response?.data ? JSON.stringify(e.response.data) : e?.message));
    }
  };

  return (
    <div className="p-4 space-y-3">
      {notice && (
        <div className="rounded border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
          {notice}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>

        <div className="flex items-center gap-3 text-sm">
          {/* Physician chooser for PATIENT when we couldn't infer automatically */}
          {me?.role === "PATIENT" && (
            <label className="flex items-center gap-2">
              <span>Physician</span>
              <select
                className="border rounded px-2 py-1"
                value={physicianId}
                onChange={(e) => {
                  setPhysicianId(e.target.value);
                  setNotice("");
                }}
              >
                <option value="">Select…</option>
                {physicians.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-2">
            <span>Slot length</span>
            <select
              className="border rounded px-2 py-1"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </label>
        </div>
      </div>

      <div className="text-gray-600">
        {me?.role === "PHYSICIAN"
          ? "Drag on the calendar to create availability (green)."
          : "Click a green slot to book (it turns red with your name)."}
      </div>

      <FullCalendar
        ref={calRef as any}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={headerToolbar}
        weekends
        nowIndicator
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        selectable={me?.role === "PHYSICIAN"}
        selectMirror
        datesSet={handleDatesSet}
        select={handleSelect}
        eventClick={handleEventClick}
        events={events}
        height="auto"
        timeZone="local"
        displayEventEnd
      />

      {loading && <div className="text-sm text-gray-500">Calendar loading…</div>}
    </div>
  );
}
