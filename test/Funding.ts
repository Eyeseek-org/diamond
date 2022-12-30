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

describe("Funding", async function () {
  let diamondAddress: string;
  let diamondLoupeFacet: DiamondLoupeFacet;
  let fundFacet: FundFacet;
  let masterFacet: MasterFacet;
  let rewardFacet: RewardFacet;
  let donationToken: Token;
  let usdtToken: Token;
  let usdcToken: Token;
  let funnyToken: Token;

  before(async function () {
    // ## Setup Donation Token
    const Token = await ethers.getContractFactory("Token");
    donationToken = await Token.deploy();

    const Usdc = await ethers.getContractFactory("Token");
    usdcToken = await Usdc.deploy();


    const Funny = await ethers.getContractFactory("Token");
    funnyToken = await Funny.deploy();

    // ## Setup Diamond

    // Pass list of facets to add in addition to the base DiamondLoupeFacet, DiamondCutFacet and OwnershipFacet
    const [_diamondAddress] = await deployDiamond(
      ["FundFacet", "RewardFacet", "MasterFacet"],
      donationToken.address,
      usdcToken.address
    );
    diamondAddress = _diamondAddress;

    diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet",diamondAddress);
    // ownershipFacet = await ethers.getContractAt(
    //   "OwnershipFacet",
    //   diamondAddress
    //
    fundFacet = await ethers.getContractAt("FundFacet", diamondAddress);
    // rewardFacet = await ethers.getContractAt("RewardFacet", diamondAddress);
    masterFacet = await ethers.getContractAt("MasterFacet", diamondAddress);
    rewardFacet = await ethers.getContractAt("RewardFacet", diamondAddress);
    await masterFacet.createZeroData();

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
    const [user] = await ethers.getSigners();
    fundFacet.createFund(1000, 30, { from: user.address });
    await donationToken.approve(diamondAddress, 50, { from: user.address });
    // Contribute to 2nd fund (index 1)
    await masterFacet.contribute(0, 50, 1, 0, 0);
  });

  it("Basic e2e - Create fund, contribute and check balances", async function () {
    const [user, receiver] = await ethers.getSigners();
    fundFacet.createFund(1000, 30, { from: receiver.address });
    const fundAmount = 500;
    const testId = 1;
    const bUserBefore = await donationToken.balanceOf(user.address);
    await donationToken.approve(diamondAddress, 4 * fundAmount, {from: user.address});
    await masterFacet.contribute(0, fundAmount, testId, 1, 0, {from: user.address});
    await masterFacet.contribute(fundAmount, fundAmount, testId, 1, 0, {from: user.address});

    //---------- Calculate stats before distribute

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

  it("E2E - Cancel after not complete", async function () {
    const [user] = await ethers.getSigners();
    const fundAmount = 500;
    const testId = 2;
    fundFacet.createFund(1000, 30);

    const bUserBefore = await donationToken.balanceOf(user.address);
    await donationToken.approve(diamondAddress, 2 * fundAmount, {from: user.address});
    await masterFacet.contribute(fundAmount, fundAmount, testId, 1, 0, {from: user.address});
    await usdcToken.approve(diamondAddress, 2 * fundAmount, {from: user.address});
    await masterFacet.contribute(fundAmount, fundAmount, testId, 2, 0, {from: user.address});

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
    // Sending exact 11 tokens for all test actors
    await donationToken.connect(bank).transfer(user1.address, 11);
    await donationToken.connect(bank).transfer(user2.address, 11);
    await donationToken.connect(bank).transfer(user3.address, 11);
    await donationToken.connect(bank).transfer(user4.address, 11);
    await donationToken.connect(user1).approve(diamondAddress, 11);
    await donationToken.connect(user2).approve(diamondAddress, 11);
    await donationToken.connect(user3).approve(diamondAddress, 11);
    await donationToken.connect(user4).approve(diamondAddress, 11);
    const donationAmount = 1;
    const microfundAmount = 10;
    const testId = 3;
    fundFacet.connect(creator).createFund(100, 30);
    // ---------------- Contribution from all users
    // Execute same contribution from 4x different users, contribution "donationToken"

    await masterFacet.connect(user1).contribute(microfundAmount, donationAmount, testId, 1, 0);
    await masterFacet.connect(user2).contribute(microfundAmount, donationAmount, testId, 1, 0);
    await masterFacet.connect(user3).contribute(microfundAmount, donationAmount, testId, 1, 0);
    await masterFacet.connect(user4).contribute(microfundAmount, donationAmount, testId, 1, 0);


    // ---------------- Result after distribution
    // Calling Distribution with new Multicall - testing specific distributeUni() internal function
    await masterFacet.distribute(testId); 

    // Claiming microfunds one by one
    // await fundFacet.connect(user1).claimMicro(1, user1.address);
    // await fundFacet.connect(user1).claimMicro(2, user2.address);
    // await fundFacet.connect(user1).claimMicro(3, user3.address);
    // await fundFacet.connect(user1).claimMicro(4, user4.address);

    // Retrieve balances of all users
    const balMaster = await donationToken.balanceOf(diamondAddress);
    const balCreator = await donationToken.balanceOf(creator.address);
    const balUser1 = await donationToken.balanceOf(user1.address);
    const balUser2 = await donationToken.balanceOf(user2.address);
    const balUser3 = await donationToken.balanceOf(user3.address);
    const balUser4 = await donationToken.balanceOf(user4.address);

    // No token should be left in the contract
    expect(balMaster).to.equal(0);
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
  it("Verifies reward movements", async function(){
    const [bank, user, creator] = await ethers.getSigners();
    const donationAmount = 10;
    const testId = 4;
    fundFacet.connect(creator).createFund(1000, 30);
    // ---------------- Test data setup
    await donationToken.connect(bank).transfer(user.address, 50);
    await usdcToken.connect(bank).transfer(user.address, 50);
    await donationToken.connect(bank).transfer(creator.address, 42);
    await funnyToken.connect(bank).transfer(creator.address, 50);
    await usdcToken.connect(user).approve(diamondAddress, 500);
    await donationToken.connect(user).approve(diamondAddress, 500);

    // ---------------- Reward generation - all three types
    await funnyToken.connect(creator).approve(diamondAddress, 20)
    await rewardFacet.connect(creator).createReward(testId, 2, 10, donationAmount, funnyToken.address, 0)
    await rewardFacet.connect(creator).createReward(testId, 2, 10, donationAmount, funnyToken.address, 1)
    await masterFacet.connect(user).contribute(0, donationAmount, testId, 2, 1);
    await masterFacet.connect(user).contribute(0, donationAmount, testId, 2, 2);

    // ---------------- Reward distribution (funnyToken ERC20)
    await masterFacet.distribute(testId);
    await rewardFacet.connect(creator).distributeFundRewards(testId)

    // ---------------- Reward balances 
    //-- Creator spent 20 tokens, 10 was returned for unclaimed ERC20
    //-- User receives 10 tokens for 1 claimable erc20 reward
    //-- Diamond has 0 tokens, all is claimed or returned back
    const balRewardCreator = await funnyToken.balanceOf(creator.address);
    const balRewDiamond = await funnyToken.balanceOf(diamondAddress);
    const balRewUser = await funnyToken.balanceOf(user.address);

    expect(balRewardCreator).to.equal(40)
    expect(balRewUser).to.equal(10)
    expect(balRewDiamond).to.equal(0)

  })
  it("Test cancel fund with rewards", async function(){
    const [bank, user, creator] = await ethers.getSigners();
    const testId = 5;
    fundFacet.connect(creator).createFund(1000, 30);
    const balBefore = await funnyToken.balanceOf(creator.address);

    await funnyToken.connect(creator).approve(diamondAddress, 40)
    await rewardFacet.connect(creator).createReward(testId, 1, 10,10, funnyToken.address, 1)
    await rewardFacet.connect(creator).createReward(testId, 1, 10,10, funnyToken.address, 1)
    await rewardFacet.connect(creator).createReward(testId, 1, 10,10, funnyToken.address, 1)
    await rewardFacet.connect(creator).createReward(testId, 1, 10,10, funnyToken.address, 1)

    await masterFacet.connect(user).contribute(0, 10, testId, 1, 4);
    await masterFacet.cancelFund(testId);

    const rewItems = await rewardFacet.getRewardItems()
    const rewFund = await rewardFacet.getFundRewards(testId)
    const rewPool = await rewardFacet.getPoolRewards(2)

    await rewardFacet.returnRewards(testId);

    const balAfter = await funnyToken.balanceOf(creator.address);
    expect(balBefore).to.equal(balAfter)

  })
});
