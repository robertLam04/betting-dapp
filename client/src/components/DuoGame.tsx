import React, { useEffect, useState } from 'react'
import { ethers } from 'ethers';
import { GameProps } from './SoloGame';
import PlaceInvite from './PlaceInvite';
import AcceptInvite from './AcceptInvite';
import useInviteMap from '../hooks/useInviteMap';
import ReactionTime from './ReactionTime';

export interface GameInvite {
  fromAddress: ethers.AddressLike;
  toAddress: ethers.AddressLike;
  wager: number;
  nonce: number;
  signature?: string;
  //0 - invite pending, 1 - game commited, 2 - game started, 3 - game over
  status?: number;
}

enum gameState {
  inviteSent,
  gameCommited,
  depositInProgress,
  depositSent,
  gameReady,
  gameStarted,
  gameOver,
}

const DuoGame: React.FC<GameProps> = ({ contract, ownerContract, accountAddress, provider }) => {

  //Invitations state variables
  const [inviteAddress, setInviteAddress] = useState<ethers.AddressLike>(ethers.ZeroAddress);
  const [wager, setWager] = useState<number>(0);

  //Control flow state variables
  const [gameState, setGameState] = useState<gameState>()
  const [gameCommited, setGameCommited] = useState<boolean>(false);
  const [depositInProgress, setDepositInProgress] = useState<boolean>(false);
  const [metaMaskPrompting, setMetaMaskPrompting] = useState<boolean>(false);
  const [depositSent, setDepositSent] = useState<boolean>(false);
  const [gameStarted, setGameStarted] =  useState<boolean>(false);
  const [inviteSent, setInviteSent] = useState<boolean>(false);
  
  const [winner, setWinner] = useState<ethers.AddressLike>();

  const { addInvite, updateStatus, getNonce, getInvites } = useInviteMap();

  const onInviteSubmit = async (inviteAddress: ethers.AddressLike): Promise<boolean> => {
    const isValidOpponent = async (inviteAddress: ethers.AddressLike): Promise<boolean> => {
      const opponentBalance = await provider.getBalance(inviteAddress);
      const balanceInEth = parseFloat(ethers.formatUnits(opponentBalance, 18));
  
      if (balanceInEth >= wager && wager > 0) {
        return true;
      }
  
      return false;
    }
    
    const valid = await isValidOpponent(inviteAddress);
    if (valid && ethers.isAddress(accountAddress)) {
      setInviteAddress(inviteAddress);
      return true;
    } else {
      return false;
    }
  }

  const onWagerSubmit = async (wager: number): Promise<boolean> => {
    const isValidWager = async (wager: number): Promise<boolean> => {
      const accountBalance = await provider.getBalance(accountAddress);
      const balanceInEth = parseFloat(ethers.formatUnits(accountBalance, 18));
  
      if (balanceInEth >= wager && wager > 0) {
        return true;
      }
  
      return false;
    }

    const valid = await isValidWager(wager);
    if (valid) {
      setWager(wager)
      return true;
    } else {
      setWager(0);
      return false;
    }
  };

  const onSendInvite = async () => {
    const nonce = await getNonce();

    if (!nonce) {
      throw new Error("Failed to retrieve nonce. Cannot proceed with the invite.");
    }

    const commitHash = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256"],
      [accountAddress, inviteAddress, ethers.parseEther(wager.toString()), nonce]
    )

    const signer = await provider.getSigner();
    setMetaMaskPrompting(true);
    const signature = await signer.signMessage(ethers.getBytes(commitHash));
    setMetaMaskPrompting(false);

    const inv: GameInvite = {
      fromAddress: accountAddress,
      toAddress: inviteAddress,
      wager: wager,
      nonce: nonce,
      signature: signature
    };

    //Check signature
    const recoveredAddress = ethers.verifyMessage(commitHash, signature);
    console.log("Signer Address", accountAddress);
    console.log("Recovered Address:", recoveredAddress);
    
    const addInviteResponse = addInvite(inv);
    setInviteSent(true);
    
    console.log('Invite response:', addInviteResponse);

  };

  const onAcceptInvite = async (invite: GameInvite) => {
    //Make sure the addresses make sense (toAddress = accountAddress)
    console.log("Invite:", invite);

    const wagerInWei = ethers.parseEther(invite.wager.toString());

    const commitHash = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256"],
      [invite.fromAddress, invite.toAddress, wagerInWei, invite.nonce]
    )

    const signer = await provider.getSigner();
    setMetaMaskPrompting(true);
    const acceptorSignature = await signer.signMessage(ethers.getBytes(commitHash)).finally(()=> {
      setMetaMaskPrompting(false)
    });
    console.log("Invite:", invite);

    //Commit the game to the blockchain and prompt players (using an event) to deposit eth
    const commitGame = await ownerContract.commitGame(
      invite.fromAddress,
      invite.toAddress,
      wagerInWei,
      invite.nonce,
      invite.signature,
      acceptorSignature
    );

    const receipt = await commitGame.wait();
    console.log('Commit Game Receipt:', receipt);
    
  }

  //For debugging
  const resetCommittedGame = async () => {
    const receipt = await ownerContract.resetCommittedGame(accountAddress);
    console.log("Uncommited game:", receipt);
  }

  const withdraw = async () => {
    const receipt = await contract.withdraw();
    console.log("Withdrawal:", receipt);
  }

  const onGameOver = async (reactionTime : number): Promise<number | undefined> => {

    //Get the reaction time of the opponent from backend - if this address won call payout

    const payoutPromise = new Promise<number>((resolve) => {
      const handlePayoutEvent = (prize: number, winner: string) => {
        console.log('Prize:', prize.toString());
        console.log('Winner:', winner);
        ownerContract.off('BetResolved', handlePayoutEvent);
        resolve(prize);
      };
      ownerContract.on('BetResolved', handlePayoutEvent);
    });

    const resolveBet = await ownerContract.resolveBet(winner);
    const receipt = await resolveBet.wait();
    console.log('Transaction successful:', receipt);

    return await payoutPromise;
  };

 
  useEffect(() => {
    const handleGameCommitted = async (challenger: ethers.AddressLike, acceptor: ethers.AddressLike, wager: number, nonce: number) => {
      if (depositInProgress) {
        console.log("Deposit already in progress");
        return;
      }
      
      setGameCommited(true);
      
      //Update status in backend
      const inv: GameInvite = {
        fromAddress: challenger,
        toAddress: acceptor,
        wager: wager,
        nonce: nonce,
        status: 1
      };
      updateStatus(inv);
    
      challenger = challenger.toString().toLowerCase();
      acceptor = acceptor.toString().toLocaleLowerCase();
    
      if (accountAddress == challenger || accountAddress == acceptor) {
        setMetaMaskPrompting(true);
        setDepositInProgress(true);
        
        try {
          //Need to set a higher manual gas limit otherwise it runs out of gas
          const gasEstimate = 100000;
          const deposit = await contract.deposit({
            value: wager, gasLimit: gasEstimate
          });
          const receipt = await deposit.wait();
          console.log("Deposit sent:", receipt);
        } catch (error) {
          console.error("Deposit failed:", error);
        } finally {
          setMetaMaskPrompting(false);
          setDepositInProgress(false);
        }
      }
    };
    
    const handlePaymentTransfered = async (amount: number, sender: ethers.AddressLike) => {
      sender = sender.toString().toLowerCase();
      if (sender == accountAddress) {
        setDepositSent(true);
        console.log("Deposit event emmitted:", sender, amount);
      }
    }

    const handleGameReady = async (player1: ethers.AddressLike, player2: ethers.AddressLike, wager: number, nonce: number) => {
      setGameStarted(true);
      console.log("Game ready event emmitted:", player1, player2);
    }

    //Listen for events
    contract.on('NewGameCommitted', handleGameCommitted);
    contract.on('PaymentTransfered', handlePaymentTransfered);
    contract.on('GameReady', handleGameReady);

  }, []);

  //Need to make this one state variable enum
  if (metaMaskPrompting) {
    return (
      <div>
        <h5>
          Please interact with MetaMask
        </h5>
      </div>
    )

  } else if (gameCommited) {
    return (
      <div>
        {!depositSent && <h5>
          Game committed. Please send your deposit via MetaMask.
        </h5>}
        {depositSent && <h5>
          Game committed. Your deposit has been submitted. Awaiting oppponent's deposit.
        </h5>}
        <button onClick={resetCommittedGame} className="button" type="submit"> Uncommit Game</button>
        <button onClick={withdraw} className="button" type="submit">Withdraw</button>
      </div>
    )
  } else if (gameStarted) {
    return (
      <div>
        <ReactionTime onGameOver={onGameOver}></ReactionTime>
      </div>
    )
  } else {
    return (
      <div>
        <PlaceInvite
         wager={wager} setWager={setWager}
         inviteAddress={inviteAddress} setInviteAddress={setInviteAddress}
         onAddInvite={onSendInvite} 
         onInviteSubmit={onInviteSubmit} 
         onWagerSubmit={onWagerSubmit}>
        </PlaceInvite>
  
        <AcceptInvite accountAddress={accountAddress} onAcceptInvite={onAcceptInvite}></AcceptInvite>
  
      </div>
    )

  }
  
}

export default DuoGame