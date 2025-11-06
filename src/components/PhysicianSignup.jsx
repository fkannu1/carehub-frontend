// src/components/PhysicianSignup.jsx
import { useState } from "react";
export default function PhysicianSignup() {
  const [form, setForm] = useState({ username: "", password: "", full_name: "" });
  const [result, setResult] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    const r = await fetch("/api/auth/register/physician/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    if (r.ok) setResult(data); else alert(JSON.stringify(data));
  };
  return (
    <div>
      <h4>Create Physician</h4>
      <form onSubmit={submit} className="d-flex flex-column gap-2" style={{maxWidth: 360}}>
        <input placeholder="Username" value={form.username}
               onChange={e=>setForm({...form, username:e.target.value})}/>
        <input placeholder="Password" type="password" value={form.password}
               onChange={e=>setForm({...form, password:e.target.value})}/>
        <input placeholder="Full name" value={form.full_name}
               onChange={e=>setForm({...form, full_name:e.target.value})}/>
        <button className="btn btn-primary">Create</button>
      </form>

      {result && (
        <div className="alert alert-success mt-3">
          <div><b>Physician created!</b></div>
          <div>Username: {result.username}</div>
          <div>Share this <b>Physician Code</b> with patients: <code>{result.code}</code></div>
        </div>
      )}
    </div>
  );
}
