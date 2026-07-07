"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neo-input pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black font-bold text-sm uppercase select-none"
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
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