import { run, network } from "hardhat";

const verify = async () => {
  if (network.name !== "hardhat") {
    console.log("Verifying contract source on blockchain scan ...");    await run("verify:verify", {
      address: "0x72aa64817A4fE2c3F56857890B6A8eeb78301112",
      constructorArguments: [],
    });
  console.log("Verified Contract 3/3: RewardFacet");
    await run("verify:verify", {
      address: "0x4c6fBBE7d38Fe7666299423175dEC8C49dcEE9fF",
      constructorArguments: [],
    });
    console.log("Verified Contract 1/3: MasterFacet");

    await run("verify:verify", {
        address: "0xf621721e12E9F55F23E4976851C669152a48001f",
        constructorArguments: [],
      });
    console.log("Verified Contract 2/3: FundFacet");

    console.log("DONE VERIFICATION");
  }
};

if (require.main === module) {
  verify()
    .then(() => process.exit(0))
    .catch((error: any) => {
      console.error(error);
      process.exit(1);
    });
}
