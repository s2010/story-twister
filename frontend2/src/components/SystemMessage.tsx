import React from "react";

interface SystemMessageProps {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  timestamp?: string;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({
  message,
  type = "info",
  timestamp,
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
  };

  return (
    <div className="flex justify-center py-2 px-4">
      <div
        className={`text-center text-xs font-mono ${getTypeStyles()} max-w-md`}
      >
        <div className="bg-gray-50 dark:bg-gray-800 rounded-full px-3 py-1 border border-gray-200 dark:border-gray-700">
          {message}
          {timestamp && (
            <span className="ml-2 opacity-60 text-[10px]">
              {new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemMessage;
