import { run, network } from "hardhat";

const verify = async () => {
  if (network.name !== "hardhat") {
    console.log("Verifying contract source on blockchain scan ...");    await run("verify:verify", {
      address: "0x41D23265058570FDE5b00684AE397a473bF7419C",
      constructorArguments: [],
    });
  console.log("Verified Contract 3/3: RewardFacet");
    await run("verify:verify", {
      address: "0xcd10DAFC13289f84478F8B4aA113f22a929aF7c9",
      constructorArguments: [],
    });
    console.log("Verified Contract 1/3: MasterFacet");

    await run("verify:verify", {
        address: "0xceA9b96592aAc92BF34736a50230ef71A50eaD3c",
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
