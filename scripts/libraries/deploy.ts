/* eslint prefer-const: "off" */
import { ethers } from "hardhat";
import { getSelectors, FacetCutAction } from "./diamond";

async function deployDiamond(
  facetNames: string[] = [],
  usdcAddress: string = ethers.constants.AddressZero,
  usdtAddress: string = ethers.constants.AddressZero
): Promise<[string, string[], any[]]> {
  const accounts = await ethers.getSigners();
  const contractOwner = accounts[0];

  // Deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded or deployed to initialize state variables
  // Read about how the diamondCut function works in the EIP2535 Diamonds standard
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.deployed();

  // Deploy facets and set the `facetCuts` variable
  console.log("Deploying facets");
  const FacetNames = [
    "DiamondCutFacet",
    "DiamondLoupeFacet",
    "OwnershipFacet",
    ...facetNames,
  ];
  // The `facetCuts` variable is the FacetCut[] that contains the functions to add during diamond deployment
  const facetCuts = [];
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    console.log(`${FacetName} deployed: ${facet.address}`);
    facetCuts.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }

  // Creating a function call
  // This call gets executed during deployment and can also be executed in upgrades
  // It is executed with delegatecall on the DiamondInit address.
  let functionCall = diamondInit.interface.encodeFunctionData("init");

  // Setting arguments that will be used in the diamond constructor
  const diamondArgs = {
    owner: contractOwner.address,
    init: diamondInit.address,
    initCalldata: functionCall,
  };

  // deploy Diamond
  const Diamond = await ethers.getContractFactory("Funding");
  const diamond = await Diamond.deploy(
    facetCuts,
    diamondArgs,
    usdcAddress,
    usdtAddress
  );
  await diamond.deployed();
  console.log();
  console.log("Diamond deployed:", diamond.address);

  // returning the address of the diamond
  return [
    diamond.address,
    facetCuts.map((x) => x.facetAddress),
    [facetCuts, diamondArgs, usdcAddress, usdtAddress],
  ];
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { deployDiamond };
