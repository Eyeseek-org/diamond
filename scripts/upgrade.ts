import { ethers } from "hardhat";

import { FacetCutAction } from "../scripts/libraries/diamond";
import { constants } from "ethers";

const DIAMOND_ADDRESS = "";

// List of function selectors
// eg. ["balanceOf(address)", "transferFrom(address,address,uint256)"]
const FUNCTIONS_TO_REMOVE: string[] = [];

// List of function selectors + facet addresses
// eg. [{ facetAddress: "0x123...", functions: ["balanceOf(address)", "transferFrom(address,address,uint256)"] }]
const FUNCTIONS_TO_ADD: { facetAddress: string; functions: string[] }[] = [];

const upgradeDiamond = async (
  diamondAddress: string,
  functionsToRemove: string[],
  functionsToAdd: { facetAddress: string; functions: string[] }[]
) => {
  const diamondCutFacet = await ethers.getContractAt(
    "DiamondCutFacet",
    diamondAddress
  );

  await diamondCutFacet.diamondCut(
    [
      {
        facetAddress: constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: functionsToRemove,
      },
      ...functionsToAdd.map((x) => ({
        facetAddress: x.facetAddress,
        action: FacetCutAction.Add,
        functionSelectors: x.functions,
      })),
    ],
    constants.AddressZero,
    "0x"
  );
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  upgradeDiamond(DIAMOND_ADDRESS, FUNCTIONS_TO_REMOVE, FUNCTIONS_TO_ADD)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { upgradeDiamond };
