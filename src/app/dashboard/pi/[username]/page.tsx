
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
  adjustmentDelta?: number;  // NEW: Adjustment delta
  adjustmentComment?: string;  // NEW: PI comment
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        // Get all submission statuses to find which months have been submitted
        const currentYear = new Date().getFullYear();
        const submitted: { month: number; year: number }[] = [];

        // Check last 12 months for submissions
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
            if (
              result.success &&
              result.data?.[piUsername]?.status === "complete"
            ) {
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
          // Load the most recent submitted month
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

  const fetchDataForMonth = async (month: number, year: number) => {
    if (!user || !piUsername) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/hr/pi/${piUsername}/attendance?month=${month}&year=${year}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("hr_token")}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

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
  };

  const loadCalendarForUser = useCallback(
    async (userAttendance: UserAttendance) => {
      if (!data) return;

      try {
        setLoadingCalendar(true);

        // Fetch holidays
        const holidaysRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/calendar/holidays?year=${data.year}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("hr_token")}`,
            },
          },
        );

        const holidaysData = await holidaysRes.json();
        const currentYearHolidays: Holiday[] = holidaysData.success
          ? holidaysData.holidays
          : [];

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
          if (attendance) {
            status = "present";
          } else if (!isHoliday && !isWeekend && date <= today) {
            status = "absent";
          } else if (isHoliday || isWeekend) {
            status = "non-working";
          }

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
        headers: {
          Authorization: `Bearer ${localStorage.getItem("hr_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "N/A";
    const time = new Date(timeStr);
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDayClass = (day: CalendarDay) => {
    let classes = "calendar-day";
    if (day.isHoliday) classes += " holiday";
    if (day.isWeekend) classes += " weekend";
    if (day.status === "present") classes += " present";
    if (day.status === "absent") classes += " absent";
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

  // Access control - show error if no data submitted
  if (!loading && !hasSubmittedData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container mx-auto p-6">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <div className="bg-red-50 border-2 border-red-300 p-8 rounded-lg">
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              Access Restricted
            </h2>
            <p className="text-red-700">
              This PI ({piUsername}) has not submitted any attendance data yet.
            </p>
            <p className="text-red-700 mt-2">
              Please request data from the PI first and wait for submission
              before accessing this page.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const firstDayOfMonth = data
    ? new Date(data.year, data.month - 1, 1).getDay()
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-4 text-slate-800">
            Attendance Details: {piUsername}
          </h1>
        </div>

        {/* Show available submitted months */}
        {submittedMonths.length > 0 && (
          <div className="flex gap-4 items-center mb-6">
            <div>
              <span className="text-sm font-bold text-slate-700">
                Available Months:
              </span>
              <div className="flex gap-2 mt-2">
                {submittedMonths.map((sm) => (
                  <button
                    key={`${sm.year}-${sm.month}`}
                    onClick={() => fetchDataForMonth(sm.month, sm.year)}
                    className={`px-3 py-1 border-2 rounded transition-all ${
                      data?.month === sm.month && data?.year === sm.year
                        ? "bg-blue-500 text-white border-blue-700"
                        : "bg-white text-slate-800 border-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {new Date(sm.year, sm.month - 1).toLocaleString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="h-10 px-4 bg-green-100 text-slate-800 border-2 border-slate-700 hover:bg-green-200 font-bold rounded hover:shadow-[2px_2px_0px_rgba(51,65,85,0.2)] transition-all ml-auto"
            >
              Download Report
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8 text-slate-600">
            Loading attendance data...
          </div>
        )}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 p-4 mb-4 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            <div className="bg-blue-50 border-2 border-slate-300 p-4 shadow-[2px_2px_0px_rgba(51,65,85,0.1)] rounded-lg">
              <p className="text-lg font-bold text-slate-800">
                Viewing Data for{" "}
                {new Date(0, data.month - 1).toLocaleString("en-US", {
                  month: "long",
                })}{" "}
                {data.year} - Total Working Days: {data.totalWorkingDays}
              </p>
            </div>

            <div className="bg-white border-2 border-slate-300 shadow-[2px_2px_0px_rgba(51,65,85,0.1)] rounded-lg overflow-hidden">
              <div className="bg-slate-100 border-b-2 border-slate-300 p-4">
                <h2 className="text-xl font-bold text-slate-800">
                  Project Staff Attendance
                </h2>
              </div>

              <div className="p-4">
                <div className="mb-4">
                  <label
                    htmlFor="user-search"
                    className="block text-sm font-bold mb-2 text-slate-700"
                  >
                    Search Employee Username/ID
                  </label>
                  <input
                    id="user-search"
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-96 border-2 border-slate-300 p-2 bg-white rounded focus:border-slate-500 focus:outline-none"
                  />
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-300">
                      <th className="text-left p-3 text-slate-700">
                        Employee Username
                      </th>
                      <th className="text-left p-3 text-slate-700">
                        Employee ID
                      </th>
                      <th className="text-center p-3 text-slate-700">
                        Working Days
                      </th>
                      <th className="text-center p-3 text-slate-700">
                        Present Days
                      </th>
                      <th className="text-center p-3 text-slate-700">
                        Adjustment
                      </th>
                      <th className="text-center p-3 text-slate-700">
                        Absent Days
                      </th>
                      <th className="text-center p-3 text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const absentDays = Math.max(0, user.workingDays - user.presentDays); // Uses adjusted presentDays
                        return (
                          <tr
                            key={user.username}
                            className="border-b border-slate-200 hover:bg-slate-50"
                          >
                            <td className="p-3 font-medium text-slate-800">
                              {user.username}
                            </td>
                            <td className="p-3 text-slate-700">
                              {user.employeeId}
                            </td>
                            <td className="text-center p-3 text-slate-700">
                              {user.workingDays}
                            </td>
                            <td className="text-center p-3">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                {user.presentDays}
                                {user.adjustmentComment && (
                                  <span
                                    className="text-xs ml-1 italic text-blue-600 block"
                                    title={user.adjustmentComment}
                                  >
                                    💬 {user.adjustmentComment}
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="text-center p-3">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {typeof user.adjustmentDelta === 'number' ? (user.adjustmentDelta > 0 ? `+${user.adjustmentDelta}` : user.adjustmentDelta) : ''}
                              </span>
                              {user.adjustmentComment && (
                                <span
                                  className="text-xs ml-1 italic text-blue-600 block"
                                  title={user.adjustmentComment}
                                >
                                  💬 {user.adjustmentComment}
                                </span>
                              )}
                            </td>
                            <td className="text-center p-3">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                                {absentDays}
                              </span>
                            </td>
                            <td className="text-center p-3">
                              <button
                                onClick={() =>
                                  setSelectedUser(
                                    selectedUser?.username === user.username
                                      ? null
                                      : user,
                                  )
                                }
                                className="bg-blue-100 text-slate-800 px-3 py-1 border-2 border-slate-700 hover:bg-blue-200 rounded hover:shadow-[1px_1px_0px_rgba(51,65,85,0.2)] transition-all"
                              >
                                {selectedUser?.username === user.username
                                  ? "Hide"
                                  : "View"}{" "}
                                Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center p-8 text-slate-500"
                        >
                          {searchQuery
                            ? "No users found matching your search"
                            : "No users available for this period"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedUser && (
              <>
                {/* Calendar Section */}
                <div className="bg-white border-2 border-slate-300 shadow-[2px_2px_0px_rgba(51,65,85,0.1)] rounded-lg overflow-hidden">
                  <div className="bg-slate-100 border-b-2 border-slate-300 p-4">
                    <h2 className="text-xl font-bold text-slate-800">
                      Attendance Calendar for {selectedUser.username} (
                      {selectedUser.employeeId})
                    </h2>
                  </div>
                  <div className="p-4">
                    {loadingCalendar ? (
                      <p className="text-center text-slate-600">
                        Loading calendar...
                      </p>
                    ) : (
                      <div className="calendar-grid">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (day) => (
                            <div
                              key={day}
                              className="calendar-day-header font-bold text-slate-700"
                            >
                              {day}
                            </div>
                          ),
                        )}
                        {Array(firstDayOfMonth)
                          .fill(null)
                          .map((_, i) => (
                            <div key={`empty-${i}`} className="calendar-day" />
                          ))}
                        {calendarData.map((day) => (
                          <div key={day.date} className={getDayClass(day)}>
                            <span>{new Date(day.date).getDate()}</span>
                            {day.description && (
                              <span className="calendar-day-desc">
                                {day.description}
                              </span>
                            )}
                            {day.status === "present" && (
                              <span className="calendar-status present">✔</span>
                            )}
                            {day.status === "absent" && (
                              <span className="calendar-status absent">✘</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Attendance Records */}
                <div className="bg-white border-2 border-slate-300 shadow-[2px_2px_0px_rgba(51,65,85,0.1)] rounded-lg overflow-hidden">
                  <div className="bg-slate-100 border-b-2 border-slate-300 p-4">
                    <h2 className="text-xl font-bold text-slate-800">
                      Attendance Records
                    </h2>
                  </div>
                  <div className="p-4">
                    {selectedUser.attendances.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-slate-300">
                            <th className="text-left p-3 text-slate-700">Date</th>
                            <th className="text-left p-3 text-slate-700">
                              Check-in
                            </th>
                            <th className="text-left p-3 text-slate-700">
                              Check-out
                            </th>
                            <th className="text-left p-3 text-slate-700">
                              Type
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUser.attendances.map((att) => (
                            <tr
                              key={att.date}
                              className="border-b border-slate-200"
                            >
                              <td className="p-3 text-slate-800">
                                {formatDate(att.date)}
                              </td>
                              <td className="p-3 text-slate-700">
                                {formatTime(att.checkinTime)}
                              </td>
                              <td className="p-3 text-slate-700">
                                {formatTime(att.checkoutTime)}
                              </td>
                              <td className="p-3 text-slate-700">
                                {att.attendanceType}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-center p-8 text-slate-500">
                        No attendance records for this period
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
