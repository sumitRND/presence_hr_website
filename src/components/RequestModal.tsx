import React, { useState } from "react";

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
  month: number;
  year: number;
  selectedPIs: string[];
}

export default function RequestModal({
  isOpen,
  onClose,
  onConfirm,
  month,
  year,
  selectedPIs,
}: RequestModalProps) {
  const [message, setMessage] = useState("Request for attendance data for");

  if (!isOpen) return null;

  const monthName = new Date(0, month - 1).toLocaleString("en-US", {
    month: "long",
  });

  const handleSubmit = () => {
    onConfirm(message);
    setMessage("Request for attendance data for"); // Reset for next time
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-slate-700 shadow-[8px_8px_0px_rgba(51,65,85,0.3)] rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">
            Send Attendance Request
          </h2>

          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-2">
              Sending to {selectedPIs.length} PI(s) for {monthName} {year}
            </p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="request-message"
              className="block text-sm font-bold mb-2 text-slate-700"
            >
              Request Message
            </label>
            <textarea
              id="request-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border-2 border-slate-300 p-3 rounded focus:outline-none focus:border-slate-500 focus:shadow-[2px_2px_0px_rgba(51,65,85,0.2)] bg-white resize-none"
              rows={3}
              placeholder="Enter your request message..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Note: Month and year will be automatically added to the message
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 border-2 border-slate-400 bg-gray-100 hover:bg-gray-200 font-bold text-slate-700 rounded transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 border-2 border-slate-700 bg-blue-100 hover:bg-blue-200 font-bold text-slate-800 rounded hover:shadow-[2px_2px_0px_rgba(51,65,85,0.2)] transition-all"
            >
              Send Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
