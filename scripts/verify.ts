import { run, network } from "hardhat";

const verify = async () => {
  if (network.name !== "hardhat") {
    console.log("Verifying contract source on blockchain scan ...");
    await run("verify:verify", {
      address: "0x1b5AEDC77D308E626791Eb9FFd9BDC83CB33A657",
      constructorArguments: [],
    });
    console.log("Verified Contract 1/3: FundFacet");

    await run("verify:verify", {
        address: "0x280ab3632BF734f8e3400841fFD1b4Aba864c89F",
        constructorArguments: [],
      });
    console.log("Verified Contract 2/3: RewardFacet");
    await run("verify:verify", {
        address: "0xE2DdFA72681DDe1916ad379AD2Df1Ca853b69074",
        constructorArguments: [],
      });
    console.log("Verified Contract 3/3: MasterFacet");
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
