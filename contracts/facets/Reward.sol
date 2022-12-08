// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

import "../AppStorage.sol";
import "../Errors.sol";

import "hardhat/console.sol";

contract RewardFacet is Modifiers {
    event RewardCreated(
        uint256 rewardId,
        address owner,
        address contractAddress,
        uint256 amount,
        uint256 fundId,
        uint256 rewardType
    );

    ///@notice Lock tokens as crowdfunding reward - ERC20/ERC1155
    ///@notice One project could have multiple rewards
    function createReward(
        uint256 _fundId,
        uint256 _totalNumber,
        uint256 _rewardAmount,
        address _tokenAddress,
        uint256 _type
    ) public {
        if (_rewardAmount < 0) revert InvalidAmount(_rewardAmount);
        console.log('passed');
         if (msg.sender == address(0)) revert InvalidAddress(msg.sender);
        if (_type == 0) {
            s.rewards.push(
                RewardPool({
                    rewardId: s.rewards.length,
                    fundId: _fundId,
                    totalNumber: _totalNumber,
                    actualNumber: _totalNumber,
                    owner: msg.sender,
                    contractAddress: _tokenAddress, ///@dev Needed zero address to be filled on FE
                    nftId: 0,
                    erc20amount: 0,
                    state: 0 ////@dev 0=Basic actuve 1=NFT active, 2=ERC20 Active, 3=Distributed 4=Canceled
                })
            );
        } else if (_type == 1) {
            IERC20 rewardToken = IERC20(_tokenAddress);
            uint256 bal = rewardToken.balanceOf(msg.sender);
            if (bal < _rewardAmount) revert LowBalance(bal);
            rewardToken.transferFrom(msg.sender, address(this), _rewardAmount);
            s.rewards.push(
                RewardPool({
                    rewardId: s.rewards.length,
                    fundId: _fundId,
                    totalNumber: _totalNumber,
                    actualNumber: _totalNumber,
                    owner: msg.sender,
                    contractAddress: _tokenAddress,
                    nftId: 0,
                    erc20amount: _rewardAmount,
                    state: 2 ////@dev 0=Basic actuve 1=NFT active, 2=ERC20 Active, 3=Distributed 4=Canceled
                })
            );
        } else if (_type == 2) {
            if (_totalNumber <= 0) revert InvalidAmount(_totalNumber);
            IERC1155 rewardNft = IERC1155(_tokenAddress);
            //   uint256 bal = rewardNft.balanceOf(msg.sender, _rewardAmount);
            //   require(_totalNumber <= bal, "Not enough token in wallet");
            rewardNft.safeTransferFrom(
                msg.sender,
                address(this),
                _rewardAmount,
                _totalNumber,
                ""
            );
            s.rewards.push(
                RewardPool({
                    rewardId: s.rewards.length,
                    fundId: _fundId,
                    totalNumber: _totalNumber,
                    actualNumber: _totalNumber,
                    owner: msg.sender,
                    contractAddress: _tokenAddress,
                    nftId: _rewardAmount,
                    erc20amount: 0,
                    state: 1 ///@dev 1=NFT active, 2=ERC20 Active, 3=Distributed 4=Canceled
                })
            );
        }
        emit RewardCreated(
            s.rewards.length,
            msg.sender,
            _tokenAddress,
            _rewardAmount,
            _fundId,
            _type
        );
    }


    // Saving space -> will be implemented after diamond
    // function batchDistribute(IERC20 _rewardTokenAddress) public onlyOwner nonReentrant {
    //     for (uint256 i = 0; i < funds.length; i++) {
    //         /// @notice - Only active funds with achieved minimum are eligible for distribution
    //         /// @notice - Function for automation, checks deadline and handles distribution/cancellation
    //         if (block.timestamp < funds[i].deadline) {
    //             continue;
    //         }
    //         /// @notice - Fund accomplished minimum goal
    //         if (
    //             funds[i].state == 1 &&
    //             funds[i].balance >= funds[i].level1 &&
    //             block.timestamp > funds[i].deadline
    //         ) {
    //             distribute(i);
    //         }
    //         /// @notice - If not accomplished, funds are returned back to the users on home chain
    //         else if (
    //             funds[i].state == 1 &&
    //             funds[i].balance < funds[i].level1 &&
    //             block.timestamp > funds[i].deadline
    //         ) {
    //             cancelFund(i);
    //         }
    //     }
    // }

    // function getRewardReceivers(uint256 _id) public view returns (address[] memory)
    //     {
    //         address[] memory rewardReceivers = new address[](funding.getEligibleRewards(_id));
    //         uint256 rewardNumber = 0;
    //         for (uint256 i = 0; i < funding.rewardList.length; i++) {
    //             if (
    //                 funding.rewardList[i].rewardId == _index
    //             ) {
    //                 rewardReceivers[rewardNumber] = funding.rewardList[i].receiver;
    //                 rewardNumber++;
    //             }
    //         }
    //         return rewardReceivers;
    //     }

    // function getEligibleRewards(uint256 _index) public view returns (uint256) {
    //     uint256 rewardNumber = 0;
    //     for (uint256 i = 0; i < rewards.length; i++) {
    //         if (
    //             rewards[i].fundId == _index &&
    //             rewards[i].state == 0
    //         ) {
    //             rewardNumber++;
    //         }
    //     }
    //     return rewardNumber;
    // }


}
