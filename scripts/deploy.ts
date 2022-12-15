import { run, network } from "hardhat";
import { deployDiamond } from "./libraries/deploy";

const USDC_ADDRESS = "0x027FC11f7cB537F180aD46186CDc382A353e6E15";
const USDT_ADDRESS = "0xce754458108142F620d78604a1ea892212f3DC94";

  /// Polygon testnet deployment
   //const DonatorDeploy = await Donator.deploy("0x027FC11f7cB537F180aD46186CDc382A353e6E15", "0xce754458108142F620d78604a1ea892212f3DC94", "");

  /// BNB testnet deployment
  // const DonatorDeploy = await Donator.deploy("0x1EB85995c4a81a61EA4Ff7F5F2e84C20C9F590Ec", "0xc4932a9D0dD42aB445d1801bCbae0E42B47F22a0", "");

  /// Fantom testnet deployment
  //  const DonatorDeploy = await Donator.deploy("0x7383cC34B3eC68C327F93f9607Ea54b3D3B76dEe", "0x49bC977a4c5428F798cc136FCB3f5C1117BE0b6f", "");

  /// Optimism testnet deployment
  //const DonatorDeploy = await Donator.deploy("0x71994687371a3AaDc3FfD32366EF349cAb8306Af", "0x1fB4F306500CcCFbD92156c0790FE1d312a362E1", "")

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

if (require.main === module) {
  deploy()
    .then(() => process.exit(0))
    .catch((error: any) => {
      console.error(error);
      process.exit(1);
    });
}
