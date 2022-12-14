import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import * as dotenv from "dotenv";
dotenv.config();

const {
  API_URL_MUMBAI,
  API_URL_OPTIMISM,
} = process.env;


const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    // Ethereum environmentns
    // Binance chain
    bnb_testnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    bsc_mainnet: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    mumbai: {
      url: API_URL_MUMBAI,
      //@ts-ignore
      accounts: [process.env.PRIVATE_KEY]
    },
    fantom_testnet:{
      url: "https://rpc.testnet.fantom.network",
      chainId: 4002,
       //@ts-ignore
      accounts: [process.env.PRIVATE_KEY]
    },
    optimism_testnet: {
      url: API_URL_OPTIMISM,
       //@ts-ignore
      accounts: [process.env.PRIVATE_KEY],
      chainId: 420
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSC_TESTNET_ETHERSCAN_API_KEY ?? "",
      polygonMumbai: process.env.POLYGON_MUMBAI_ETHERSCAN_API_KEY ?? "",
      ftmTestnet: process.env.FTM_TESTNET_ETHERSCAN_API_KEY ?? "",
    },
  },
};

export default config;
