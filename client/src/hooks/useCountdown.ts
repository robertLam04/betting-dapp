import { useState, useEffect } from 'react';

const useCountdown = (initialTime: number, onCountdownEnd: () => void) => {
  const [count, setCount] = useState<number>(initialTime);
  const [isActive, setIsActive] = useState<boolean>(true);

  const restartCountdown = (newCount: number) => {
    setCount(newCount);
    setIsActive(true);
  }

  const stopCountdown = () => {
    setIsActive(false);
  }

  useEffect(() => {
    if (isActive) {
      if (count > 0) {
        const timer = setTimeout(() => setCount(prevCount => prevCount - 0.1), 100); // Decrement by 0.1 every 100ms
        return () => clearTimeout(timer);
      } else {
        onCountdownEnd(); // Notify parent component when countdown ends
        setIsActive(false);
      }
    }
  }, [count, isActive]);

  return {
    count,
    restartCountdown,
    stopCountdown
  };
};

export default useCountdown;