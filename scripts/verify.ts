import { run, network } from "hardhat";

const verify = async () => {
  if (network.name !== "hardhat") {
    console.log("Verifying contract source on blockchain scan ...");
    await run("verify:verify", {
      address: "0xaa674a51E08a798EC9ED7bB47e7bb63E1b282f55",
      constructorArguments: [],
    });
    console.log("Verified Contract 1/3: MasterFacet");

    await run("verify:verify", {
        address: "0x4791578d50204e49a7e28066D6C1B55e4484bcBb",
        constructorArguments: [],
      });
    console.log("Verified Contract 2/3: FundFacet");
    await run("verify:verify", {
        address: "0xa389b3fBa8bD3342787F48c82567c7ED1730B3A5",
        constructorArguments: [],
      });
    console.log("Verified Contract 3/3: RewardFacet");
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
