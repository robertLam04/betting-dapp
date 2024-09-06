import React, { useState } from 'react';
import { ethers } from 'ethers';
import Wager from './Wager';
import Countdown from './Countdown';
import ReactionTime from './ReactionTime';

export interface GameProps {
  accountAddress: ethers.AddressLike;
  provider: ethers.BrowserProvider;
  contract: ethers.Contract;
  ownerContract: ethers.Contract;
}

const SoloGame: React.FC<GameProps> = ({ accountAddress, contract, ownerContract }) => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [wagerSubmitted, setWagerSubmitted] = useState<boolean>(false);
  const [countdownComplete, setCountdownComplete] = useState<boolean>(false);

  const handleReady = () => setIsReady(true);
  const handleCountdownEnd = () => setCountdownComplete(true);

  const onWagerSubmit = async (wager: string): Promise<number | undefined> => {
    const wagerPromise = new Promise<number>((resolve) => {
      const handleBetEvent = (wager: number, from: string) => {
        console.log('Wager:', wager.toString());
        console.log('From:', from);
        contract.off('newBetPlaced', handleBetEvent);
        setWagerSubmitted(true);
        resolve(wager);
      };
      contract.on('newBetPlaced', handleBetEvent);
    });

    const amount = { value: ethers.parseEther(wager) };
    const placeBet = await contract.placeBet(amount);
    const receipt = await placeBet.wait();
    console.log('Transaction successful:', receipt);
    
    return await wagerPromise;
  };

  const handlePayouts = async (): Promise<number | undefined> => {
    const payoutPromise = new Promise<number>((resolve) => {
      const handlePayoutEvent = (prize: number, winner: string) => {
        console.log('Prize:', prize.toString());
        console.log('Winner:', winner);
        ownerContract.off('BetResolved', handlePayoutEvent);
        resolve(prize);
      };
      ownerContract.on('BetResolved', handlePayoutEvent);
    });

    const resolveBet = await ownerContract.resolveBet(accountAddress);
    const receipt = await resolveBet.wait();
    console.log('Transaction successful:', receipt);

    return await payoutPromise;
  };

  return (
    <div>
      {!isReady && (
        <>
          <p>Enter your wager (in ETH)</p>
          <Wager onWagerSubmit={onWagerSubmit} />
        </>
      )}
      {!isReady && wagerSubmitted && (
        <button className="ready-button" onClick={handleReady}>Ready</button>
      )}
      {!countdownComplete && isReady && (
        <Countdown time={3} onCountdownEnd={handleCountdownEnd} />
      )}
      {countdownComplete && (
        <ReactionTime handlePayouts={handlePayouts} />
      )}
    </div>
  );
}

export default SoloGame;