import { useState, useEffect, useRef } from "react";

type TimerOptions = {
  duration: number; // in seconds
  onExpire?: () => void;
  autoStart?: boolean;
};

export function useTimer(options: TimerOptions) {
  const { duration, onExpire, autoStart = true } = options;
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onExpireRef = useRef(onExpire);

  // Update the callback ref when it changes
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsExpired(true);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const start = () => {
    if (!isExpired && timeLeft > 0) {
      setIsRunning(true);
    }
  };

  const pause = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setTimeLeft(duration);
    setIsRunning(autoStart);
    setIsExpired(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return {
    timeLeft,
    isRunning,
    isExpired,
    formattedTime: formatTime(timeLeft),
    start,
    pause,
    reset,
  };
}
