// src/components/NavBar.tsx
import { Link, NavLink } from "react-router-dom";

export default function NavBar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? "bg-gray-200" : "hover:bg-gray-100"
    }`;

  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold">CareHub</Link>
        <nav className="flex gap-1">
          <NavLink to="/" className={linkClass} end>Home</NavLink>
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/calendar" className={linkClass}>Calendar</NavLink>
          <NavLink to="/appointments" className={linkClass}>Appointments</NavLink>
          <NavLink to="/messages" className={linkClass}>Messages</NavLink>
          <NavLink to="/login" className={linkClass}>Login</NavLink>
        </nav>
      </div>
    </header>
  );
}