"use client";
import { useAuth } from "../hooks/useAuth";

export default function Header() {
  const { logout } = useAuth();
  return (
    <header className="bg-white border-b-2 border-slate-300 p-4 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">
          HR Attendance Portal
        </h1>
        <button
          onClick={logout}
          className="h-10 px-4 border-slate-700 border-2 bg-red-100 hover:bg-red-200 active:bg-red-300 hover:shadow-[2px_2px_0px_rgba(51,65,85,0.2)] font-bold text-slate-800 rounded transition-all"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
