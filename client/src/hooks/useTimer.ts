import { useEffect, useRef, useState } from 'react';

const useTimer = () => {
  const [time, setTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSuccessful, setIsSuccessful] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  const isSuccessfulCheck = () => {
    if ((time / 1000) >= 4.95 && (time / 1000) <= 5.05) {
      setIsSuccessful(true);
    } else {
      setIsSuccessful(false);
    }
  };

  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      const startTime = Date.now() - time;
      intervalRef.current = window.setInterval(() => {
        setTime(Date.now() - startTime);
      }, 10);
    }
  };

  const stopTimer = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    isSuccessfulCheck();
  };

  const resetTimer = () => {
    stopTimer();
    setTime(0);
  };

  return {
    time: time / 1000,
    isRunning,
    isSuccessful,
    startTimer,
    stopTimer,
    resetTimer,
  };
};

export default useTimer;