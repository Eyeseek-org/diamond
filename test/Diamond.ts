import { assert } from "chai";
import { ethers } from "hardhat";

import {
  DiamondCutFacet,
  DiamondLoupeFacet,
  OwnershipFacet,
} from "../typechain-types";

import { deployDiamond } from "../scripts/libraries/deploy";
import {
  FacetCutAction,
  getSelectors,
  removeSelectors,
} from "../scripts/libraries/diamond";

describe("DiamondTest", async function () {
  let diamondAddress: string;
  let diamondCutFacet: DiamondCutFacet;
  let diamondLoupeFacet: DiamondLoupeFacet;
  let ownershipFacet: OwnershipFacet;
  let tx;
  let receipt;
  let result;
  const addresses: string[] = [];

  before(async function () {
    const [_diamondAddress] = await deployDiamond();
    diamondAddress = _diamondAddress;
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddress
    );
    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddress
    );
    ownershipFacet = await ethers.getContractAt(
      "OwnershipFacet",
      diamondAddress
    );
  });

  it("should have three facets -- call to facetAddresses function", async () => {
    for (const address of await diamondLoupeFacet.facetAddresses()) {
      addresses.push(address);
    }
    assert.equal(addresses.length, 6);
  });

  it("facets should have the right function selectors -- call to facetFunctionSelectors function", async () => {
    let selectors = getSelectors(diamondCutFacet);
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0]);
    assert.sameMembers(result, selectors);
    selectors = getSelectors(diamondLoupeFacet);
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1]);
    assert.sameMembers(result, selectors);
    selectors = getSelectors(ownershipFacet);
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[2]);
    assert.sameMembers(result, selectors);
  });

  it("selectors should be associated to facets correctly -- multiple calls to facetAddress function", async () => {
    assert.equal(
      addresses[0],
      await diamondLoupeFacet.facetAddress("0x1f931c1c")
    );
    assert.equal(
      addresses[1],
      await diamondLoupeFacet.facetAddress("0xcdffacc6")
    );
    assert.equal(
      addresses[1],
      await diamondLoupeFacet.facetAddress("0x01ffc9a7")
    );
    assert.equal(
      addresses[2],
      await diamondLoupeFacet.facetAddress("0xf2fde38b")
    );
  });

  it("should fail to add test1 functions when not owner()", async () => {
    const Test1Facet = await ethers.getContractFactory("Test1Facet");
    const test1Facet = await Test1Facet.deploy();
    await test1Facet.deployed();
    // @ts-ignore
    const selectors = getSelectors(test1Facet).remove([
      "supportsInterface(bytes4)",
    ]);
    const [_, nonOwner] = await ethers.getSigners();
    const diamondCutFacetWithoutAuth = diamondCutFacet.connect(nonOwner);

    try {
      await diamondCutFacetWithoutAuth.diamondCut(
        [
          {
            facetAddress: test1Facet.address,
            action: FacetCutAction.Add,
            functionSelectors: selectors,
          },
        ],
        ethers.constants.AddressZero,
        "0x",
        { gasLimit: 800000 }
      );
      throw "Call didn't revert, this erorr should no be thrown";
    } catch (error) {
      assert.notEqual(
        "Call didn't revert, this erorr should no be thrown",
        error
      );
    }
  });

  it("should add test1 functions", async () => {
    const Test1Facet = await ethers.getContractFactory("Test1Facet");
    const test1Facet = await Test1Facet.deploy();
    await test1Facet.deployed();
    addresses.push(test1Facet.address);
    // @ts-ignore
    const selectors = getSelectors(test1Facet).remove([
      "supportsInterface(bytes4)",
    ]);
    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: test1Facet.address,
          action: FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      ethers.constants.AddressZero,
      "0x",
      { gasLimit: 800000 }
    );
    receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }
    result = await diamondLoupeFacet.facetFunctionSelectors(test1Facet.address);
    assert.sameMembers(result, selectors);
  });

  it("should test function call", async () => {
    const test1Facet = await ethers.getContractAt("Test1Facet", diamondAddress);
    await test1Facet.test1Func10();
  });

  it("should replace supportsInterface function", async () => {
    const Test1Facet = await ethers.getContractFactory("Test1Facet");
    // @ts-ignore
    const selectors = getSelectors(Test1Facet).get([
      "supportsInterface(bytes4)",
    ]);
    const testFacetAddress = addresses[6];
    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: testFacetAddress,
          action: FacetCutAction.Replace,
          functionSelectors: selectors,
        },
      ],
      ethers.constants.AddressZero,
      "0x",
      { gasLimit: 800000 }
    );
    receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }
    result = await diamondLoupeFacet.facetFunctionSelectors(testFacetAddress);
    assert.sameMembers(result, getSelectors(Test1Facet));
  });

  it("should add test2 functions", async () => {
    const Test2Facet = await ethers.getContractFactory("Test2Facet");
    const test2Facet = await Test2Facet.deploy();
    await test2Facet.deployed();
    addresses.push(test2Facet.address);
    const selectors = getSelectors(test2Facet);
    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: test2Facet.address,
          action: FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      ethers.constants.AddressZero,
      "0x",
      { gasLimit: 800000 }
    );
    receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }
    result = await diamondLoupeFacet.facetFunctionSelectors(test2Facet.address);
    assert.sameMembers(result, selectors);
  });


  it("remove all functions and facets accept 'diamondCut' and 'facets'", async () => {
    let selectors = [];
    let facets = await diamondLoupeFacet.facets();
    for (let i = 0; i < facets.length; i++) {
      selectors.push(...facets[i].functionSelectors);
    }
    selectors = removeSelectors(selectors, [
      "facets()",
      "diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)",
    ]);
    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: ethers.constants.AddressZero,
          action: FacetCutAction.Remove,
          functionSelectors: selectors,
        },
      ],
      ethers.constants.AddressZero,
      "0x",
      { gasLimit: 800000 }
    );
    receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }
    facets = await diamondLoupeFacet.facets();
    assert.equal(facets.length, 2);
    assert.equal(facets[0][0], addresses[0]);
    assert.sameMembers(facets[0][1], ["0x1f931c1c"]);
    assert.equal(facets[1][0], addresses[1]);
    assert.sameMembers(facets[1][1], ["0x7a0ed627"]);
  });
});
