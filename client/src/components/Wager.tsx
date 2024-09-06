import React, { useState } from 'react'
import './styles.css'
import { ethers } from 'ethers';

interface WagerProps {
  onWagerSubmit: (wager: string) => Promise<number | undefined>;
}

const Wager: React.FC<WagerProps> = ({ onWagerSubmit }) => {

  const [wager, setWager] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const isPosInteger = (value: string): boolean => {
    const regex = /^(?!0(\.0+)?$)(?:[1-9]\d*|0?\.\d*[1-9]\d*)$/;
    return regex.test(value);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent the default form submission behavior
    if (wager) {
      setLoading(true);
      const wagerOnChain = await onWagerSubmit(wager);
      setLoading(false);
      if (!wagerOnChain) {
        setMessage('Transaction failed');
        return;
      } else {
        setMessage(`Transaction successful. You wagered ${ethers.formatEther(wagerOnChain)} ETH`);
        return;
      }
    } else {
      setMessage('Please enter a positive integer');
      return;
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (isPosInteger(value)) {
      setWager(value);
    } else {
      setWager(null);
    }
  }

  return (
    <div>
      <form className="input_wager" onSubmit={handleSubmit}>
        <input type="text" id="wager" name="wager" onChange={handleChange} required></input>
        <button className="button" type="submit">Submit Wager</button>
      </form>
      {loading && <p>Please sign your transaction in MetaMask...</p>}
      {message && <p>{message}</p>}
    </div>
  )
}

export default Wager