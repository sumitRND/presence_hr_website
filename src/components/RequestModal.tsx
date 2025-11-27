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
    setMessage("Request for attendance data for");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="w-full max-w-md neo-card p-0 flex flex-col">
        <div className="modal-header">
          <h2 className="text-xl font-extrabold uppercase">Send Request</h2>
          <button onClick={onClose} className="neo-btn px-2 py-1 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="p-6">
          <div className="bg-yellow-50 border-2 border-black p-3 mb-4 font-mono text-sm">
            <p><strong>To:</strong> {selectedPIs.length} PI(s)</p>
            <p><strong>Period:</strong> {monthName} {year}</p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="request-message"
              className="block text-sm font-bold mb-2 uppercase"
            >
              Message
            </label>
            <textarea
              id="request-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="neo-input min-h-[100px]"
              rows={3}
              placeholder="Enter your request message..."
            />
            <p className="text-xs text-gray-500 mt-1 font-mono">
              * Month and year appended automatically.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="neo-btn bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="neo-btn neo-btn-primary"
            >
              Send Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}