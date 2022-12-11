import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSC_TESTNET_ETHERSCAN_API_KEY ?? "",
      polygonMumbai: process.env.POLYGON_MUMBAI_ETHERSCAN_API_KEY ?? "",
      ftmTestnet: process.env.FTM_TESTNET_ETHERSCAN_API_KEY ?? "",
    },
  },
};

export default config;
