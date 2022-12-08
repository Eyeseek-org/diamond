import { assert, expect } from "chai";
import { ethers, network } from "hardhat";

import {
  DiamondLoupeFacet,
  FundFacet,
  MasterFacet,
  OwnershipFacet,
  RewardFacet,
  Token,
} from "../typechain-types";

import { deployDiamond } from "../scripts/deploy";
import { BigNumber } from "ethers";

let user, donationToken, donation, fund, cancelUser, receiver


describe("Funding", async function () {
  let diamondAddress: string;
  let diamondLoupeFacet: DiamondLoupeFacet;
  // let ownershipFacet: OwnershipFacet;
  let fundFacet: FundFacet;
  // let rewardFacet: RewardFacet;
  let masterFacet: MasterFacet;

  let donationToken: Token;
  let usdtToken: Token
  let usdcToken: Token

  before(async function () {
    // ## Setup Donation Token
    const Token = await ethers.getContractFactory("Token");
    donationToken = await Token.deploy();

    const Usdc = await ethers.getContractFactory("Token")
    usdcToken = await Usdc.deploy()

    // ## Setup Diamond

    // Pass list of facets to add in addition to the base DiamondLoupeFacet, DiamondCutFacet and OwnershipFacet
    diamondAddress = await deployDiamond(
      ["FundFacet", "RewardFacet", "MasterFacet"],
      donationToken.address, usdcToken.address
    );

    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddress
    );
    // ownershipFacet = await ethers.getContractAt(
    //   "OwnershipFacet",
    //   diamondAddress
    // );
    fundFacet = await ethers.getContractAt("FundFacet", diamondAddress);
    // rewardFacet = await ethers.getContractAt("RewardFacet", diamondAddress);
    masterFacet = await ethers.getContractAt("MasterFacet", diamondAddress);
    masterFacet.createZeroData()

      // environment preparation, deploy token & staking contracts
      const accounts = await ethers.getSigners()
      user = accounts[3] // Donor account
      fund = accounts[4] // Fund account
      cancelUser = accounts[5] // Cancel account	
      receiver = accounts[6] // Receiver account

      const Usdt = await ethers.getContractFactory("Token")
      usdtToken = await Usdt.deploy()


      // const Multi = await ethers.getContractFactory("EyeseekMulti")
      // multiToken = await Multi.deploy()
      // multiToken.safeTransferFrom(multiToken.address, user.address, 0, 1, "")

  });

  it("should have all facets -- call to facetAddresses function", async () => {
    const addresses = [];
    for (const address of await diamondLoupeFacet.facetAddresses()) {
      addresses.push(address);
    }
    assert.equal(addresses.length, 6);
  });

  it("MasterFacet facet - contribute to fund with index 1 with no errors", async () => {
    const [user, receiver] = await ethers.getSigners()
    fundFacet.createFund(1000, {from: user.address})
    await donationToken.approve(diamondAddress, 50, {from: user.address});
    // Contribute to 2nd fund (index 1)
    await masterFacet.contribute(0, 50, 1, 0, 0);

    
  });

  it("Basic e2e - Create fund, contribute and check balances", async function () {
    const [user, receiver] = await ethers.getSigners()
    // 1 = Zero data
    fundFacet.createFund(1000, {from: receiver.address})
    const fundAmount = 500
    const testId = 1
    const bUserBefore = await donationToken.balanceOf(user.address)
    await donationToken.approve(diamondAddress, 4 * fundAmount, {from: user.address})
    await masterFacet.contribute(0,fundAmount,testId,1,0, {from: user.address})
    await masterFacet.contribute(fundAmount,fundAmount,testId,1,0, {from: user.address})

  
    //---------- Calculate stats before distribute

    // Verify number of connected microfunds
    const connectedMicroBefore = await fundFacet.getConnectedMicroFunds(testId)
    expect(connectedMicroBefore).to.equal(1)
    // Calculate involved microfunds in next possible $100 donation to fundId 1
    const amountInvolved = await fundFacet.calcInvolvedMicros(testId, 100);
    expect(amountInvolved).to.equal(1);
    
    // Second round of donations
    await masterFacet.contribute(0,fundAmount,testId,1,0, {from: user.address})
    await usdcToken.approve(diamondAddress, fundAmount, {from: user.address})
    await masterFacet.contribute(0,fundAmount,testId,2,0, {from: user.address})

    const dDonBalance = await donationToken.balanceOf(diamondAddress)
    expect(dDonBalance).to.equal(4 * fundAmount)

    const dUsdcBalance = await usdcToken.balanceOf(diamondAddress)
    expect(dUsdcBalance).to.equal(fundAmount)
    //---------- Distribute and calculate balance after 
    await masterFacet.distribute(testId);

    const bUserBAfter = await donationToken.balanceOf(user.address)
    expect(bUserBAfter).to.equal(bUserBefore)


    // await masterFacet.createReward(1,1,100,usdcToken.address,1, {from: user.address})
    // console.log('First reward created');
    // await masterFacet.createReward(1,50,1,usdcToken.address,0, {from: user.address})
    // console.log('Second reward created');
    // 150 offered in total

    // const multiBalance = await multiToken.balanceOf(user.address, 0)
    // console.log("Multi balance before: " + multiBalance)
    // await multiToken.setApprovalForAll(donation.address, true, {from: user.address})
//    await donation.createReward(1,1, multiToken.address, 0, {from: user.address})
  //   await donation.distribute(1, {from: user.address});
    // await fundFacet.cancelFund(1);
})

it("Reward creation and distribution test", async function () {
   const [user, receiver] = await ethers.getSigners()

  })
});
