import { run, network } from "hardhat";

const verify = async () => {
  if (network.name !== "hardhat") {
    console.log("Verifying contract source on blockchain scan ...");    await run("verify:verify", {
      address: "0xB6A1a1b92f13676D5575B56A82Fd610747477686",
      constructorArguments: [],
    });
  console.log("Verified Contract 3/3: RewardFacet");
    await run("verify:verify", {
      address: "0x7eb38C49966A348060f62B942C1e4D87F4024AB7",
      constructorArguments: [],
    });
    console.log("Verified Contract 1/3: MasterFacet");

    await run("verify:verify", {
        address: "0xa4fa0C3224f60730f20F972eab781d7CCbe868cE",
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
