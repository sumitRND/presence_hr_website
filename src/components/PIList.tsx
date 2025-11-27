import React from "react";
import Link from "next/link";
import type { PIData, PIStatuses } from "../app/dashboard/page";

interface PIListProps {
  pis: PIData[];
  selectedPIs: Set<string>;
  setSelectedPIs: React.Dispatch<React.SetStateAction<Set<string>>>;
  piStatuses: PIStatuses;
}

const statusMap = {
  complete: {
    icon: "✅",
    text: "Submitted",
    badgeClass: "badge-green",
  },
  pending: {
    icon: "⚠️",
    text: "Pending",
    badgeClass: "badge-yellow",
  },
  requested: {
    icon: "➡️",
    text: "Requested",
    badgeClass: "badge-blue",
  },
  none: {
    icon: "⚫",
    text: "No Action",
    badgeClass: "badge-gray"
  },
};

export default function PIList({
  pis,
  selectedPIs,
  setSelectedPIs,
  piStatuses,
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

  const handlePIClick = (e: React.MouseEvent, piUsername: string) => {
    const statusData = piStatuses[piUsername];
    const status = statusData?.status || "none";

    if (status !== "complete") {
      e.preventDefault();
      alert(
        "Data has not been submitted by this PI yet.",
      );
    }
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
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {validPIs.length > 0 ? (
              validPIs.map((pi) => {
                const statusData = piStatuses[pi.username];
                const status = statusData?.status || "none";
                const isClickable = status === "complete";
                const { text, badgeClass } = statusMap[status];

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
                    <td className="font-bold">
                      {isClickable ? (
                        <Link
                          href={`/dashboard/pi/${pi.username}`}
                          className="text-blue-600 hover:underline decoration-2 underline-offset-2"
                          title={statusData?.isPartial ? "Partial Submission" : "View Details"}
                        >
                          {pi.username}
                        </Link>
                      ) : (
                        <span
                          className="text-gray-400 cursor-not-allowed"
                          onClick={(e) => handlePIClick(e, pi.username)}
                          title="Data not submitted"
                        >
                          {pi.username} 🔒
                        </span>
                      )}
                    </td>
                    <td>
                      {statusData?.fullName && statusData.fullName !== "N/A"
                        ? statusData.fullName
                        : pi.fullName && pi.fullName !== "N/A"
                          ? pi.fullName
                          : "-"}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${badgeClass}`}>
                        {text}
                        {status === "complete" && statusData?.isPartial && (
                          <span className="ml-1 opacity-75 text-[10px] block">
                            ({statusData.submittedCount}/{statusData.totalCount})
                          </span>
                        )}
                      </span>
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