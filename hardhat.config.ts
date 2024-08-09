require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");
require("dotenv").config({ path: './client/.env' });

//MAY HAVE BROKEN THIS BY MOVING .env out of root

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: process.env.VITE_INFURA_URL,
      accounts: [`0x${process.env.VITE_PRIVATE_KEY}`]
    }
  }
};