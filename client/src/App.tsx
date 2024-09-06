import React, { useEffect, useState } from 'react';
import './App.css';
import { ethers } from 'ethers';
import abi from '../../artifacts/contracts/timing_game.sol/timing_game.json';
import AccountBlockie from './components/AccountBlockie';
import SoloGame from './components/SoloGame';
import DuoGame from './components/DuoGame';

const App: React.FC = () => {
  const [account, setAccount] = useState<ethers.AddressLike>(ethers.ZeroAddress);
  const [state, setState] = useState<{ provider: ethers.BrowserProvider, signer: ethers.Signer, contract: ethers.Contract }>();
  const [ownerContract, setOwnerContract] = useState<ethers.Contract>();

  const connectToMetaMask = async () => {
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    const contractABI = abi.abi;

    try {
      if (!window.ethereum) {
        console.error('MetaMask is not installed');
        return;
      }

      const ethereum = window.ethereum as any;
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const account: ethers.AddressLike = accounts[0];
      setAccount(account);

      ethereum.on('accountsChanged', () => {
        window.location.reload();
      });

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const userContract = new ethers.Contract(contractAddress, contractABI, signer);
      
      setState({ provider, signer, contract: userContract });
      return { provider, signer, contract: userContract };
    } catch (error) {
      console.error('Error accessing MetaMask:', error);
    }
  };

  const connectOwnerContract = async (provider: ethers.BrowserProvider) => {
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    const contractABI = abi.abi;

    const ownerKey: string | undefined = import.meta.env.VITE_PRIVATE_KEY;
    if (!ownerKey) {
      console.error('Owner private key is not defined');
      return;
    }

    const ownerWallet = new ethers.Wallet(ownerKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, ownerWallet);
    setOwnerContract(contract);
  };

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

  return (
    <div className="App unselectable">
      <h1>ReactionRoullete.eth</h1>
      <AccountBlockie address={account} />
      {!account && <p>Please connect your wallet through MetaMask</p>}
      {account && state && ownerContract && (
        //<SoloGame accountAddress={account} contract={state.contract} ownerContract={ownerContract} />
        <DuoGame accountAddress={account} provider={state.provider} contract={state.contract} ownerContract={ownerContract}></DuoGame>
        //<TestInviteMap></TestInviteMap>
      )}
    </div>
  );
}

export default App;