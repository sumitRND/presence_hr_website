"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const [username, setUsername] = useState("HRUser");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = await login(username, password);
    if (success) {
      router.push("/dashboard");
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white border-2 border-slate-700 shadow-[4px_4px_0px_rgba(51,65,85,0.3)] p-8 rounded-lg">
        <h1 className="text-4xl font-bold mb-8 text-center text-slate-800">
          HR Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-lg font-medium mb-2 text-slate-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-slate-300 border-2 p-3 rounded focus:outline-none focus:border-slate-500 focus:shadow-[2px_2px_0px_rgba(51,65,85,0.2)] bg-white"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-lg font-medium mb-2 text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-slate-300 border-2 p-3 rounded focus:outline-none focus:border-slate-500 focus:shadow-[2px_2px_0px_rgba(51,65,85,0.2)] bg-white"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full h-12 border-slate-700 border-2 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 hover:shadow-[2px_2px_0px_rgba(51,65,85,0.3)] font-bold text-lg text-slate-800 rounded transition-all"
          >
            Login
          </button>
          {error && (
            <div className="bg-red-50 border-2 border-red-300 p-3 text-center rounded">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
