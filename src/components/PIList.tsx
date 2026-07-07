import React from "react";
import Link from "next/link";
import type { PIData } from "../app/dashboard/page";

interface PIListProps {
  pis: PIData[];
  selectedPIs: Set<string>;
  setSelectedPIs: React.Dispatch<React.SetStateAction<Set<string>>>;
  month: number;
  year: number;
}

export default function PIList({
  pis,
  selectedPIs,
  setSelectedPIs,
  month,
  year,
}: PIListProps) {
  const validPIs = pis.filter(
    (pi) => pi.username && pi.username.trim() !== "" && pi.username !== "N/A",
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPIs(new Set(validPIs.map((pi) => pi.username)));
    } else {
      setSelectedPIs(new Set());
    }
  };

  const handleSelectPI = (piUsername: string) => {
    const newSelection = new Set(selectedPIs);
    if (newSelection.has(piUsername)) {
      newSelection.delete(piUsername);
    } else {
      newSelection.add(piUsername);
    }
    setSelectedPIs(newSelection);
  };

  return (
    <div className="neo-card p-0">
      <div className="p-4 border-b-2 border-black bg-white">
        <h2 className="text-xl font-bold uppercase">Principal Investigators</h2>
      </div>

      <div className="neo-table-container border-0 rounded-none border-t-0">
        <table className="neo-table">
          <thead>
            <tr>
              <th className="w-12 text-center">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={validPIs.length > 0 && selectedPIs.size === validPIs.length}
                  className="w-4 h-4 accent-black cursor-pointer"
                />
              </th>
              <th>Username</th>
              <th>Full Name</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {validPIs.length > 0 ? (
              validPIs.map((pi) => {
                return (
                  <tr key={pi.username}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedPIs.has(pi.username)}
                        onChange={() => handleSelectPI(pi.username)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                    </td>
                    <td className="font-bold">{pi.username}</td>
                    <td>
                      {pi.fullName && pi.fullName !== "N/A"
                        ? pi.fullName
                        : "-"}
                    </td>
                    <td className="text-center">
                      <Link
                        href={`/dashboard/pi/${pi.username}?month=${month}&year=${year}`}
                        className="neo-btn neo-btn-primary text-xs py-1 px-3"
                      >
                        View Attendance
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="text-center p-8 text-gray-500 italic">
                  No PIs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
