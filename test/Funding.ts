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

import { deployDiamond } from "../scripts/libraries/deploy";

let user, creator, fund, cancelUser, receiver;

describe("Funding", async function () {
  let diamondAddress: string;
  let diamondLoupeFacet: DiamondLoupeFacet;
  // let ownershipFacet: OwnershipFacet;
  let fundFacet: FundFacet;
  // let rewardFacet: RewardFacet;
  let masterFacet: MasterFacet;
  let rewardFacet: RewardFacet;

  let donationToken: Token;
  let usdtToken: Token;
  let usdcToken: Token;

  before(async function () {
    // ## Setup Donation Token
    const Token = await ethers.getContractFactory("Token");
    donationToken = await Token.deploy();

    const Usdc = await ethers.getContractFactory("Token");
    usdcToken = await Usdc.deploy();

    // ## Setup Diamond

    // Pass list of facets to add in addition to the base DiamondLoupeFacet, DiamondCutFacet and OwnershipFacet
    const [_diamondAddress] = await deployDiamond(
      ["FundFacet", "RewardFacet", "MasterFacet"],
      donationToken.address,
      usdcToken.address
    );
    diamondAddress = _diamondAddress;

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
    rewardFacet = await ethers.getContractAt("RewardFacet", diamondAddress);
    masterFacet.createZeroData();

    // environment preparation, deploy token & staking contracts
    const [user] = await ethers.getSigners();

    const Usdt = await ethers.getContractFactory("Token");
    usdtToken = await Usdt.deploy();

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
    const [user, receiver] = await ethers.getSigners();
    fundFacet.createFund(1000, { from: user.address });
    await donationToken.approve(diamondAddress, 50, { from: user.address });
    // Contribute to 2nd fund (index 1)
    await masterFacet.contribute(0, 50, 1, 0, 0);
  });

  it("Basic e2e - Create fund, contribute and check balances", async function () {
    const [user, receiver] = await ethers.getSigners();
    fundFacet.createFund(1000, { from: receiver.address });
    const fundAmount = 500;
    const testId = 1;
    const bUserBefore = await donationToken.balanceOf(user.address);
    await donationToken.approve(diamondAddress, 4 * fundAmount, {
      from: user.address,
    });
    await masterFacet.contribute(0, fundAmount, testId, 1, 0, {
      from: user.address,
    });
    await masterFacet.contribute(fundAmount, fundAmount, testId, 1, 0, {
      from: user.address,
    });

    //---------- Calculate stats before distribute

    // Verify number of connected microfunds
    const connectedMicroBefore = await fundFacet.getConnectedMicroFunds(testId);
    expect(connectedMicroBefore).to.equal(1);
    // Calculate involved microfunds in next possible $100 donation to fundId 1
    const amountInvolved = await fundFacet.calcInvolvedMicros(testId, 100);
    expect(amountInvolved).to.equal(1);

    // Second round of donations
    await masterFacet.contribute(0, fundAmount, testId, 1, 0, {
      from: user.address,
    });
    await usdcToken.approve(diamondAddress, fundAmount, { from: user.address });
    await masterFacet.contribute(0, fundAmount, testId, 2, 0, {
      from: user.address,
    });

    const dDonBalance = await donationToken.balanceOf(diamondAddress);
    expect(dDonBalance).to.equal(4 * fundAmount);

    const dUsdcBalance = await usdcToken.balanceOf(diamondAddress);
    expect(dUsdcBalance).to.equal(fundAmount);
    //---------- Distribute and calculate balance after
    await masterFacet.distribute(1);
    // await masterFacet.cancelFund(testId);

    const bal = await donationToken.balanceOf(diamondAddress);
    expect(bal).to.equal(0);

    const bUserBAfter = await donationToken.balanceOf(user.address);
    expect(bUserBAfter).to.equal(bUserBefore);
  });

  it("Reward creation and distribution test", async function () {
    const [user] = await ethers.getSigners();
    const fundAmount = 500;
    const rewardAmount = 100;
    const testId = 2;
    fundFacet.createFund(1000);

    const bUserBefore = await donationToken.balanceOf(user.address);
    await donationToken.approve(diamondAddress, 3 * fundAmount, {
      from: user.address,
    });
    await masterFacet.contribute(0, fundAmount, testId, 1, 0, {
      from: user.address,
    });

    await usdcToken.approve(diamondAddress, rewardAmount, {
      from: user.address,
    });
    await rewardFacet.createReward(testId, 1, 1, usdcToken.address, 0, {
      from: user.address,
    });
    await rewardFacet.createReward(
      testId,
      1,
      rewardAmount,
      usdcToken.address,
      1,
      { from: user.address }
    );

    // Charge reward with contribution
    await masterFacet.contribute(0, fundAmount, testId, 1, 2, {
      from: user.address,
    });
    // Charge reward error

    // await masterFacet.distribute(testId); // Passed
    await masterFacet.cancelFund(testId); // Not passed
    const bUserBAfter = await donationToken.balanceOf(user.address);
    expect(bUserBAfter).to.equal(bUserBefore);

    // TBD positions halfway through, test multitoken

    // const multiBalance = await multiToken.balanceOf(user.address, 0)
    // console.log("Multi balance before: " + multiBalance)
    // await multiToken.setApprovalForAll(donation.address, true, {from: user.address})
    //    await donation.createReward(1,1, multiToken.address, 0, {from: user.address})
  });
  it("Test mutlicall operation", async function () {
    const [bank, user1, user2, user3, user4, creator] = await ethers.getSigners();
    // Sendind exact 11 tokens for all test actors
    await donationToken.connect(bank).transfer(user1.address, 11);
    await donationToken.connect(bank).transfer(user2.address, 11);
    await donationToken.connect(bank).transfer(user3.address, 11);
    await donationToken.connect(bank).transfer(user4.address, 11);
    await donationToken.connect(bank).transfer(creator.address, 11);
    const donationAmount = 1;
    const microfundAmount = 10;
    const testId = 3;
    fundFacet.connect(creator).createFund(100);
    // ---------------- TO DO
    // Execute same contribution from 4x different users, contribution "donationToken"
    // Currently error Contract with a Signer cannot override from
     await masterFacet.contribute(microfundAmount, donationAmount, testId, 1, 0, { from: user1.address});
     await masterFacet.contribute(microfundAmount, donationAmount, testId, 1, 0, { from: user2.address});
     await masterFacet.contribute(microfundAmount, donationAmount, testId, 1, 0, { from: user3.address});
     await masterFacet.contribute(microfundAmount, donationAmount, testId, 1, 0, { from: user4.address});


    // ---------------- Result after distribution
    // Calling Distribution with new Multicall - testing specific distributeUni() internal function
    await masterFacet.distribute(testId); 

    // Retrieve balances of all users
    const balCreator = await donationToken.balanceOf(creator.address);
    const balUser1 = await donationToken.balanceOf(user1.address);
    const balUser2 = await donationToken.balanceOf(user2.address);
    const balUser3 = await donationToken.balanceOf(user3.address);
    const balUser4 = await donationToken.balanceOf(user4.address);

    console.log(balCreator, balUser1, balUser2, balUser3, balUser4);
    // No token should be left in the contract
    expect(masterFacet).to.equal(0);
    // User 1 should have 4 tokens less then before the contribution
    expect(balUser1).to.equal(7);
    // User 2 should have 3 token less then before the contribution
    expect(balUser2).to.equal(8);
    // User 3 should have 2 token less then before the contribution
    expect(balUser3).to.equal(9);
    // User 4 should have 1 token less then before the contribution
    expect(balUser4).to.equal(10);
    // Creator should collect donations and drained microfunds
    expect(balCreator).to.equal(10)
  });
});
