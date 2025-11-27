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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FDFCEC]">
      <div className="w-full max-w-md neo-card p-8">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-black uppercase tracking-tight">
          HR Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-bold mb-2 text-black uppercase"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="neo-input"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-bold mb-2 text-black uppercase"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neo-input"
              required
            />
          </div>
          <button
            type="submit"
            className="neo-btn w-full bg-black text-white hover:bg-gray-800 py-3"
          >
            Login
          </button>
          {error && (
            <div className="bg-red-100 border-2 border-black p-3 text-center font-bold text-red-600 text-sm">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}