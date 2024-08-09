import useCountdown from '../hooks/useCountdown';
import './styles.css'

interface countdownProps {
  onCountdownEnd: () => void;
  time: number;
}

const Countdown: React.FC<countdownProps> = ({ onCountdownEnd, time }) => {

  const { count } = useCountdown(time, onCountdownEnd);

  return (
    <div>
        <h2 className='countdown unselectable'>{Math.ceil(count)}</h2>
    </div>
  )
}

export default Countdown;