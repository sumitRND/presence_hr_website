"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../utils/api";
import Header from "../../../components/Header";
import Link from "next/link";

interface AttendanceRecord {
  date: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  attendanceType: string | null;
}

interface DiscrepancyEmployee {
  employeeName: string;
  employeeId: string;
  piFullName: string;
  piUsername: string;
  workingDays: number;
  holidays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  fullDayLeaves: number;
  halfDayLeaves: number;
  clFullDay?: number;
  clHalfDay?: number;
  elDays?: number;
  addedDays: number;
  removedDays: number;
  totalSalaryDays: number;
  attendances: AttendanceRecord[];
}

interface DiscrepancyData {
  month: number;
  year: number;
  totalWorkingDays: number;
  holidays: number;
  employees: DiscrepancyEmployee[];
}

interface Holiday {
  date: string;
  description: string;
}

interface CalendarDay {
  date: string;
  isHoliday: boolean;
  isWeekend: boolean;
  description?: string;
  status: "present" | "absent" | "non-working" | null;
}

export default function SalaryDiscrepancyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DiscrepancyData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailModal, setDetailModal] = useState<DiscrepancyEmployee | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    searchParams.get("month") ? parseInt(searchParams.get("month")!) : new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(
    searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear()
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user && isMounted) {
      router.push("/");
    }
  }, [user, authLoading, router, isMounted]);

  useEffect(() => {
    if (!user || !isMounted) return;
    fetchDiscrepancies();
  }, [user, isMounted, selectedMonth, selectedYear]);

  const fetchDiscrepancies = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<DiscrepancyData>(
        `/hr/salary-discrepancies?month=${selectedMonth}&year=${selectedYear}`
      );
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || "Failed to load data");
      }
    } catch (err) {
      console.error("Error fetching salary discrepancies:", err);
      setError("Failed to load salary discrepancy data");
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarForUser = useCallback(
    async (emp: DiscrepancyEmployee) => {
      if (!data) return;
      try {
        setLoadingCalendar(true);
        const holidaysRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/calendar/holidays?year=${data.year}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("hr_token")}` },
          }
        );
        const holidaysData = await holidaysRes.json();
        const currentYearHolidays: Holiday[] = holidaysData.success ? holidaysData.holidays : [];
        const daysInMonth = new Date(data.year, data.month, 0).getDate();
        const calendarDays: CalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(Date.UTC(data.year, data.month - 1, day));
          const dateStr = date.toISOString().split("T")[0];
          const holidayInfo = currentYearHolidays.find((h: Holiday) => {
            const holidayDate = new Date(h.date);
            return holidayDate.toISOString().split("T")[0] === dateStr;
          });
          const isHoliday = !!holidayInfo;
          const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
          const attendance = emp.attendances.find((att: AttendanceRecord) => {
            const attDate = new Date(att.date);
            return attDate.toISOString().split("T")[0] === dateStr;
          });

          let status: CalendarDay["status"] = null;
          if (attendance) status = "present";
          else if (!isHoliday && !isWeekend && date <= today) status = "absent";
          else if (isHoliday || isWeekend) status = "non-working";

          calendarDays.push({
            date: dateStr,
            isHoliday,
            isWeekend,
            description: holidayInfo?.description,
            status,
          });
        }
        setCalendarData(calendarDays);
      } catch (error) {
        console.error("Error loading calendar data:", error);
      } finally {
        setLoadingCalendar(false);
      }
    },
    [data]
  );

  useEffect(() => {
    if (detailModal) {
      loadCalendarForUser(detailModal);
    }
  }, [detailModal, loadCalendarForUser]);

  const handleExport = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE}/hr/salary-discrepancies/download?month=${selectedMonth}&year=${selectedYear}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("hr_token")}` },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Salary_Discrepancy_Report_${selectedMonth}_${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export report.");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "N/A";
    const time = new Date(timeStr);
    return time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getDayClass = (day: CalendarDay) => {
    let classes = "h-20 border-r-2 border-b-2 border-black p-2 flex flex-col justify-between transition-colors";
    if (day.status === "present") classes += " bg-green-200";
    else if (day.status === "absent") classes += " bg-red-200";
    else if (day.isHoliday) classes += " bg-red-50";
    else if (day.isWeekend) classes += " bg-gray-100";
    else classes += " bg-white";
    return classes;
  };

  if (!isMounted || authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neo-card p-8 font-bold uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  const filteredEmployees =
    data?.employees.filter((emp) => {
      const query = searchQuery.toLowerCase();
      if (!query) return true;
      return (
        emp.employeeName.toLowerCase().includes(query) ||
        emp.employeeId.toLowerCase().includes(query) ||
        emp.piFullName.toLowerCase().includes(query) ||
        emp.piUsername.toLowerCase().includes(query)
      );
    }) || [];

  const firstDayOfMonth = data ? new Date(data.year, data.month - 1, 1).getDay() : 0;

  return (
    <div className="w-full px-4 md:px-8 py-4 md:py-8">
      <Header />

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="neo-btn text-sm">&larr; Dashboard</Link>
          <button
            onClick={handleExport}
            className="neo-btn neo-btn-primary"
            disabled={!data || (data.employees.length === 0)}
          >
            Export to Excel (CSV)
          </button>
        </div>
        <h1 className="text-3xl font-extrabold uppercase text-black">Salary Discrepancy Report</h1>
        <p className="text-sm text-gray-600 font-mono">
          Employees whose Total Salary Days are less than Working Days
        </p>
      </div>

      {/* Period Selector */}
      <div className="neo-card p-4 mb-8 bg-white">
        <span className="text-xs font-bold uppercase block mb-2">Select Period:</span>
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(+e.target.value)}
              className="neo-input"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("en-US", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(+e.target.value)}
              className="neo-input"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <div className="flex-grow">
            <label className="block text-xs font-bold uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Name, ID, or PI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input md:w-64"
            />
          </div>
        </div>
      </div>

      {loading && <div className="text-center p-8 font-bold">Loading data...</div>}
      {error && <div className="neo-card bg-red-100 border-red-500 p-4 mb-4 text-red-700 font-bold">{error}</div>}

      {data && !loading && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="neo-card p-6 bg-blue-50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
              <h2 className="text-xl font-bold uppercase">
                {new Date(0, data.month - 1).toLocaleString("en-US", { month: "long" })} {data.year}
              </h2>
              <div className="flex gap-3 flex-wrap">
                <div className="badge bg-white border-2 border-black text-lg p-2">
                  Working Days: {data.totalWorkingDays}
                </div>
                <div className="badge bg-gray-100 border-2 border-black text-lg p-2">
                  Holidays: {data.holidays}
                </div>
                <div className="badge bg-red-200 border-2 border-black text-lg p-2">
                  Discrepancies: {filteredEmployees.length}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="neo-card">
            <div className="p-4 border-b-2 border-black bg-white">
              <h2 className="text-xl font-bold uppercase">Employees with Salary Shortfall</h2>
            </div>
            <div className="neo-table-container border-0 rounded-none overflow-x-auto">
              <table className="neo-table text-sm w-full whitespace-nowrap">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Employee ID</th>
                    <th>PI</th>
                    <th className="text-center">Working Days</th>
                    <th className="text-center">Holidays</th>
                    <th className="text-center">Present</th>
                    <th className="text-center">Absent</th>
                    <th className="text-center whitespace-nowrap">CL Full Day</th>
                    <th className="text-center whitespace-nowrap">CL Half Day</th>
                    <th className="text-center whitespace-nowrap">EL</th>
                    <th className="text-center whitespace-nowrap">PI Adj. Added</th>
                    <th className="text-center whitespace-nowrap">PI Adj. Sub</th>
                    <th className="text-center whitespace-nowrap">Total Salary Days</th>
                    <th className="text-center">Shortfall</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp, idx) => {
                      const shortfall = emp.workingDays - emp.totalSalaryDays;
                      return (
                        <tr key={emp.employeeId}>
                          <td>{idx + 1}</td>
                          <td className="font-bold">{emp.employeeName}</td>
                          <td>{emp.employeeId}</td>
                          <td>
                            <span className="text-xs">{emp.piFullName}</span>
                            <br />
                            <span className="text-xs text-gray-500 font-mono">{emp.piUsername}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black">{emp.workingDays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-gray-100 border border-black">{emp.holidays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black">{emp.presentDays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black">{emp.absentDays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black">{emp.clFullDay ?? emp.fullDayLeaves}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black">{emp.clHalfDay ?? emp.halfDayLeaves}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black">{emp.elDays ?? 0}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black">{emp.addedDays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black">{emp.removedDays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border-2 border-black font-bold">{emp.totalSalaryDays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black font-bold">{shortfall}</span>
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => setDetailModal(emp)}
                              className="neo-btn text-xs py-1 px-2"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={15} className="text-center p-8 text-gray-500 italic">
                        {data.employees.length === 0
                          ? "No discrepancies found — all employees have salary days ≥ working days."
                          : "No employees match your search."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal — Calendar + Daily Records (same as PI detail page) */}
      {detailModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="neo-card bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b-2 border-black bg-gray-100 flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="font-bold uppercase text-sm">
                  {detailModal.employeeName} — {detailModal.employeeId}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  PI: {detailModal.piFullName} ({detailModal.piUsername})
                </p>
              </div>
              <button onClick={() => setDetailModal(null)} className="neo-btn text-xs py-1 px-3">
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Summary badges row */}
              <div className="flex gap-3 flex-wrap mb-6">
                <div className="badge bg-white border-2 border-black text-sm p-2">Working Days: {detailModal.workingDays}</div>
                <div className="badge bg-gray-100 border-2 border-black text-sm p-2">Holidays: {detailModal.holidays}</div>
                <div className="badge bg-white border-2 border-black text-sm p-2">Present: {detailModal.presentDays}</div>
                <div className="badge bg-white border-2 border-black text-sm p-2">Absent: {detailModal.absentDays}</div>
                <div className="badge bg-white border-2 border-black text-sm p-2">Leave: {detailModal.leaveDays}</div>
                <div className="badge bg-white border-2 border-black text-sm p-2 font-bold">Total Salary Days: {detailModal.totalSalaryDays}</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Calendar */}
                <div className="neo-card overflow-hidden flex flex-col">
                  <div className="p-4 bg-gray-100 border-b-2 border-black">
                    <h3 className="font-bold uppercase">Calendar</h3>
                  </div>
                  <div className="p-4 flex-grow bg-white">
                    {loadingCalendar ? (
                      <div className="h-full flex items-center justify-center p-8 font-bold">Loading...</div>
                    ) : (
                      <div className="border-2 border-black">
                        <div className="grid grid-cols-7 bg-gray-200 border-b-2 border-black">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                            <div key={d} className="p-2 text-center font-bold uppercase text-xs border-r-2 border-black last:border-r-0">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 bg-black gap-[2px] border-black">
                          {Array.from({ length: firstDayOfMonth }, (_, i) => (
                            <div key={`e-${i}`} className="bg-gray-50 border-r-2 border-b-2 border-black h-20 opacity-50"></div>
                          ))}
                          {calendarData.map(day => (
                            <div key={day.date} className={getDayClass(day)}>
                              <span className="font-bold text-sm">{new Date(day.date).getDate()}</span>
                              {day.description && <span className="text-[10px] text-red-600 font-extrabold uppercase text-right leading-tight">{day.description}</span>}
                              <div className="text-xs font-bold uppercase text-center mt-1">
                                {day.status === "present" && <span className="text-green-900">&#10004;</span>}
                                {day.status === "absent" && <span className="text-red-900">&#10008;</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Legend */}
                    <div className="flex gap-3 mt-3 text-xs font-bold uppercase justify-center flex-wrap">
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-200 border border-black"></div> Present</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-200 border border-black"></div> Absent</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-black"></div> Holiday</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border border-black"></div> Weekend</div>
                    </div>
                  </div>
                </div>

                {/* Daily Records */}
                <div className="neo-card overflow-hidden flex flex-col max-h-[600px]">
                  <div className="p-4 bg-gray-100 border-b-2 border-black">
                    <h3 className="font-bold uppercase">Daily Records</h3>
                  </div>
                  <div className="overflow-y-auto flex-grow neo-table-container border-0 rounded-none">
                    <table className="neo-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>In</th>
                          <th>Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailModal.attendances.length > 0 ? (
                          detailModal.attendances.map(att => (
                            <tr key={att.date}>
                              <td>{formatDate(att.date)}</td>
                              <td className="font-mono text-xs text-green-700">{formatTime(att.checkinTime)}</td>
                              <td className="font-mono text-xs text-red-700">{formatTime(att.checkoutTime)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={3} className="text-center p-8">No records</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
