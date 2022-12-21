import { run, network } from "hardhat";

const verify = async () => {
  if (network.name !== "hardhat") {
    console.log("Verifying contract source on blockchain scan ...");
    await run("verify:verify", {
      address: "0xEbA96A6656fe85CcEC62363C68887cd478940502",
      constructorArguments: [],
    });
    console.log("Verified Contract 1/4: MasterFacet");

    await run("verify:verify", {
        address: "0xE120b4531ABc815C0A089db7D2063B1143b3f31d",
        constructorArguments: [],
      });
    console.log("Verified Contract 2/4: FundFacet");
    await run("verify:verify", {
        address: "0x727EB56e55Dc188672B5d9Fe0F850cC66a130d95",
        constructorArguments: [],
      });
    console.log("Verified Contract 3/4: RewardFacet");
    await run("verify:verify", {
      address: "0x727EB56e55Dc188672B5d9Fe0F850cC66a130d95",
      constructorArguments: [],
    });
  console.log("Verified Contract 4/4: Diamond");
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
