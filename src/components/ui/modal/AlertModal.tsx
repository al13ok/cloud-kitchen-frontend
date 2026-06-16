import React from "react";

export default function AlertModal({ open, message, onClose }: { open: boolean; message: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-transparent backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Alert</h2>
        <div className="mb-6 text-gray-900 dark:text-white">{message}</div>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
} 