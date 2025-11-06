// src/components/PatientSignup.jsx
import { useState } from "react";
export default function PatientSignup() {
  const [form, setForm] = useState({ username: "", password: "", full_name: "", physician_code: "" });
  const [phys, setPhys] = useState(null);

  const checkCode = async () => {
    if (!form.physician_code) return;
    const r = await fetch(`/api/physicians/lookup/?code=${form.physician_code}`);
    setPhys(r.ok ? await r.json() : null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const r = await fetch("/api/auth/register/patient/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    if (r.ok) alert("Patient created!"); else alert(JSON.stringify(data));
  };

  return (
    <div>
      <h4>Create Patient</h4>
      <form onSubmit={submit} className="d-flex flex-column gap-2" style={{maxWidth: 360}}>
        <input placeholder="Username" value={form.username}
               onChange={e=>setForm({...form, username:e.target.value})}/>
        <input placeholder="Password" type="password" value={form.password}
               onChange={e=>setForm({...form, password:e.target.value})}/>
        <input placeholder="Full name" value={form.full_name}
               onChange={e=>setForm({...form, full_name:e.target.value})}/>
        <div className="d-flex gap-2">
          <input placeholder="Physician code (optional)" value={form.physician_code}
                 onChange={e=>setForm({...form, physician_code:e.target.value.toUpperCase()})}/>
          <button type="button" className="btn btn-outline-secondary" onClick={checkCode}>Check</button>
        </div>
        {phys && <small>Linking to: <b>{phys.full_name}</b> ({phys.code})</small>}
        <button className="btn btn-primary mt-2">Create</button>
      </form>
    </div>
  );
}
