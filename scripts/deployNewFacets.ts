import { run, network, ethers } from "hardhat";

// List of facet contract names
const FACET_NAMES: string[] = ["FundFacet", "RewardFacet", "MasterFacet"];

const deploy = async (facetNames: string[]) => {
  const addresses = [];
  for (const FacetName of facetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    addresses.push(facet.address);
    console.log(`${FacetName} deployed: ${facet.address}`);
    // if (network.name !== "hardhat") {
    //   console.log(`Verifing ${FacetName} Contract ...`);
    //   await run("verify:verify", {
    //     address: FacetName,
    //     constructorArguments: [],
    //   });
    //   console.log(`Verified ${FacetName}`);
    // }
  }
  console.log("Done");
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deploy(FACET_NAMES)
    .then(() => process.exit(0))
    .catch((error: any) => {
      console.error(error);
      process.exit(1);
    });
}
