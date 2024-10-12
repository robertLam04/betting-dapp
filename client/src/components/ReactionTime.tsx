import { useEffect, useState } from 'react';
import useCountdown from '../hooks/useCountdown';
import useTimer from '../hooks/useTimer';

interface ReactionTimeProps {
  onGameOver: (reactionTime: number) => Promise<number | undefined>;
}

const ReactionTime: React.FC<ReactionTimeProps> = ({ onGameOver }) => {
  const [countdownPaused, setCountdownPaused] = useState<boolean>(false);
  const [buttonMessage, setButtonMessage] = useState<string>('Click when turns green');
  const [reactionTime, setReactionTime] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
 
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
    const finalReactionTime = time * 1000;
    setReactionTime(finalReactionTime);
    setButtonMessage(`${finalReactionTime.toFixed(0)} ms`);
    setGameOver(true);

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
    if (gameOver) {
      onGameOver(reactionTime);
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
    </div>
  );
};

export default ReactionTime;