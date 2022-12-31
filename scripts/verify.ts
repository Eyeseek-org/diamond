import { run, network } from "hardhat";

const verify = async () => {
  if (network.name !== "hardhat") {
    console.log("Verifying contract source on blockchain scan ...");    await run("verify:verify", {
      address: "0xb4a14B084A3F7B7A2f5039CD086641164790B9F6",
      constructorArguments: [],
    });
  console.log("Verified Contract 3/3: RewardFacet");
    await run("verify:verify", {
      address: "0xEf6d8731D1E51A30d22B928d04112fdB9bEb44e9",
      constructorArguments: [],
    });
    console.log("Verified Contract 1/3: MasterFacet");

    await run("verify:verify", {
        address: "0x39d273F226cCE96a354A9Dc1181922fd4C98bC99",
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
