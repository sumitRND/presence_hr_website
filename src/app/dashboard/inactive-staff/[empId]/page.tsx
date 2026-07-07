"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../hooks/useAuth";
import { api } from "../../../../utils/api";
import Header from "../../../../components/Header";

interface DayCell {
  date: string;
  isHoliday: boolean;
  isWeekend: boolean;
  description: string | null;
  status: "present" | "absent" | "leave" | "non-working" | null;
  attendanceType: string | null;
  leaveType: string | null;
  dayType: string | null;
  leaveReason: string | null;
}

interface MonthBlock {
  year: number;
  month: number;
  days: DayCell[];
}

interface Totals {
  totalPresent: number;
  fullDayPresent: number;
  halfDayPresent: number;
  totalAbsent: number;
  totalLeave: number;
  clFullDay: number;
  clHalfDay: number;
  elDays: number;
  odDays: number;
  totalHolidays: number;
  totalWeekends: number;
  totalDays: number;
}

interface HistoryData {
  empId: string;
  staffFullName: string | null;
  staffUsername: string | null;
  piUsername: string | null;
  piFullName: string | null;
  joiningDate: string;
  termCompletionDate: string;
  effectiveEndDate: string;
  totals: Totals;
  modifiedAttendances: { id: number; date: string; status: string; comment: string | null }[];
  months: MonthBlock[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dayClass(day: DayCell): string {
  let c = "h-16 border-r-2 border-b-2 border-black p-1 flex flex-col justify-between transition-colors";
  if (day.status === "leave") c += " bg-cyan-200";
  else if (day.status === "present") c += " bg-green-200";
  else if (day.status === "absent") c += " bg-red-200";
  else if (day.isHoliday) c += " bg-red-50";
  else if (day.isWeekend) c += " bg-gray-100";
  else c += " bg-white";
  return c;
}

function MonthCalendar({ block }: { block: MonthBlock }) {
  const firstDayOfMonth = new Date(block.year, block.month - 1, 1).getDay();
  const monthStart = new Date(block.year, block.month - 1, 1);
  const monthEnd = new Date(block.year, block.month, 0);

  // Pad: cells before joining/term-completion bounds within this month should be muted.
  const firstShownDay = block.days.length > 0 ? new Date(block.days[0]!.date).getDate() : 1;
  const lastShownDay = block.days.length > 0
    ? new Date(block.days[block.days.length - 1]!.date).getDate()
    : monthEnd.getDate();

  const dayMap = new Map<number, DayCell>();
  for (const d of block.days) {
    dayMap.set(new Date(d.date).getDate(), d);
  }

  const totalDaysInMonth = monthEnd.getDate();
  const present = block.days.filter((d) => d.status === "present").length;
  const absent = block.days.filter((d) => d.status === "absent").length;
  const leave = block.days.filter((d) => d.status === "leave").length;

  return (
    <div className="neo-card overflow-hidden">
      <div className="p-3 bg-gray-100 border-b-2 border-black flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-bold uppercase text-sm">
          {MONTH_NAMES[block.month - 1]} {block.year}
        </h3>
        <div className="flex gap-2 flex-wrap text-xs font-bold">
          <span className="badge bg-green-200 border border-green-700 text-green-900">P:{present}</span>
          <span className="badge bg-red-200 border border-red-700 text-red-900">A:{absent}</span>
          <span className="badge bg-cyan-200 border border-cyan-900 text-cyan-900">L:{leave}</span>
        </div>
      </div>
      <div className="p-2 bg-white">
        <div className="border-2 border-black">
          <div className="grid grid-cols-7 bg-gray-200 border-b-2 border-black">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="p-1 text-center font-bold uppercase text-[10px] border-r-2 border-black last:border-r-0">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-black gap-[2px] border-black">
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`pad-${i}`} className="bg-gray-50 border-r-2 border-b-2 border-black h-16 opacity-50" />
            ))}
            {Array.from({ length: totalDaysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const cell = dayMap.get(dayNum);
              const outOfTenure = dayNum < firstShownDay || dayNum > lastShownDay;
              if (!cell || outOfTenure) {
                return (
                  <div key={`out-${dayNum}`} className="bg-gray-50 border-r-2 border-b-2 border-black h-16 opacity-40 p-1">
                    <span className="font-bold text-xs text-gray-400">{dayNum}</span>
                  </div>
                );
              }
              return (
                <div
                  key={cell.date}
                  className={dayClass(cell)}
                  title={
                    cell.status === "leave"
                      ? `Leave${cell.leaveReason ? `: ${cell.leaveReason}` : ""}`
                      : cell.description || cell.status || ""
                  }
                >
                  <span className="font-bold text-xs">{dayNum}</span>
                  <div className="text-[10px] font-bold uppercase text-center">
                    {cell.status === "leave" && (
                      <span className="text-cyan-900">
                        {cell.leaveType === "10"
                          ? "EL"
                          : (cell.leaveType === "00" || cell.leaveType === "11")
                            ? "OD"
                            : cell.dayType === "10"
                              ? "CL-FN"
                              : cell.dayType === "01"
                                ? "CL-AN"
                                : "CL"}
                      </span>
                    )}
                    {cell.status === "present" && <span className="text-green-900">&#10004;</span>}
                    {cell.status === "absent" && <span className="text-red-900">&#10008;</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InactiveStaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const empId = decodeURIComponent(params.empId as string);

  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isLoading && !user && isMounted) {
      router.push("/");
    }
  }, [user, isLoading, router, isMounted]);

  useEffect(() => {
    if (!user || !isMounted) return;
    const fetchHistory = async () => {
      setLoading(true);
      setError("");
      const response = await api.get<HistoryData>(
        `/hr/inactive-staff/${encodeURIComponent(empId)}/attendance-history`,
      );
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || "Failed to load attendance history");
      }
      setLoading(false);
    };
    fetchHistory();
  }, [user, isMounted, empId]);

  if (!isMounted || isLoading || !user) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="neo-card p-8 font-bold uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <Header />

      <div className="flex justify-between items-center mb-6">
        <Link href="/dashboard/inactive-staff" className="neo-btn text-sm">&larr; Inactive Staff</Link>
      </div>

      {error && (
        <div className="neo-card bg-red-100 border-red-500 p-4 mb-4 text-red-700 font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="neo-card p-8 text-center font-bold animate-pulse">Loading attendance history...</div>
      ) : data ? (
        <>
          {/* Header info */}
          <div className="neo-card p-6 mb-6 bg-blue-50">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-extrabold uppercase">
                  {data.staffFullName || data.empId}
                </h1>
                <p className="text-sm text-gray-700 font-mono mt-1">
                  {data.staffUsername || "—"} · {data.empId}
                </p>
                {data.piFullName && (
                  <p className="text-sm text-gray-700 mt-1">
                    PI: <span className="font-bold">{data.piFullName}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <div>
                  <span className="font-bold uppercase text-xs">Joined: </span>
                  <span className="font-mono">{data.joiningDate}</span>
                </div>
                <div>
                  <span className="font-bold uppercase text-xs">Term End: </span>
                  <span className="font-mono text-red-700 font-bold">{data.termCompletionDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Totals card */}
          <div className="neo-card p-6 mb-6">
            <h2 className="text-lg font-bold uppercase mb-4">Tenure Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <Stat label="Total Present" value={data.totals.totalPresent} color="green" />
              <Stat label="Total Absent" value={data.totals.totalAbsent} color="red" />
              <Stat label="Total Leave" value={data.totals.totalLeave} color="cyan" />
              <Stat label="Holidays" value={data.totals.totalHolidays} color="gray" />
              <Stat label="Weekends" value={data.totals.totalWeekends} color="gray" />
              <Stat label="Tenure Days" value={data.totals.totalDays} color="black" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
              <Stat label="Full-Day Present" value={data.totals.fullDayPresent} color="green" />
              <Stat label="Half-Day Present" value={data.totals.halfDayPresent} color="green" />
              <Stat label="CL Full Day" value={data.totals.clFullDay} color="cyan" />
              <Stat label="CL Half Day" value={data.totals.clHalfDay} color="cyan" />
              <Stat label="EL" value={data.totals.elDays} color="cyan" />
              <Stat label="OD" value={data.totals.odDays ?? 0} color="cyan" />
            </div>
          </div>

          {/* Legend */}
          <div className="neo-card p-3 mb-6">
            <div className="flex gap-4 text-xs font-bold uppercase justify-center flex-wrap">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-200 border border-black"></div> Present</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-200 border border-black"></div> Absent</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-cyan-200 border border-black"></div> Leave</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-black"></div> Holiday</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border border-black"></div> Weekend</div>
            </div>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.months.map((m) => (
              <MonthCalendar key={`${m.year}-${m.month}`} block={m} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-100 border-green-700 text-green-900",
    red: "bg-red-100 border-red-700 text-red-900",
    cyan: "bg-cyan-100 border-cyan-900 text-cyan-900",
    gray: "bg-gray-100 border-gray-700 text-gray-800",
    black: "bg-white border-black text-black",
  };
  return (
    <div className={`border-2 ${colorMap[color] || colorMap.black} p-3 rounded`}>
      <div className="text-[10px] font-bold uppercase">{label}</div>
      <div className="text-2xl font-extrabold mt-1 font-mono">{value}</div>
    </div>
  );
}
