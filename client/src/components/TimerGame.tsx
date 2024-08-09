import React, { useEffect, useState } from 'react';
import Timer from './Timer';
import useTimer from '../hooks/useTimer';
import { ethers } from 'ethers';

interface GameProps {
  handlePayouts: () => Promise<number | undefined>;
}

const TimerGame: React.FC<GameProps> = ({ handlePayouts }) => {

  const { time, isSuccessful, startTimer, stopTimer, isRunning } = useTimer();
  const [payout, setPayout] = useState<string>();

  useEffect(() => {
    const processPayout = async () => {
      if (isSuccessful) {
        const payout = await handlePayouts();
        if (payout) {setPayout(ethers.formatEther(payout));}
      }
    };
  
    processPayout();
  }, [isSuccessful]);

  return (
    <div>
      <p className='text'>
        Stop the timer within 50 ms of 5 seconds and win!
      </p>
      <Timer
        startTimer={startTimer}
        stopTimer={stopTimer}
        seconds={time.toFixed(3)}
        isRunning={isRunning}
      />
      <p>{!isRunning && (isSuccessful ? 'You won' : 'You lost')}</p>
      {payout && <p>{payout.toString()} ETH has been transfered to your wallet</p>}
    </div>
  );
};

export default TimerGame;