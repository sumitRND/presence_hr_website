"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../hooks/useAuth";
import Header from "../../../../components/Header";
import Link from "next/link";

interface AttendanceRecord {
  date: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  attendanceType: string;
  isFullDay: boolean;
  isHalfDay: boolean;
  isCheckedOut: boolean;
}

interface UserAttendance {
  username: string;
  employeeId: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  adjustmentDelta?: number;
  adjustmentComment?: string;
  attendances: AttendanceRecord[];
}

interface PIDetailData {
  piUsername: string;
  month: number;
  year: number;
  totalWorkingDays: number;
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
  status: "present" | "absent" | "non-working" | null;
}

export default function PIDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const piUsername = params.username as string;

  const [data, setData] = useState<PIDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserAttendance | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [hasSubmittedData, setHasSubmittedData] = useState(false);
  const [submittedMonths, setSubmittedMonths] = useState<
    { month: number; year: number }[]
  >([]);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!authLoading && !user && isMounted) {
      router.push("/");
    }
  }, [user, authLoading, router, isMounted]);

  // Check submission status first
  useEffect(() => {
    const checkSubmissionStatus = async () => {
      if (!user || !piUsername || !isMounted) return;

      try {
        const submitted: { month: number; year: number }[] = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE}/hr/submission-status?month=${month}&year=${year}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("hr_token")}`,
              },
            },
          );

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.[piUsername]?.status === "complete") {
              submitted.push({ month, year });
            }
          }
        }

        if (submitted.length === 0) {
          setError("No data has been submitted by this PI yet.");
          setHasSubmittedData(false);
        } else {
          setHasSubmittedData(true);
          setSubmittedMonths(submitted);
          const mostRecent = submitted[0];
          if (mostRecent) {
            fetchDataForMonth(mostRecent.month, mostRecent.year);
          }
        }
      } catch (err) {
        console.error("Error checking submission status:", err);
        setError("Failed to check submission status");
      } finally {
        setLoading(false);
      }
    };

    checkSubmissionStatus();
  }, [user, piUsername, isMounted]);

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
    [data],
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
    let classes = "h-20 border-r-2 border-b-2 border-black p-2 flex flex-col justify-between transition-colors";
    if (day.status === "present") classes += " bg-green-200";
    else if (day.status === "absent") classes += " bg-red-200";
    else if (day.isHoliday) classes += " bg-red-50";
    else if (day.isWeekend) classes += " bg-gray-100";
    else classes += " bg-white";
    return classes;
  };

  const filteredUsers =
    data?.users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.employeeId.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  if (!isMounted || authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neo-card p-8 font-bold uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!loading && !hasSubmittedData) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Header />
        <div className="mb-6">
          <Link href="/dashboard" className="neo-btn text-sm">← Dashboard</Link>
        </div>
        <div className="neo-card border-red-500 p-8 bg-red-50">
          <h2 className="text-2xl font-bold text-red-800 uppercase mb-4">Access Restricted</h2>
          <p className="text-red-700 font-mono">This PI ({piUsername}) has not submitted any attendance data yet.</p>
        </div>
      </div>
    );
  }

  const firstDayOfMonth = data ? new Date(data.year, data.month - 1, 1).getDay() : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <Header />
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="neo-btn text-sm">← Dashboard</Link>
          <button onClick={handleDownload} className="neo-btn neo-btn-primary">Download CSV</button>
        </div>
        <h1 className="text-3xl font-extrabold uppercase text-black">PI: {piUsername}</h1>
      </div>

      {submittedMonths.length > 0 && (
        <div className="neo-card p-4 mb-8 bg-white">
          <span className="text-xs font-bold uppercase block mb-2">Select Period:</span>
          <div className="flex flex-wrap gap-2">
            {submittedMonths.map((sm) => (
              <button
                key={`${sm.year}-${sm.month}`}
                onClick={() => fetchDataForMonth(sm.month, sm.year)}
                className={`neo-btn text-xs ${data?.month === sm.month && data?.year === sm.year
                  ? "bg-black text-white"
                  : "bg-white"
                  }`}
              >
                {new Date(sm.year, sm.month - 1).toLocaleString("en-US", { month: "short", year: "numeric" })}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="text-center p-8 font-bold">Loading data...</div>}
      {error && <div className="neo-card bg-red-100 border-red-500 p-4 mb-4 text-red-700 font-bold">{error}</div>}

      {data && !loading && (
        <div className="space-y-8">
          {/* Summary Card */}
          <div className="neo-card p-6 bg-blue-50">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <h2 className="text-xl font-bold uppercase">
                {new Date(0, data.month - 1).toLocaleString("en-US", { month: "long" })} {data.year}
              </h2>
              <div className="badge bg-white border-2 border-black text-lg p-2 mt-2 md:mt-0">
                Total Working Days: {data.totalWorkingDays}
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="neo-card">
            <div className="p-4 border-b-2 border-black bg-white flex flex-col md:flex-row justify-between gap-4 items-center">
              <h2 className="text-xl font-bold uppercase">Staff Attendance</h2>
              <input
                type="text"
                placeholder="Search Staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="neo-input md:w-64"
              />
            </div>

            <div className="neo-table-container border-0 rounded-none">
              <table className="neo-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>ID</th>
                    <th className="text-center">Present</th>
                    <th className="text-center">Adjustment</th>
                    <th className="text-center">Absent</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const absentDays = Math.max(0, user.workingDays - user.presentDays);
                      return (
                        <tr key={user.username}>
                          <td className="font-bold">{user.username}</td>
                          <td>{user.employeeId}</td>
                          <td className="text-center">
                            <span className="badge badge-green">{user.presentDays}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge badge-blue">
                              {typeof user.adjustmentDelta === 'number' ? (user.adjustmentDelta > 0 ? `+${user.adjustmentDelta}` : user.adjustmentDelta) : '-'}
                            </span>
                            {user.adjustmentComment && (
                              <div className="text-[10px] mt-1 italic max-w-[150px] mx-auto truncate" title={user.adjustmentComment}>
                                "{user.adjustmentComment}"
                              </div>
                            )}
                          </td>
                          <td className="text-center">
                            <span className="badge badge-red">{absentDays}</span>
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => setSelectedUser(selectedUser?.username === user.username ? null : user)}
                              className="neo-btn text-xs py-1 px-2"
                            >
                              {selectedUser?.username === user.username ? "Close" : "Details"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={6} className="text-center p-8">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed View (Calendar + Records) */}
          {selectedUser && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

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
                            <span className="font-bold text-sm">{new Date(day.date).getDate()}</span>
                            {day.description && <span className="text-[10px] text-red-600 font-extrabold uppercase text-right leading-tight">{day.description}</span>}
                            <div className="text-xs font-bold uppercase text-center mt-1">
                              {day.status === "present" && <span className="text-green-900">✔</span>}
                              {day.status === "absent" && <span className="text-red-900">✘</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.attendances.length > 0 ? (
                        selectedUser.attendances.map(att => (
                          <tr key={att.date}>
                            <td>{formatDate(att.date)}</td>
                            <td className="font-mono text-xs text-green-700">{formatTime(att.checkinTime)}</td>
                            <td className="font-mono text-xs text-red-700">{formatTime(att.checkoutTime)}</td>
                            <td><span className="badge badge-gray text-[10px]">{att.attendanceType}</span></td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} className="text-center p-8">No records</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}