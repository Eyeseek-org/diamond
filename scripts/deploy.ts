import { run, network } from "hardhat";
import { deployDiamond } from "./libraries/deploy";

const USDC_ADDRESS = "";
const USDT_ADDRESS = "";

const deploy = async () => {
  const [address, facetAddresses, diamondConstructorArgs] = await deployDiamond(
    [],
    USDC_ADDRESS,
    USDT_ADDRESS
  );
  console.log("Diamond Deployed at:", address);

  if (network.name !== "hardhat") {
    console.log("Verifying contract source on Etherscan ...");

    await run("verify:verify", {
      address: facetAddresses[0],
      constructorArguments: [],
    });
    console.log("Verified Contract 1/4: DiamondCutFacet");
    await run("verify:verify", {
      address: facetAddresses[1],
      constructorArguments: [],
    });
    console.log("Verified Contract 2/4: DiamondLoupeFacet");
    await run("verify:verify", {
      address: facetAddresses[2],
      constructorArguments: [],
    });
    console.log("Verified Contract 3/4: OwnershipFacet");

    await run("verify:verify", {
      address,
      constructorArguments: diamondConstructorArgs,
    });
    console.log("Verified Contract 4/4: Funds Diamond");
    console.log("DONE VERIFICATION");
  }
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deploy()
    .then(() => process.exit(0))
    .catch((error: any) => {
      console.error(error);
      process.exit(1);
    });
}
