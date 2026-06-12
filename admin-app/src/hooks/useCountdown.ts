import { useState, useEffect } from 'react';

export function useCountdown(initialSeconds: number) {
  // Paired state tracks [previousProp, derivedSeconds] so we can reset
  // during render when initialSeconds changes — the React-recommended
  // alternative to getDerivedStateFromProps.
  const [[prevInitial, seconds], setState] = useState<[number, number]>(
    [initialSeconds, initialSeconds],
  );

  if (prevInitial !== initialSeconds) {
    setState([initialSeconds, initialSeconds]);
  }

  useEffect(() => {
    const id = setInterval(() => {
      setState(([init, s]) => [init, s > 0 ? s - 1 : 0]);
    }, 1000);
    return () => clearInterval(id);
  }, [initialSeconds]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${minutes}:${String(secs).padStart(2, '0')}`;

  return { seconds, formatted };
}
