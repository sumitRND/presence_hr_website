"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../utils/api";
import Header from "../../components/Header";
import PIList from "../../components/PIList";

export interface PIData {
  username: string;
  fullName: string;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [pis, setPis] = useState<PIData[]>([]);
  const [selectedPIs, setSelectedPIs] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && !user && isMounted) {
      router.push("/");
    }
  }, [user, isLoading, router, isMounted]);

  useEffect(() => {
    const fetchPIs = async () => {
      try {
        const response = await api.get<PIData[]>("/hr/pis");
        if (response.success && response.data) {
          setPis(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch PIs", error);
      }
    };
    if (user && isMounted) fetchPIs();
  }, [user, isMounted]);

  const handleDownloadReport = async () => {
    if (selectedPIs.size === 0) return;
    setStatusMessage("Preparing download...");
    try {
      const piParams = Array.from(selectedPIs).join(",");
      const url = `${process.env.NEXT_PUBLIC_API_BASE}/hr/download-report?month=${filters.month}&year=${filters.year}&piUsernames=${piParams}`;

      const response = await fetch(url, { headers: api.getHeaders() });

      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      const firstPiName = Array.from(selectedPIs)[0];
      const fileName =
        selectedPIs.size > 1
          ? `Combined_Report_${filters.month}_${filters.year}.csv`
          : `${firstPiName}_Report_${filters.month}_${filters.year}.csv`;

      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setStatusMessage("Download started!");
    } catch (error) {
      console.error("Download error", error);
      setStatusMessage("Failed to download report.");
    } finally {
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  if (!isMounted || isLoading || !user) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="neo-card p-8 font-bold uppercase animate-pulse">Loading Dashboard...</div>
      </div>
    );
  }

  const filteredPIs = pis.filter((pi) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    if (!pi || !pi.username) return false;

    const fullName = pi.fullName && pi.fullName !== "N/A" ? pi.fullName : "";

    const usernameMatch = (pi.username ?? "").toLowerCase().includes(query);
    const fullNameMatch = (fullName ?? "").toLowerCase().includes(query);

    return usernameMatch || fullNameMatch;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <Header />

      {/* Controls Card */}
      <div className="neo-card p-6 mb-8">
        <div className="flex flex-col gap-6">
          {/* Filter Row */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div className="flex gap-4 w-full md:w-auto">
              <div className="w-full md:w-48">
                <label className="block text-xs font-bold uppercase mb-1">Month</label>
                <select
                  value={filters.month}
                  onChange={(e) => setFilters((f) => ({ ...f, month: +e.target.value }))}
                  className="neo-input"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("en-US", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-bold uppercase mb-1">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => setFilters((f) => ({ ...f, year: +e.target.value }))}
                  className="neo-input"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
            </div>

            <div className="w-full md:w-auto flex-grow md:flex-grow-0">
              <label className="block text-xs font-bold uppercase mb-1">Search PIs</label>
              <input
                type="text"
                placeholder="Username or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="neo-input md:w-64"
              />
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex gap-4 border-t-2 border-black pt-4">
            <button
              onClick={handleDownloadReport}
              disabled={selectedPIs.size === 0}
              className="neo-btn neo-btn-primary"
            >
              Download Report
            </button>
            <button
              onClick={() => router.push(`/dashboard/salary-discrepancy?month=${filters.month}&year=${filters.year}`)}
              className="neo-btn neo-btn-info"
            >
              Salary Discrepancy
            </button>
            <button
              onClick={() => router.push("/dashboard/inactive-staff")}
              className="neo-btn neo-btn-warning"
            >
              Inactive Staff
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="neo-card bg-yellow-50 p-4 mb-6 text-center font-bold border-yellow-400">
          {statusMessage}
        </div>
      )}

      <PIList
        pis={filteredPIs}
        selectedPIs={selectedPIs}
        setSelectedPIs={setSelectedPIs}
        month={filters.month}
        year={filters.year}
      />
    </div>
  );
}
