import { run, network } from "hardhat";

const verify = async () => {
  if (network.name !== "hardhat") {
    console.log("Verifying contract source on blockchain scan ...");
    await run("verify:verify", {
      address: "0x0Ae7A99b492B2064856e1b072fdeD6653785D7D9",
      constructorArguments: [],
    });
    console.log("Verified Contract 1/3: MasterFacet");

    await run("verify:verify", {
        address: "0xf2fFd482656BaF4f77A6EdA67dBb58Fbef85305A",
        constructorArguments: [],
      });
    console.log("Verified Contract 2/3: FundFacet");
    await run("verify:verify", {
        address: "0x5C8f21F6Ac84BBd679F55eE0bfa158705084ff07",
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
