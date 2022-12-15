# Eyeseek funding contracts

This directory contains the contracts for the Eyeseek crowdfunding system. Created with Hardhat.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```

## Setup Enviroment Variables

Copy the dotenv template file `.env.example` to `.env`

```shell
cp .env.example .env
```

And add your details to `.env`.

## Deploying Diamond and Upgrading Facets

**Deploying**
In `./scripts/deploy.ts` make sure to update the values of `USDC_ADDRESS` and `USDT_ADDRESS` to the correct addresses for the network being deployed to.
Run the deploy script with `npx hardhat run ./scripts/deploy.ts --network {NETWORK}`.
This will initialize the initial diamond with the following facets: `DiamondCutFacet`, `DiamondLoupeFacet`, `OwnershipFacet`.

**Upgrading**

1. _Deploy new facet contracts_
   If adding new facets, in `./scripts/deployNewFacets.ts` edit `FACET_NAMES` to be the list of facet contract names that to be deployed.
   Then deploy the new facets by running `npx hardhat run ./scripts/deployNewFacets.ts --network {NETWORK}`.

2. _Upgrade the diamond_
   In `./scripts/upgrade.ts` edit the values of `DIAMOND_ADDRESS`, `FUNCTIONS_TO_REMOVE` and `FUNCTIONS_TO_ADD` to correctly list what should be removed and what should be added.
   Then run the upgrade script with `npx hardhat run ./scripts/upgrade.ts --network {NETWORK}`.
