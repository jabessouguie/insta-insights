"use client";

import { useState, useEffect } from "react";

/**
 * Cycles through a list of status messages while `isActive` is true.
 * Returns the current message to display.
 */
export function useAnimatedStatus(
  isActive: boolean,
  messages: string[],
  intervalMs = 2200
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isActive, messages.length, intervalMs]);

  return messages[index];
}
