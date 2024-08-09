import { useEffect, useState } from 'react';
import useCountdown from '../hooks/useCountdown';
import useTimer from '../hooks/useTimer';
import { ethers } from 'ethers';

interface GameProps {
  handlePayouts: () => Promise<number | undefined>;
}

const ReactionTimeGame: React.FC<GameProps> = ({ handlePayouts }) => {
  const [countdownPaused, setCountdownPaused] = useState<boolean>(false);
  const [buttonMessage, setButtonMessage] = useState<string>('Click when turns green');
  const [reactionTime, setReactionTime] = useState<number>();
  const [payout, setPayout] = useState<string>();
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>();
  const [loadingPayout, setLoadingPayout] = useState<boolean>(false);
 
  const onCountDownEnd = () => {
    setButtonMessage('Click!');
    startTimer();
  };

  const handleClick = () => {
    if (countdownPaused) {
      restartCountdown(getRandomValue());
      setCountdownPaused(false);
      setButtonMessage('Click when turns green')
      return;
    }

    //If button is still red, display something and restart the countdown
    if (!timerRunning) {
      stopCountdown();
      setButtonMessage('You clicked too early, click again to restart')
      setCountdownPaused(true);
      return;
    }

    stopTimer();
    setGameOver(true);
    setReactionTime(time * 1000);
    setButtonMessage((time * 1000).toFixed(0) + ' ms');

  }

  const getRandomValue = () => {
    const min = 2.0;
    const max = 7.0;
    const randomValue = Math.random() * (max - min) + min;
    return randomValue;
  };

  const startTime = getRandomValue();
  const {restartCountdown, stopCountdown} = useCountdown(startTime, onCountDownEnd);
  const {time, isRunning : timerRunning, startTimer, stopTimer} = useTimer();

  useEffect(() => {
    const processPayout = async () => {
      const payout = await handlePayouts();
      if (payout) {setPayout(ethers.formatEther(payout));}
      setLoadingPayout(false);
    };

    if (reactionTime && reactionTime <= 350.0) {
      setWon(true);
      setLoadingPayout(true);
      processPayout();
    } else {
      setWon(false);
    }

  }, [reactionTime]);

  return (
    <div>
      <p className='text'>
        Achieve a reaction time of 350 ms or better to win.
      </p>
      <button disabled={gameOver} onClick={handleClick} className={`ReactionTimeButton ${timerRunning ? 'green' : 'red'}`}>
        {buttonMessage}
      </button>
      {gameOver && won !== undefined ? (won ? <p>You won</p> : <p>You lost</p>) : null}
      {loadingPayout && <p>Seding ETH... please wait</p>}
      {gameOver && payout && <p>{payout.toString()} ETH has been transfered to your wallet</p>}
    </div>
  );
};

export default ReactionTimeGame;