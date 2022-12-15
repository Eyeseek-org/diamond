# Eyeseek funding contracts

This directory contains the contracts for the Eyeseek crowdfunding system. Created with Hardhat.

Eyeseek is using [Diamond multi-facet proxy](https://eips.ethereum.org/EIPS/eip-2535) architecture.   
The architecture is slightly more complex to absorb then regular Solidity patterns, but come with huge benefits:
- Extended contract size and functionality 
- Upgradability
- Separation of logical layer and storage layer


## Project setup

```
git clone https://github.com/Eyeseek-org/diamond
npm install
```

Env variables contain blockchain explorer API keys to verify contracts

## Deploying Diamond and Upgrading Facets

**Deploying**
- In `./scripts/deploy.ts` make sure to update the values of `USDC_ADDRESS` and `USDT_ADDRESS` to the correct addresses for the network being deployed to.
- Run the deploy script with `npx hardhat run scripts/deploy.ts --network {NETWORK}`
This will initialize the initial diamond with the following facets: 
`DiamondCutFacet` - facet to add/remove facets
`DiamondLoupeFacet` - facet to query diamond info
`OwnershipFacet` - facet to transfer ownership of the diamond
`MasterFacet` - the main facet that contains the logic across the app
`RewardFacet` - the facet that contains the logic for the reward system - Create reward
`FundFacet` - the facet that contains the logic for the funding system - Create new project, Display project info, Return microfund balances

Contract functions cannot be interacted via classic blockchain explorers like etherscan, [Louper](https://louper.dev) is needed to use on any network for
- Quick contract testing
- Exporting abi for the frontend

**Upgrading**

1. _Upgrade the diamond_
   In `./scripts/upgrade.ts` edit the values of `DIAMOND_ADDRESS`, `FUNCTIONS_TO_REMOVE` and `FUNCTIONS_TO_ADD` to correctly list what should be removed and what should be added.
   Then run the upgrade script with `npx hardhat run ./scripts/upgrade.ts --network {NETWORK}`.

**References**
[Awesome Diamonds](https://github.com/mudgen/awesome-diamonds)