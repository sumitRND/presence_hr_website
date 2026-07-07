"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../hooks/useAuth";
import Header from "../../../../components/Header";
import Link from "next/link";
import { getPITeamLeaves } from "../../../../leave/leaveService";
import type { TeamLeavesMap, LeaveDateEntry } from "../../../../leave/leaveTypes";

/** Filter leave entries to only include dates up to today */
function filterPastLeaves(leaves: LeaveDateEntry[]): LeaveDateEntry[] {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return leaves.filter((l) => l.date <= todayStr);
}

interface AttendanceRecord {
  date: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  attendanceType: string;
  isFullDay: boolean;
  isHalfDay: boolean;
  isCheckedOut: boolean;
}

interface ModifiedAttendanceRecord {
  id: number;
  employeeNumber: string;
  date: string;
  status: "ADDED" | "REMOVED";
  comment: string;
  piEmployeeNumber: string;
  createdAt: string;
}

interface UserAttendance {
  username: string;
  employeeId: string;
  workingDays: number;
  holidays?: number;
  presentDays: number;
  absentDays: number;
  addedDays?: number;
  removedDays?: number;
  total?: number;
  adjustmentDelta?: number;
  adjustmentComment?: string;
  leaveDays?: number;
  fullDayLeaves?: number;
  halfDayLeaves?: number;
  clFullDay?: number;
  clHalfDay?: number;
  elDays?: number;
  odDays?: number;
  projects?: { projectCode: string; department: string }[];
  joiningDate?: string | null;
  termCompletionDate?: string | null;
  attendances: AttendanceRecord[];
  modifiedAttendances?: ModifiedAttendanceRecord[];
}

interface PIDetailData {
  piUsername: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  holidays?: number;
  users: UserAttendance[];
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
  status: "present" | "absent" | "leave" | "non-working" | null;
  leaveReason?: string | null;
  leaveType?: string | null;
  dayType?: string | null;
  isAdded?: boolean;
  addedReason?: string | null;
  isRemoved?: boolean;
  removedReason?: string | null;
  isJoiningDate?: boolean;
  isTermCompletionDate?: boolean;
}

