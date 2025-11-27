"use client";
import { useAuth } from "../hooks/useAuth";

export default function Header() {
  const { logout } = useAuth();
  return (
    <header className="mb-8">
      <div className="neo-card p-4 flex flex-col md:flex-row justify-between items-center gap-4 rounded-none md:rounded-lg border-x-0 md:border-x-2 border-t-0 md:border-t-2">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-black uppercase tracking-tight">HR Attendance Portal</h1>
            <p className="text-sm text-gray-600 font-mono">Dashboard & Reporting</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="neo-btn neo-btn-danger"
        >
          Logout
        </button>
      </div>
    </header>
  );
}