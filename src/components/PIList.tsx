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
    text: "Data Submitted",
    className: "status-complete",
  },
  pending: {
    icon: "⚠️",
    text: "Submission Pending",
    className: "status-pending",
  },
  requested: {
    icon: "➡️",
    text: "Request Sent",
    className: "status-requested",
  },
  none: { icon: "⚫", text: "No Request Sent", className: "status-none" },
};

export default function PIList({
  pis,
  selectedPIs,
  setSelectedPIs,
  piStatuses,
}: PIListProps) {
  // Filter out empty or invalid PIs
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

    // Only allow navigation if status is "complete"
    if (status !== "complete") {
      e.preventDefault();
      alert(
        "Data has not been submitted by this PI yet. Please request data first and wait for submission.",
      );
    }
  };

  const getStatusDisplay = (pi: PIData) => {
    const statusData = piStatuses[pi.username];
    const status = statusData?.status || "none";
    const { icon, text, className } = statusMap[status];

    // Check if it's a partial submission
    if (status === "complete" && statusData?.isPartial) {
      return (
        <div className={`pi-status ${className}`}>
          <span>{icon}</span>
          <span>
            {text}
            <span className="text-xs ml-1" style={{ opacity: 0.8 }}>
              ({statusData.submittedCount}/{statusData.totalCount} employees)
            </span>
          </span>
        </div>
      );
    }

    return (
      <div className={`pi-status ${className}`}>
        <span>{icon}</span>
        <span>{text}</span>
      </div>
    );
  };

  return (
    <div className="pi-list-container">
      <div className="pi-list-header">
        <input
          type="checkbox"
          className="pi-list-header-checkbox"
          onChange={handleSelectAll}
          checked={validPIs.length > 0 && selectedPIs.size === validPIs.length}
        />
        <div className="pi-list-header-title">PI Username</div>
        <div className="pi-list-header-name">PI Name</div>
        <div className="pi-list-header-status">Submission Status</div>
      </div>
      {validPIs.length > 0 ? (
        validPIs.map((pi) => {
          const statusData = piStatuses[pi.username];
          const status = statusData?.status || "none";
          const isClickable = status === "complete";

          return (
            <div key={pi.username} className="pi-item">
              <input
                type="checkbox"
                className="pi-item-checkbox"
                checked={selectedPIs.has(pi.username)}
                onChange={() => handleSelectPI(pi.username)}
              />
              <div className="pi-name">
                {isClickable ? (
                  <Link
                    href={`/dashboard/pi/${pi.username}`}
                    className="pi-link"
                    title={
                      statusData?.isPartial
                        ? `View attendance details (${statusData.submittedCount} of ${statusData.totalCount} employees)`
                        : "View attendance details"
                    }
                  >
                    {pi.username}
                  </Link>
                ) : (
                  <span
                    className="pi-link-disabled"
                    onClick={(e) => handlePIClick(e, pi.username)}
                    title="Data not yet submitted - Request data first"
                  >
                    {pi.username}
                  </span>
                )}
              </div>
              <div className="pi-full-name">
                {statusData?.fullName && statusData.fullName !== "N/A"
                  ? statusData.fullName
                  : pi.fullName && pi.fullName !== "N/A"
                    ? pi.fullName
                    : pi.username}
              </div>
              {getStatusDisplay(pi)}
            </div>
          );
        })
      ) : (
        <div className="pi-item">
          <div className="text-center w-full py-8 text-slate-500">
            No PIs found
          </div>
        </div>
      )}
    </div>
  );
}
