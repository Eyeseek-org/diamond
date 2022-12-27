import { run, network } from "hardhat";

const verify = async () => {
  if (network.name !== "hardhat") {
    console.log("Verifying contract source on blockchain scan ...");    await run("verify:verify", {
      address: "0x1dfc6da91CD8c05F3401642061De296E8Be1F97D",
      constructorArguments: [],
    });
  console.log("Verified Contract 3/3: RewardFacet");
    await run("verify:verify", {
      address: "0x25A05fba4C20667f58dF58f88F07B7DF21a8CD43",
      constructorArguments: [],
    });
    console.log("Verified Contract 1/3: MasterFacet");

    await run("verify:verify", {
        address: "0xCA71C35AEC44c877AdA9Fbc3e61Baf076523c023",
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
