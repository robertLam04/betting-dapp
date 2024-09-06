import { ethers } from 'ethers';
import React, { useState } from 'react'

interface InviteProps {
  inviteAddress: ethers.AddressLike;
  setInviteAddress: React.Dispatch<React.SetStateAction<ethers.AddressLike>>;
  wager: number;
  setWager: React.Dispatch<React.SetStateAction<number>>;
  onAddInvite: () => void;
  onInviteSubmit: (invite: ethers.AddressLike) => Promise<boolean>;
  onWagerSubmit: (wager: number) => Promise<boolean>;
}

const PlaceInvite: React.FC<InviteProps> = ({ inviteAddress, setInviteAddress, wager, setWager, onAddInvite, onInviteSubmit, onWagerSubmit }) => {

  const [addressMessage, setAddressMessage] = useState<string>('');
  const [wagerMessage, setWagerMessage] = useState<string>('');
  const [addressSubmitted, setAddressSubmitted] = useState<boolean>(false);
  const [wagerSubmitted, setWagerSubmitted] = useState<boolean>(false);

  const handleChangeAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (ethers.isAddress(value)) {
      setInviteAddress(value);
    }
  }

  const handleSubmitAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inviteAddress) {
      const success = await onInviteSubmit(inviteAddress);
      if (success) {
        setAddressSubmitted(true);
        //Add invite to the google sheet
        onAddInvite();
        setAddressMessage("Address: " + inviteAddress);
      } else {
        setAddressMessage("The invited account has insufficient funds");
      }
    } else {
      setAddressMessage("Please enter a valid Ethereum address");
    }
  };

  const handleChangeWager = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (isPosRealNum(value)) {
      setWager(Number.parseFloat(value));
    }
  }

  const handleSubmitWager = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (wager != 0) {
      const success = await onWagerSubmit(wager);
      if (success) {
        setWagerSubmitted(true);
        setWagerMessage("Wager: " + wager.toString());
      } else {
        setWagerMessage("Your account has insufficient funds");
      }
    } else {
      setWagerMessage("Please enter a valid wager");
    }
  };

  const isPosRealNum = (value: string): boolean => {
    const regex = /^(?!0(\.0+)?$)(?:[1-9]\d*|0?\.\d*[1-9]\d*)$/;
    return regex.test(value);
  }

  return (
    <div>
      <div>

        {!wagerSubmitted &&
        <form className="wager_invite" onSubmit={handleSubmitWager}>
          <input type="text" id="wager" name="wager" onChange={handleChangeWager} required></input>
          <button className="button" type="submit">Submit Wager</button>
        </form>}

        <p>{wagerMessage}</p>

      </div>
      <div>
        {!addressSubmitted && wagerSubmitted &&
        <form className="input_address" onSubmit={handleSubmitAddress}>
          <input type="text" id="address" name="address" onChange={handleChangeAddress} required></input>
          <button className="button" type="submit">Submit Address</button>
        </form>}
        
      <p>{addressMessage}</p>
      </div>
    </div>
  )
}

export default PlaceInvite;