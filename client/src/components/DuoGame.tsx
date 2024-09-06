import React, { useState } from 'react'
import { ethers } from 'ethers';
import { GameProps } from './SoloGame';
import PlaceInvite from './PlaceInvite';
import AcceptInvite from './AcceptInvite';
import useInviteMap from '../hooks/useInviteMap';
import { fromArrayBufferToHex } from 'google-auth-library/build/src/crypto/crypto';

/*
  Place an invite (wager and opponent must be valid) => 
  await invite accept/deny (expiry => on invite start countdown, delete invite after)
  Accept invite => both parties will be asked to sign in order to commit the game
  Winner is payed out after the game is complete.

  The notion of address should be typed either make my own or use ethers.address

*/

export interface GameInvite {
  fromAddress: ethers.AddressLike;
  toAddress: ethers.AddressLike;
  wager: number;
  nonce: number;
  signature: string;
}

const DuoGame: React.FC<GameProps> = ({ accountAddress, provider }) => {

  const [inviteAddress, setInviteAddress] = useState<ethers.AddressLike>(ethers.ZeroAddress);
  const [wager, setWager] = useState<number>(0);
  const [invitePlaced, setInvitePlaced] = useState<boolean>(false);
  const [inviteAccepted, setInviteAccepted] = useState<boolean>(false);

  const { addInvite, getNonce } = useInviteMap();

  const onInviteSubmit = async (inviteAddress: ethers.AddressLike): Promise<boolean> => {
    const valid = await isValidOpponent(inviteAddress);
    if (valid && ethers.isAddress(accountAddress)) {
      setInviteAddress(inviteAddress);
      return true;
    } else {
      return false;
    }
  }

  const onWagerSubmit = async (wager: number): Promise<boolean> => {
    const valid = await isValidWager(wager);
    if (valid) {
      setWager(wager)
      return true;
    } else {
      setWager(0);
      return false;
    }
  };

  const isValidOpponent = async (inviteAddress: ethers.AddressLike): Promise<boolean> => {
    const opponentBalance = await provider.getBalance(inviteAddress);
    const balanceInEth = parseFloat(ethers.formatUnits(opponentBalance, 18));

    if (balanceInEth >= wager && wager > 0) {
      return true;
    }

    return false;
  }

  const isValidWager = async (wager: number): Promise<boolean> => {
    const accountBalance = await provider.getBalance(accountAddress);
    const balanceInEth = parseFloat(ethers.formatUnits(accountBalance, 18));

    if (balanceInEth >= wager && wager > 0) {
      return true;
    }

    return false;
  }

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
    const signature = await signer.signMessage(commitHash);

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
    
    console.log('Invite response:', addInviteResponse);
    setInvitePlaced(true);

  };

  const onAcceptInvite = async (invite: GameInvite) => {
    //Make sure the addresses make sense (toAddress = accountAddress)
    console.log("Invite:", invite);
    const commitHash = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256"],
      [invite.fromAddress, invite.toAddress, ethers.parseEther(invite.wager.toString()), invite.nonce]
    )

    const signer = await provider.getSigner();
    const signature = await signer.signMessage(commitHash);

    //Commit the game to the blockchain and maybe add toSignature to sheets?
    
  }

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

export default DuoGame