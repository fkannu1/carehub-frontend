// src/api/appointments.ts
import { api, ensureCsrfCookie } from "./client";

const ENDPOINTS = {
  me: "/auth/me/",
  patientProfiles: "/patient-profiles/",

  physicianSlots: (physicianId: string) => `/physicians/${physicianId}/slots/`,
  physicianSlotEvents: (physicianId: string) => `/physicians/${physicianId}/slots/events/`,

  book: "/clinic/flex-appointments/",

  myAppointmentsPrimary: "/appointments/mine/",
  myAppointmentsAlt1: "/clinic/flex-appointments/mine/",
  myAppointmentsAlt2: "/clinic/flex-appointments/?mine=1",
};

export type Me = {
  id: string;
  username: string;
  role: "PATIENT" | "PHYSICIAN" | string;
};

export async function getMe(): Promise<Me | null> {
  try {
    const r = await api.get(ENDPOINTS.me);
    return r.data?.user ?? null;
  } catch {
    return null;
  }
}

// Always return a PLAIN string id for the physician (never an object)
export async function getDefaultPhysicianIdForPatient(): Promise<string | ""> {
  try {
    const r = await api.get(ENDPOINTS.patientProfiles);
    const list = Array.isArray(r.data?.results) ? r.data.results : r.data;
    const first = list?.[0];

    let raw = first?.physician ?? "";
    if (raw && typeof raw === "object") {
      // normalize typical shapes: { id }, { user }, { public_id }
      raw = raw.user ?? raw.id ?? raw.public_id ?? "";
    }
    return raw ? String(raw) : "";
  } catch {
    return "";
  }
}

export async function listSlots(params: {
  physicianId: string;
  startISO: string;
  endISO: string;
  durationMin?: number;
}): Promise<any[]> {
  const url = new URL(
    ENDPOINTS.physicianSlotEvents(params.physicianId),
    window.location.origin
  );
  url.searchParams.set("start", params.startISO);
  url.searchParams.set("end", params.endISO);
  if (params.durationMin)
    url.searchParams.set("duration", String(params.durationMin));

  const r = await api.get(url.pathname + "?" + url.searchParams.toString());
  if (Array.isArray(r.data)) return r.data;
  if (Array.isArray(r.data?.results)) return r.data.results;
  return r.data ?? [];
}

export async function createAvailabilitySlot(payload: {
  physicianId: string;
  startISO: string;
  endISO: string;
}) {
  await ensureCsrfCookie();
  return api.post(ENDPOINTS.physicianSlots(payload.physicianId), {
    start: payload.startISO,
    end: payload.endISO,
  });
}

export async function bookAppointment(payload: {
  physician: string;
  startISO: string;
  durationMin: number;
  notes?: string;
}) {
  await ensureCsrfCookie();
  return api.post(ENDPOINTS.book, {
    physician: payload.physician,
    start: payload.startISO,
    duration_minutes: payload.durationMin,
    notes: payload.notes ?? "",
  });
}

export async function listMyAppointments(): Promise<any[]> {
  const tryUrls = [
    ENDPOINTS.myAppointmentsPrimary,
    ENDPOINTS.myAppointmentsAlt1,
    ENDPOINTS.myAppointmentsAlt2,
  ];
  for (const url of tryUrls) {
    try {
      const r = await api.get(url);
      if (Array.isArray(r.data?.results)) return r.data.results;
      if (Array.isArray(r.data)) return r.data;
    } catch (e: any) {
      if (e?.response?.status === 404 || e?.response?.status === 405) continue;
      throw e;
    }
  }
  return [];
}
