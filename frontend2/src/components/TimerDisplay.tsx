import { Clock, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface TimerDisplayProps {
  formattedTime: string;
  isExpired: boolean;
  teamId: string;
  sessionStatus?: string;
  sessionEndedAt?: string;
}

export function TimerDisplay({
  formattedTime,
  isExpired,
  teamId,
  sessionStatus,
  sessionEndedAt,
}: TimerDisplayProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleExitClick = () => {
    setSearchParams({ ended: "true" });
  };

  // Calculate frozen time display for completed sessions
  const getFrozenTimeDisplay = () => {
    if (sessionStatus === "completed" && sessionEndedAt) {
      // Simply show the actual end time instead of trying to calculate remaining time
      const endTime = new Date(sessionEndedAt);
      const timeString = endTime.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
      return timeString;
    }
    return formattedTime;
  };

  const displayTime =
    sessionStatus === "completed" ? getFrozenTimeDisplay() : formattedTime;
  const isSessionEnded = sessionStatus === "completed";

  return (
    <div className="header-bar w-full bg-background border-b border-border sticky top-0 z-50">
      <div
        className="flex items-center justify-between"
        style={{
          padding: "2px 8px",
          width: "100%",
          height: "auto",
        }}
      >
        <button
          onClick={handleExitClick}
          className="exit-btn"
          style={{
            fontSize: "10px",
            fontWeight: "bold",
            color: "#000",
            minWidth: "44px",
            minHeight: "44px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            background: "transparent",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onMouseDown={(e) => (e.currentTarget.style.opacity = "0.6")}
          onMouseUp={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          aria-label="Exit Session"
        >
          ← Exit
        </button>
        <div
          className={`timer ${isExpired && !isSessionEnded ? "animate-pulse" : ""}`}
          style={{
            fontSize: "10px",
            fontWeight: "bold",
            color: isSessionEnded ? "white" : "red",
            textAlign: "center",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {isSessionEnded ? "Session ended at:" : "Turn ends in:"} {displayTime}
        </div>
        <div style={{ width: "44px" }} /> {/* Spacer for centering */}
      </div>
    </div>
  );
}
