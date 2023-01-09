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


    const Usdt = await ethers.getContractFactory("Token");
    usdtToken = await Usdt.deploy();
  });

  it("Micro, charge, cancel", async () => {
    const [user, receiver] = await ethers.getSigners();
    await masterFacet.createZeroData();
    await fundFacet.connect(receiver).createFund(1000, 30);
    const balBefore = await donationToken.balanceOf(receiver.address);
    const balMyBefore = await donationToken.balanceOf(user.address);
    const fundAmount = 500;
    const testId = 1;
    await donationToken.approve(diamondAddress, 2*fundAmount, {from: user.address});
    await masterFacet.contribute(fundAmount, 0, testId, 1, 0, {from: user.address});
    await masterFacet.contribute(0, fundAmount/2, testId, 1, 0, {from: user.address});
    const micro = await masterFacet.getMicrofundDetail(0);
    console.log(micro)
    const fund = await fundFacet.getFundDetail(testId);
    console.log(fund)
    const contractBalance = await donationToken.balanceOf(masterFacet.address);
    await masterFacet.cancelFund(testId);
    const balAfter = await donationToken.balanceOf(receiver.address);
    const balMyAfter = await donationToken.balanceOf(user.address);
    console.log(contractBalance)
    expect(balAfter).to.equal(balBefore);
    expect(balMyAfter).to.equal(balMyBefore);
  });
});
