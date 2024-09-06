import React, { useEffect, useState } from 'react';
import useInviteMap from '../hooks/useInviteMap';
import { GameInvite } from './DuoGame';
import { ethers } from 'ethers';

interface AcceptInviteProps {
  accountAddress: ethers.AddressLike;
  onAcceptInvite: (invite: GameInvite) => void;
}

const AcceptInvite: React.FC<AcceptInviteProps> = ({ accountAddress, onAcceptInvite }) => {
  const { getInvites } = useInviteMap();
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(false); // State to control panel visibility

  // Function to handle the refresh button click
  const handleRefresh = async () => {
    try {
      const fetchedInvites = await getInvites(accountAddress.toString());
      setInvites(fetchedInvites || []); // Handle undefined
      console.log('Invites fetched:', fetchedInvites);
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };

  // Function to toggle the panel visibility
  const togglePanel = () => {
    setIsPanelVisible((prev) => !prev);
  };

  return (
    <div>
      <button
        className={`toggle-button ${isPanelVisible ? 'shifted' : ''}`}
        onClick={togglePanel}
        aria-label="Toggle Invites"
      >
        {isPanelVisible ? 'Hide' : 'Show'}
      </button>

      {isPanelVisible && (
        <div className="pop-out-panel">
          <div className="invites-list">
            <h3>Invites:</h3>
            <button className="button" type="submit" onClick={handleRefresh}>
              Refresh
            </button>
            <ul>
              {invites.length > 0 ? (
                invites.map((invite, index) => (
                  <li key={index} className="invite-item">
                    {`From: ${invite.fromAddress} Wager: ${invite.wager}`}
                    <button
                      className="accept-button"
                      onClick={() => onAcceptInvite(invite)}
                    >
                      Accept
                    </button>
                  </li>
                ))
              ) : (
                <p>No invites found</p>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcceptInvite;