import React, { useEffect } from 'react'
import './styles.css'

interface TimerProps {
  startTimer: () => void;
  stopTimer: () => void;
  seconds: string;
  isRunning: boolean;
}

const Timer:React.FC<TimerProps> = ({ startTimer, stopTimer, seconds, isRunning }) => {

  useEffect(() => {
    startTimer();
    return () => {
      stopTimer();
    };
  }, []);

  return (
    <div>
      <p>{seconds}</p>
      {isRunning && <button className='button' onClick={stopTimer}>Stop</button>}
    </div>
  )
}

export default Timer