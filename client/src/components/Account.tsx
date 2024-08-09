import React, { useEffect } from 'react';
import makeBlockie from 'ethereum-blockies-base64';
import notConnectedImg from '../assets/not_connected.png';
import './styles.css';

interface AccountProps {
  address: string | undefined;
}

const Account: React.FC<AccountProps> = ({ address }) => {

  useEffect(() => {
    const imgContainer = document.getElementById('blockie-container');
    if (imgContainer) {
      const img = new Image();
      if (address) {
        img.src = makeBlockie(address);
      } else {
        img.src = notConnectedImg;
      }
      imgContainer.innerHTML = '';
      imgContainer.appendChild(img); 
    }
  }, [address]);

  return (
    <div className='account'>
      <div id='blockie-container' className='blockie-container'></div>
      {address && (
        <div className='address-tooltip'>
          {address}
        </div>
      )}
    </div>
  )
}

export default Account;