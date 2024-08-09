/*
End goal:
  - 1 v 1 reaction time betting game

Features (End Goal):
  - Single and 1v1 option
  - Back option
  - Log of previous bets, current bets, winning etc.
  - Invite option
  - Requests component to handle incoming invites

Reaction Time Component:
  - Press ready button -> countdown -> Red Box, starts another countdown
    with random time -> onCountDownEnd box turns green, starts timer. Click to stop timer
  - If click box prematurely, restart

MVP:
  - Connected to sepolia test net with INFURA
  - Request an account using MetaMask on starting dapp
  - Bet against yourself (reaction time)
  - Set up event listening
    - All data on chain that is displayed to the user should be directly from 
      events, not from front end (for data integrity, security etc.)

Features (MVP):
  - Connected / Not Connected visual component displaying blockie
    - On hover -> show address
  - Display wager and payout/loss based on event listening

  
Contract Address: 0xa0daB73241c2fEC1c31265554Ee94AD4a9416B58
Contract Owner: 0xF1bD8E707d86754696052e4E9945aC21ae330c4c

*/

import React, { useEffect, useState } from 'react';
import './App.css';
import Wager from './components/Wager';
import { ethers } from 'ethers';
import abi from '../../artifacts/contracts/timing_game.sol/timing_game.json';
import Account from './components/Account';
import Countdown from './components/Countdown';
import ReactionTimeGame from './components/ReactionTimeGame';

const App: React.FC = () => {

  const [isReady, setIsReady] = useState<boolean>(false);
  const [wagerSubmitted, setWagerSubmitted] = useState<boolean>(false);
  const [countdownComplete, setCountdownComplete] = useState<boolean>(false);
  const [account, setAccount] = useState<string>();
  const [state, setState] = useState<{ provider: ethers.BrowserProvider, signer: ethers.Signer, contract: ethers.Contract }>();
  const [ownerContract, setOwnerContract] = useState<ethers.Contract>();

  const handleReady = () => setIsReady(true);
  const handleCountdownEnd = () => setCountdownComplete(true);

  /**
 * Handles the wager submission by interacting with the smart contract.
 * 
 * Subscribes to the 'newBetPlaced' event and places a bet by calling the contract's `placeBet` method.
 * 
 * @param {string} wager - The amount to wager in Ether.
 * @returns {Promise<number | undefined>} 
 * A promise that resolves to the transaction receipt if successful, or undefined
 * if an error occurs or it reverts.
 * 
 */
  const handleWagerSubmit = async (wager: string): Promise<number | undefined> => {
    if (state) {
      const {contract} = state;

      const wagerPromise = new Promise<number>((resolve) => {
        const handleBetEvent = (wager: number, from: string) => {
          console.log('Wager:', wager.toString());
          console.log('From:', from);
          contract.off('newBetPlaced', handleBetEvent); // Unsubscribe from the event after it's handled
          setWagerSubmitted(true);
          //Completes the promise and makes 'wager' available to whatever is awaiting the promise
          resolve(wager);
        };
    
        contract.on('newBetPlaced', handleBetEvent);
      });

      const amount = {value: ethers.parseEther(wager)};
      const placeBet = await contract.placeBet(amount);
      const receipt = await placeBet.wait();

      console.log('Transaction successful:', receipt);
      
      const wagerOnChain = await wagerPromise;
      return wagerOnChain;
    }
  };

  const handlePayouts = async (): Promise<number | undefined> => {
    if (state && ownerContract) {
      //Subscribe to event
      const payoutPromise = new Promise<number>((resolve) => {
        const handlePayoutEvent = (prize: number, winner: string) => {
          console.log('Prize:', prize.toString());
          console.log('Winner:', winner);
          ownerContract.off('newBetPlaced', handlePayoutEvent); // Unsubscribe from the event after it's handled
          setWagerSubmitted(true);
          //Completes the promise and makes 'wager' available to whatever is awaiting the promise
          resolve(prize);
        };
    
        ownerContract.on('BetResolved', handlePayoutEvent);
      });

      const resolveBet = await ownerContract.resolveBet(account);
      const receipt = await resolveBet.wait();
      
      console.log('Transaction successful:', receipt);

      const payoutOnChain = await payoutPromise;
      return payoutOnChain;

    }
  }

  const connectToMetaMask = async () => {
    const contractAddress: string = "0xa0daB73241c2fEC1c31265554Ee94AD4a9416B58";
    const contractABI = abi.abi;

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        console.error('MetaMask is not installed');
        return;
      }

      const ethereum = window.ethereum as any;

      // Request accounts
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      console.log('Requested accounts:', accounts);
      setAccount(accounts[0]);

      // Listen for account changes and reload
      ethereum.on('accountsChanged', () => {
        window.location.reload();
      });

      const provider = new ethers.BrowserProvider(ethereum);
      const blockNumber = await provider.getBlockNumber();
      console.log('Connected to testnet. Current block number:', blockNumber);
      const signer = await provider.getSigner();

      const userContract = new ethers.Contract(contractAddress, contractABI, signer);

      console.log('provider:', provider);
      console.log('signer:', signer);
      console.log('contract:', userContract);

      return { provider, signer, contract: userContract };
    } catch (error) {
      console.error('Error accessing MetaMask:', error);
    }
  };

  const connectOwnerContract = async (provider: ethers.BrowserProvider) => {
    const contractAddress: string = "0xa0daB73241c2fEC1c31265554Ee94AD4a9416B58";
    const contractABI = abi.abi;

    const ownerKey: string | undefined = import.meta.env.VITE_PRIVATE_KEY;
    if (!ownerKey) {
      console.error('Owner private key is not defined');
      return;
    }

    const ownerWallet = new ethers.Wallet(ownerKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, ownerWallet);
    console.log(contract);
    setOwnerContract(contract);
  }

  useEffect(() => {
    const initialize = async () => {
      const metaMaskState = await connectToMetaMask();
      if (metaMaskState) {
        setState(metaMaskState);
        await connectOwnerContract(metaMaskState.provider);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    console.log('State updated:', state);
  }, [state]);

  useEffect(() => {
    console.log('Owner contract updated:', ownerContract)
  }, [ownerContract]);

  return (
    <div className="App unselectable">
      <h1>ReactionRoullete.eth</h1>
      <Account address={account} />
      {!account && (
        <p>Please connect your wallet through MetaMask</p>
      )}
      {account  && (
        <>
          <p>Enter your wager (in ETH)</p>
          <Wager onWagerSubmit={handleWagerSubmit}/>
        </>
      )}
      {!isReady && wagerSubmitted && account && (
        <button className="ready-button" onClick={handleReady}>Ready</button>
      )}
      {!countdownComplete && isReady && (
        <Countdown time={3} onCountdownEnd={handleCountdownEnd}></Countdown>
      )}
      <div className={'container'}>{countdownComplete && <ReactionTimeGame handlePayouts={handlePayouts}></ReactionTimeGame>}</div>
    </div>
    
  );
}

export default App;