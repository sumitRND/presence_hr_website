"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../utils/api";
import Header from "../../../components/Header";

interface InactiveStaff {
  staffEmpId: string;
  staffUsername: string | null;
  staffFullName: string | null;
  joiningDate: string | null;
  rawJoiningDate: string | null;
  termCompletionDate: string | null;
  piUsername: string | null;
  piFullName: string | null;
  projectId: string | null;
  deptName: string | null;
  empClass: string | null;
}

function parseStaffDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    return new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
  }
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (yyyymmdd) {
    return new Date(Number(yyyymmdd[1]), Number(yyyymmdd[2]) - 1, Number(yyyymmdd[3]));
  }
  return null;
}

function formatDate(value: string | null | undefined): string {
  const d = parseStaffDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InactiveStaffPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<InactiveStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isLoading && !user && isMounted) {
      router.push("/");
    }
  }, [user, isLoading, router, isMounted]);

  useEffect(() => {
    if (!user || !isMounted) return;
    const fetchInactive = async () => {
      setLoading(true);
      setError("");
      const response = await api.get<InactiveStaff[]>("/hr/inactive-staff");
      if (response.success && response.data) {
        setStaff(response.data);
      } else {
        setError(response.error || "Failed to load inactive staff");
      }
      setLoading(false);
    };
    fetchInactive();
  }, [user, isMounted]);

  const filtered = staff.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.staffUsername ?? "").toLowerCase().includes(q) ||
      (s.staffFullName ?? "").toLowerCase().includes(q) ||
      (s.staffEmpId ?? "").toLowerCase().includes(q) ||
      (s.piUsername ?? "").toLowerCase().includes(q) ||
      (s.projectId ?? "").toLowerCase().includes(q)
    );
  });

  if (!isMounted || isLoading || !user) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="neo-card p-8 font-bold uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 py-4 md:py-8">
      <Header />

      <div className="flex justify-between items-center mb-6">
        <Link href="/dashboard" className="neo-btn text-sm">&larr; Dashboard</Link>
        <h1 className="text-2xl md:text-3xl font-extrabold uppercase">Inactive Staff</h1>
        <div className="w-24" />
      </div>

      <div className="neo-card p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <p className="text-sm text-gray-700">
              Staff whose terms have expired and who are not currently active under any other record.
              Sorted by most recent term-end first.
            </p>
            <p className="text-xs text-gray-500 mt-1 font-mono">{filtered.length} of {staff.length} shown</p>
          </div>
          <div className="w-full md:w-72">
            <label className="block text-xs font-bold uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Name, username, ID, PI, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="neo-card bg-red-100 border-red-500 p-4 mb-4 text-red-700 font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="neo-card p-8 text-center font-bold animate-pulse">Loading staff...</div>
      ) : (
        <div className="neo-card">
          <div className="neo-table-container border-0 rounded-none overflow-x-auto">
            <table className="neo-table text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Employee ID</th>
                  <th>PI</th>
                  <th>Project</th>
                  <th>Joined</th>
                  <th>Term Ended</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-gray-500">
                      {staff.length === 0 ? "No inactive staff found." : "No matches for your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.staffEmpId}>
                      <td className="font-bold">{s.staffFullName || "—"}</td>
                      <td className="font-mono text-xs">{s.staffUsername || "—"}</td>
                      <td className="font-mono text-xs">{s.staffEmpId}</td>
                      <td>{s.piFullName || s.piUsername || "—"}</td>
                      <td className="max-w-[200px]">
                        {s.projectId ? (
                          <span className="text-xs border border-black px-1 bg-gray-50 break-all whitespace-normal inline-block">{s.projectId}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="font-mono text-xs">{formatDate(s.rawJoiningDate || s.joiningDate)}</td>
                      <td className="font-mono text-xs">
                        <span className="badge bg-red-100 border border-red-700 text-red-900">
                          {formatDate(s.termCompletionDate)}
                        </span>
                      </td>
                      <td className="text-center">
                        <Link
                          href={`/dashboard/inactive-staff/${encodeURIComponent(s.staffEmpId)}`}
                          className="neo-btn text-xs py-1 px-2"
                        >
                          View Attendance
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
