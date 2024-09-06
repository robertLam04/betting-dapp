import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config({ path: './client/.env' });

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: process.env.VITE_INFURA_URL,
      accounts: [`0x${process.env.VITE_PRIVATE_KEY}`],
    },
  },
};

export default config;
