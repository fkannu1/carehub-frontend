// src/api/whoIsMyPhysician.ts
import { api } from "./client";

// Returns the physician *user* UUID for the current user.
// - If I'm a physician, return my own user.id
// - If I'm a patient, look up my patient profile and return physician.user.id
export async function getPhysicianUserUUID(): Promise<string> {
  const me = await api.get("/auth/me/");
  const user = me.data?.user;
  if (!user) throw new Error("Not authenticated");

  if (user.role === "PHYSICIAN") {
    return String(user.id); // already UUID
  }

  // patient: get my profile; we need physician.user.id (UUID)
  const profs = await api.get("/patient-profiles/");
  const mine = (profs.data || []).find((p: any) => String(p.user) === String(user.id)) || profs.data?.[0];
  if (!mine?.physician || !mine?.physician_user_uuid) {
    // Fallback: your serializer may not expose physician_user_uuid; if not, fetch physician profile
    // assuming mine.physician is the PhysicianProfile public_id or pk; if you already have the UUID on API, prefer that.
    // Minimal fallback to /physician-profiles/<id>/:
    const pid = mine?.physician;
    const p = await api.get(`/physician-profiles/${pid}/`);
    return String(p.data.user); // expects serializer to expose the user's UUID
  }
  return String(mine.physician_user_uuid);
}
