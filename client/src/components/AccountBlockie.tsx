import React, { useEffect } from 'react';
import makeBlockie from 'ethereum-blockies-base64';
import notConnectedImg from '../assets/not_connected.png';
import './styles.css';
import { ethers } from 'ethers';

//Or just make an actual address class

const AccountBlockie: React.FC<{address: ethers.AddressLike}> = ({ address }) => {

  useEffect(() => {
    const imgContainer = document.getElementById('blockie-container');
    if (imgContainer) {
      const img = new Image()
      img.src = makeBlockie(address.toString());
      imgContainer.innerHTML = '';
      imgContainer.appendChild(img); 
    }
  }, [address]);

  return (
    <div className='account'>
      <div id='blockie-container' className='blockie-container'></div>
      {address && (
        <div className='address-tooltip'>
          {address.toString()}
        </div>
      )}
    </div>
  )
}

export default AccountBlockie;