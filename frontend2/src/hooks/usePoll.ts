import { useEffect, useRef } from "react";

type PollOptions = {
  interval?: number;
  enabled?: boolean;
};

export function usePoll(
  callback: () => void | Promise<void>,
  options: PollOptions = {},
) {
  const { interval = 5000, enabled = true } = options;
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the polling
  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      try {
        await savedCallback.current();
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Run immediately
    tick();

    // Set up interval
    const id = setInterval(tick, interval);

    return () => clearInterval(id);
  }, [interval, enabled]);
}
