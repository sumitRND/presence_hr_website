"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../utils/api";
import Header from "../../components/Header";
import PIList from "../../components/PIList";
import RequestModal from "../../components/RequestModal";

export interface PIData {
  username: string;
  fullName: string;
}

export interface PIStatusData {
  status: "complete" | "pending" | "none" | "requested";
  fullName: string;
  isPartial?: boolean; // New field to indicate partial submission
  submittedCount?: number; // Number of employees submitted
  totalCount?: number; // Total number of employees under this PI
}

export interface PIStatuses {
  [key: string]: PIStatusData;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [pis, setPis] = useState<PIData[]>([]);
  const [selectedPIs, setSelectedPIs] = useState<Set<string>>(new Set());
  const [piStatuses, setPiStatuses] = useState<PIStatuses>({});
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  useEffect(() => {
    if (!user || pis.length === 0 || !isMounted) return;

    const fetchStatuses = async () => {
      try {
        const response = await api.get<PIStatuses>(
          `/hr/submission-status?month=${filters.month}&year=${filters.year}`,
        );
        if (response.success && response.data) {
          setPiStatuses(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch statuses", error);
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000);

    return () => clearInterval(interval);
  }, [user, pis, filters.month, filters.year, isMounted]);

  const handleOpenRequestModal = () => {
    if (selectedPIs.size === 0) {
      setStatusMessage("Please select at least one PI");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }
    setIsModalOpen(true);
  };

  const handleSendRequest = async (message: string) => {
    setIsModalOpen(false);
    setStatusMessage("Sending requests...");
    try {
      const response = await api.post("/hr/request-data", {
        piUsernames: Array.from(selectedPIs),
        month: filters.month,
        year: filters.year,
        message: message,
      });
      if (response.success) {
        setStatusMessage("Requests sent successfully!");
        const newStatuses = { ...piStatuses };
        selectedPIs.forEach((pi) => {
          if (newStatuses[pi]) {
            newStatuses[pi].status = "requested";
          }
        });
        setPiStatuses(newStatuses);
      }
    } catch {
      setStatusMessage("Failed to send requests.");
    } finally {
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

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
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container mx-auto p-6">
          <div className="bg-white border-2 border-slate-700 p-8 shadow-[4px_4px_0px_rgba(51,65,85,0.3)] rounded-lg">
            <p className="text-2xl font-bold text-slate-800">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  const canDownload = Array.from(selectedPIs).every(
    (pi) => piStatuses[pi]?.status === "complete",
  );

  const filteredPIs = pis.filter((pi) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    if (!pi || !pi.username) {
      return false;
    }

    const statusData = piStatuses[pi.username];
    const fullName =
      statusData?.fullName && statusData.fullName !== "N/A"
        ? statusData.fullName
        : pi.fullName && pi.fullName !== "N/A"
          ? pi.fullName
          : "";

    const usernameMatch = (pi.username ?? "").toLowerCase().includes(query);
    const fullNameMatch = (fullName ?? "").toLowerCase().includes(query);

    return usernameMatch || fullNameMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="container mx-auto p-6">
        <div className="bg-white border-2 border-slate-300 shadow-[4px_4px_0px_rgba(51,65,85,0.1)] p-6 mb-6 rounded-lg">
          <div className="flex flex-wrap gap-x-6 gap-y-4 items-end justify-between">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label
                  htmlFor="month-select"
                  className="block text-sm font-bold mb-2 text-slate-700"
                >
                  Month
                </label>
                <select
                  id="month-select"
                  value={filters.month}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, month: +e.target.value }))
                  }
                  className="border-2 border-slate-300 p-2 bg-white rounded hover:border-slate-400 focus:outline-none focus:border-slate-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("en-US", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="year-select"
                  className="block text-sm font-bold mb-2 text-slate-700"
                >
                  Year
                </label>
                <select
                  id="year-select"
                  value={filters.year}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, year: +e.target.value }))
                  }
                  className="border-2 border-slate-300 p-2 bg-white rounded hover:border-slate-400 focus:outline-none focus:border-slate-500"
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleOpenRequestModal}
                  disabled={selectedPIs.size === 0}
                  className="h-12 px-5 border-slate-700 border-2 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 hover:shadow-[2px_2px_0px_rgba(51,65,85,0.2)] disabled:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:hover:shadow-none font-bold text-slate-800 rounded transition-all"
                >
                  Request Data
                </button>
                <button
                  onClick={handleDownloadReport}
                  disabled={!canDownload || selectedPIs.size === 0}
                  className="h-12 px-5 border-slate-700 border-2 bg-green-100 hover:bg-green-200 active:bg-green-300 hover:shadow-[2px_2px_0px_rgba(51,65,85,0.2)] disabled:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:hover:shadow-none font-bold text-slate-800 rounded transition-all"
                >
                  Download Report
                </button>
              </div>
            </div>
            <div className="flex-grow md:flex-grow-0">
              <label
                htmlFor="pi-search"
                className="block text-sm font-bold mb-2 text-slate-700"
              >
                Search PI by Username or Name
              </label>
              <input
                id="pi-search"
                type="text"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 border-2 border-slate-300 p-2 bg-white rounded hover:border-slate-400 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="bg-blue-50 border-2 border-blue-300 p-4 mb-6 shadow-[2px_2px_0px_rgba(51,65,85,0.1)] rounded-lg">
            <p className="font-bold text-center text-blue-800">
              {statusMessage}
            </p>
          </div>
        )}

        <PIList
          pis={filteredPIs}
          selectedPIs={selectedPIs}
          setSelectedPIs={setSelectedPIs}
          piStatuses={piStatuses}
        />

        <RequestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleSendRequest}
          month={filters.month}
          year={filters.year}
          selectedPIs={Array.from(selectedPIs)}
        />
      </main>
    </div>
  );
}