export default function PIDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const piUsername = params.username as string;
  const searchParams = useSearchParams();
  const queryMonth = searchParams.get("month");
  const queryYear = searchParams.get("year");

  const [data, setData] = useState<PIDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserAttendance | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    queryMonth ? parseInt(queryMonth) : new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(
    queryYear ? parseInt(queryYear) : new Date().getFullYear()
  );
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [reasonModal, setReasonModal] = useState<{ user: UserAttendance; type: "ADDED" | "REMOVED" } | null>(null);
  const [teamLeaves, setTeamLeaves] = useState<TeamLeavesMap>({});
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!authLoading && !user && isMounted) {
      router.push("/");
    }
  }, [user, authLoading, router, isMounted]);

  // Fetch data for the selected month
  useEffect(() => {
    if (!user || !piUsername || !isMounted) return;
    fetchDataForMonth(selectedMonth, selectedYear);
    getPITeamLeaves(piUsername, selectedMonth, selectedYear).then(setTeamLeaves);
  }, [user, piUsername, isMounted, selectedMonth, selectedYear]);

  const fetchDataForMonth = useCallback(async (month: number, year: number) => {
    if (!user || !piUsername) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/hr/pi/${piUsername}/attendance?month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("hr_token")}` },
        },
      );
      if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to load data");
      }
    } catch (err) {
      console.error("Error fetching PI data:", err);
      setError("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [user, piUsername]);

  const loadCalendarForUser = useCallback(
    async (userAttendance: UserAttendance) => {
      if (!data) return;
      try {
        setLoadingCalendar(true);
        const holidaysRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/calendar/holidays?year=${data.year}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("hr_token")}` },
          },
        );
        const holidaysData = await holidaysRes.json();
        const currentYearHolidays: Holiday[] = holidaysData.success ? holidaysData.holidays : [];
        const daysInMonth = new Date(data.year, data.month, 0).getDate();
        const calendarDays: CalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Normalize a date-ish value to a YYYY-MM-DD string for comparison
        const toDateStr = (value: string | null | undefined): string | null => {
          if (!value) return null;
          const trimmed = value.trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
          const parsed = new Date(trimmed);
          return isNaN(parsed.getTime())
            ? null
            : parsed.toISOString().split("T")[0];
        };

        const joiningDateStr = toDateStr(userAttendance.joiningDate);
        const termCompletionDateStr = toDateStr(userAttendance.termCompletionDate);

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(Date.UTC(data.year, data.month - 1, day));
          const dateStr = date.toISOString().split("T")[0];
          const holidayInfo = currentYearHolidays.find((h: Holiday) => {
            const holidayDate = new Date(h.date);
            return holidayDate.toISOString().split("T")[0] === dateStr;
          });
          const isHoliday = !!holidayInfo;
          const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
          const attendance = userAttendance.attendances.find(
            (att: AttendanceRecord) => {
              const attDate = new Date(att.date);
              return attDate.toISOString().split("T")[0] === dateStr;
            },
          );
          const leaveEntry = teamLeaves[userAttendance.employeeId]?.find(
            (l) => l.date === dateStr,
          );

          // PI manual adjustments for this date
          const addedEntry = (userAttendance.modifiedAttendances || []).find(
            (m) =>
              m.status === "ADDED" &&
              new Date(m.date).toISOString().split("T")[0] === dateStr,
          );
          const removedEntry = (userAttendance.modifiedAttendances || []).find(
            (m) =>
              m.status === "REMOVED" &&
              new Date(m.date).toISOString().split("T")[0] === dateStr,
          );

          let status: CalendarDay["status"] = null;
          if (leaveEntry) status = "leave";
          else if (attendance || addedEntry) status = "present";
          else if (!isHoliday && !isWeekend && date <= today) status = "absent";
          else if (isHoliday || isWeekend) status = "non-working";

          // A removed day overrides a present-looking day
          if (removedEntry) status = "absent";

          calendarDays.push({
            date: dateStr,
            isHoliday,
            isWeekend,
            description: holidayInfo?.description,
            status,
            leaveReason: leaveEntry?.reason,
            leaveType: leaveEntry?.leaveType,
            dayType: leaveEntry?.dayType,
            isAdded: !!addedEntry,
            addedReason: addedEntry?.comment,
            isRemoved: !!removedEntry,
            removedReason: removedEntry?.comment,
            isJoiningDate: joiningDateStr === dateStr,
            isTermCompletionDate: termCompletionDateStr === dateStr,
          });
        }
        setCalendarData(calendarDays);
      } catch (error) {
        console.error("Error loading calendar data:", error);
      } finally {
        setLoadingCalendar(false);
      }
    },
    [data, teamLeaves],
  );

  useEffect(() => {
    if (selectedUser) {
      loadCalendarForUser(selectedUser);
    }
  }, [selectedUser, loadCalendarForUser]);

  const handleDownload = async () => {
    if (!data) return;
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE}/hr/pi/${piUsername}/download?month=${data.month}&year=${data.year}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("hr_token")}` },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `PI_${piUsername}_Report_${data.month}_${data.year}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download report");
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
    let classes = "h-20 border-r-2 border-b-2 border-black p-2 flex flex-col justify-between transition-colors relative";
    if (day.isAdded) classes += " bg-emerald-300";
    else if (day.isRemoved) classes += " bg-orange-200";
    else if (day.status === "leave") classes += " bg-cyan-200";
    else if (day.status === "present") classes += " bg-green-200";
    else if (day.status === "absent") classes += " bg-red-200";
    else if (day.isHoliday) classes += " bg-red-50";
    else if (day.isWeekend) classes += " bg-gray-100";
    else classes += " bg-white";
    // Ring markers for joining / term completion dates
    if (day.isJoiningDate) classes += " ring-4 ring-inset ring-blue-600";
    else if (day.isTermCompletionDate) classes += " ring-4 ring-inset ring-purple-600";
    return classes;
  };

  // Extract all unique project codes from users
  const projectCodes = data?.users
    ? Array.from(
        new Set(
          data.users.flatMap((u) => (u.projects || []).map((p) => p.projectCode)).filter(Boolean)
        )
      ).sort()
    : [];

  const filteredUsers =
    data?.users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject =
        selectedProject === "all" ||
        (user.projects || []).some((p) => p.projectCode === selectedProject);
      return matchesSearch && matchesProject;
    }) || [];

  if (!isMounted || authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neo-card p-8 font-bold uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  const firstDayOfMonth = data ? new Date(data.year, data.month - 1, 1).getDay() : 0;

  return (
    <div className="w-full px-4 md:px-8 py-4 md:py-8">
      <Header />
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="neo-btn text-sm">&larr; Dashboard</Link>
          <button onClick={handleDownload} className="neo-btn neo-btn-primary" disabled={!data}>Download CSV</button>
        </div>
        <h1 className="text-3xl font-extrabold uppercase text-black">PI: {piUsername}</h1>
      </div>

      {/* Month/Year Selector */}
      <div className="neo-card p-4 mb-8 bg-white">
        <span className="text-xs font-bold uppercase block mb-2">Select Period:</span>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(+e.target.value);
                setSelectedUser(null);
              }}
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
              onChange={(e) => {
                setSelectedYear(+e.target.value);
                setSelectedUser(null);
              }}
              className="neo-input"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="text-center p-8 font-bold">Loading data...</div>}
      {error && <div className="neo-card bg-red-100 border-red-500 p-4 mb-4 text-red-700 font-bold">{error}</div>}

      {data && !loading && (
        <div className="space-y-8">
          {/* Summary Card */}
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
                  Holidays: {data.holidays ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="neo-card">
            <div className="p-4 border-b-2 border-black bg-white flex flex-col md:flex-row justify-between gap-4 items-center">
              <h2 className="text-xl font-bold uppercase">Staff Attendance</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="neo-input md:w-48"
                >
                  <option value="all">All Projects</option>
                  {projectCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search Staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="neo-input md:w-64"
                />
              </div>
            </div>

            <div className="neo-table-container border-0 rounded-none overflow-x-auto">
              <table className="neo-table text-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Project</th>
                    <th className="text-center">WorkingDay</th>
                    <th className="text-center">Holidays</th>
                    <th className="text-center">Present</th>
                    <th className="text-center">Absent</th>
                    <th className="text-center whitespace-nowrap">CL Full Day</th>
                    <th className="text-center whitespace-nowrap">CL Half Day</th>
                    <th className="text-center whitespace-nowrap">EL</th>
                    <th className="text-center whitespace-nowrap">OD</th>
                    <th className="text-center whitespace-nowrap">PI Adj. Added</th>
                    <th className="text-center whitespace-nowrap">PI Adj. Sub</th>
                    <th className="text-center whitespace-nowrap">Total Salary Days</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const userHolidays = user.holidays ?? data.holidays ?? 0;
                      const addedDays = user.addedDays ?? 0;
                      const removedDays = user.removedDays ?? 0;
                      const leaveDays = user.leaveDays ?? filterPastLeaves(teamLeaves[user.employeeId] ?? []).length;
                      const fullDayLeaves = user.fullDayLeaves ?? leaveDays;
                      const halfDayLeaves = user.halfDayLeaves ?? 0;
                      const actualAbsent = user.absentDays;
                      const total = user.total ?? (user.presentDays + userHolidays + leaveDays + addedDays - removedDays);
                      return (
                        <tr key={user.employeeId}>
                          <td className="font-bold">{user.username}</td>
                          <td>{user.employeeId}</td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {(user.projects || []).map((p, pIndex) => (
                                <span
                                  key={`${p.projectCode}-${pIndex}`}
                                  className="text-xs border border-black px-1 bg-gray-50"
                                >
                                  {p.projectCode}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border border-black">{user.workingDays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-gray-100 border border-black">{userHolidays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge badge-green">{user.presentDays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge badge-red">{actualAbsent}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-cyan-200 text-cyan-900 border border-cyan-900">{user.clFullDay ?? fullDayLeaves}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-cyan-200 text-cyan-900 border border-cyan-900">{user.clHalfDay ?? halfDayLeaves}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-cyan-200 text-cyan-900 border border-cyan-900">{user.elDays ?? 0}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-cyan-200 text-cyan-900 border border-cyan-900">{user.odDays ?? 0}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge badge-blue">{addedDays}</span>
                            {addedDays > 0 && (
                              <button
                                onClick={() => setReasonModal({ user, type: "ADDED" })}
                                className="ml-1 text-xs text-blue-600 underline hover:text-blue-800"
                              >
                                View Reason
                              </button>
                            )}
                          </td>
                          <td className="text-center">
                            <span className="badge badge-yellow">{removedDays}</span>
                            {removedDays > 0 && (
                              <button
                                onClick={() => setReasonModal({ user, type: "REMOVED" })}
                                className="ml-1 text-xs text-blue-600 underline hover:text-blue-800"
                              >
                                View Reason
                              </button>
                            )}
                          </td>
                          <td className="text-center">
                            <span className="badge bg-white border-2 border-black font-bold">{total}</span>
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => {
                                const isClosing = selectedUser?.employeeId === user.employeeId;
                                setSelectedUser(isClosing ? null : user);
                                if (!isClosing) {
                                  setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                                }
                              }}
                              className="neo-btn text-xs py-1 px-2"
                            >
                              {selectedUser?.employeeId === user.employeeId ? "Close" : "Details"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={13} className="text-center p-8">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed View (Calendar + Records) */}
          {selectedUser && (
            <div ref={detailRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

              {/* Calendar */}
              <div className="neo-card overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-100 border-b-2 border-black">
                  <h3 className="font-bold uppercase">Calendar: {selectedUser.username}</h3>
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
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-sm">{new Date(day.date).getDate()}</span>
                              {day.isJoiningDate && <span className="text-[9px] text-blue-700 font-extrabold uppercase leading-tight" title="Joining Date">JOIN</span>}
                              {day.isTermCompletionDate && <span className="text-[9px] text-purple-700 font-extrabold uppercase leading-tight" title="Term Completion Date">TERM</span>}
                            </div>
                            {day.description && <span className="text-[10px] text-red-600 font-extrabold uppercase text-right leading-tight">{day.description}</span>}
                            <div className="text-xs font-bold uppercase text-center mt-1">
                              {day.isAdded && (
                                <span className="text-emerald-900" title={day.addedReason || "Added by PI"}>+ ADD</span>
                              )}
                              {day.isRemoved && (
                                <span className="text-orange-900" title={day.removedReason || "Removed by PI"}>&minus; REM</span>
                              )}
                              {!day.isAdded && !day.isRemoved && day.status === "leave" && (
                                <span className="text-cyan-900" title={day.leaveReason || "Leave"}>
                                  {day.leaveType === "10" ? "EL" : (day.leaveType === "00" || day.leaveType === "11") ? "OD" : day.dayType === "10" ? "CL-FN" : day.dayType === "01" ? "CL-AN" : "CL"}
                                </span>
                              )}
                              {!day.isAdded && !day.isRemoved && day.status === "present" && <span className="text-green-900">&#10004;</span>}
                              {!day.isAdded && !day.isRemoved && day.status === "absent" && <span className="text-red-900">&#10008;</span>}
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
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-cyan-200 border border-black"></div> Leave</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-black"></div> Holiday</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border border-black"></div> Weekend</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-300 border border-black"></div> PI Added</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-200 border border-black"></div> PI Removed</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border-2 border-blue-600"></div> Joining</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border-2 border-purple-600"></div> Term End</div>
                  </div>
                </div>
              </div>

              {/* Records List */}
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
                      {selectedUser.attendances.length > 0 ? (
                        selectedUser.attendances.map(att => (
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
          )}
        </div>
      )}

      {/* View Reason Modal */}
      {reasonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setReasonModal(null)}>
          <div className="neo-card bg-white max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b-2 border-black bg-gray-100 flex justify-between items-center">
              <h3 className="font-bold uppercase text-sm">
                {reasonModal.type === "ADDED" ? "PI Adjustment Added" : "PI Adjustment Subtracted"} - {reasonModal.user.username}
              </h3>
              <button onClick={() => setReasonModal(null)} className="neo-btn text-xs py-1 px-2">Close</button>
            </div>
            <div className="p-4">
              {(reasonModal.user.modifiedAttendances || [])
                .filter((m) => m.status === reasonModal.type)
                .length === 0 ? (
                <p className="text-center text-gray-500 py-4">No records found</p>
              ) : (
                <div className="space-y-3">
                  {(reasonModal.user.modifiedAttendances || [])
                    .filter((m) => m.status === reasonModal.type)
                    .map((m) => (
                      <div key={m.id} className="border-2 border-black p-3 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-sm">{formatDate(m.date)}</span>
                          <span className={`badge text-xs ${m.status === "ADDED" ? "badge-green" : "badge-red"}`}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{m.comment || "No reason provided"}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
