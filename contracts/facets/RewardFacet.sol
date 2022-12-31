// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import '@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol';
import {LibDiamond} from "../libraries/LibDiamond.sol";

import "../AppStorage.sol";
import "../Errors.sol";



contract RewardFacet is Modifiers {
    event RewardCreated(
        uint256 rewardId,
        address owner,
        address contractAddress,
        uint256 amount,
        uint256 pledge,
        uint256 fundId,
        uint256 rewardType
    );

    event TokenReward(address backer, uint256 amount, uint256 fundId);
    event NftReward(address backer, address contractAddress, uint256 fundId);

    ///@notice Lock tokens as crowdfunding reward - ERC20/ERC1155
    ///@notice One project could have multiple rewards
    function createReward(
        uint256 _fundId,
        uint256 _totalNumber,
        uint256 _rewardAmount,
        uint256 _pledge,
        address _tokenAddress,
        uint256 _type
    ) public {
        if (_rewardAmount < 0) revert InvalidAmount(_rewardAmount);
        if (msg.sender == address(0)) revert InvalidAddress(msg.sender);
        if (_type == 0) {
            s.rewards.push(
                RewardPool({
                    rewardId: s.rewards.length,
                    fundId: _fundId,
                    totalNumber: _totalNumber,
                    actualNumber: 0,
                    owner: msg.sender,
                    pledge: 0,
                    contractAddress: _tokenAddress, ///@dev Needed zero address to be filled on FE
                    nftId: 0,
                    erc20amount: 0,
                    state: 0 ////@dev 0=Basic actuve 1=NFT active, 2=ERC20 Active, 3=Distributed 4=Canceled
                })
            );
        } else if (_type == 1) {
            if (_totalNumber <= 0) revert InvalidAmount(_totalNumber);
            uint256 rewAmount = _rewardAmount * _totalNumber;
            IERC20 rewardToken = IERC20(_tokenAddress);
            uint256 bal = rewardToken.balanceOf(msg.sender);
            if (bal < _rewardAmount) revert LowBalance(bal);
            rewardToken.transferFrom(msg.sender, address(this), rewAmount);
            s.rewards.push(
                RewardPool({
                    rewardId: s.rewards.length,
                    fundId: _fundId,
                    totalNumber: _totalNumber,
                    actualNumber: 0,
                    pledge: _pledge,
                    owner: msg.sender,
                    contractAddress: _tokenAddress,
                    nftId: 0,
                    erc20amount: _rewardAmount,
                    state: 2 ////@dev 0=Basic actuve 1=NFT active, 2=ERC20 Active, 3=Distributed 4=Canceled
                })
            );
        } else if (_type == 2) {
            if (_totalNumber <= 0) revert InvalidAmount(_totalNumber);
            SolidStateERC1155 rewardNft = SolidStateERC1155(_tokenAddress);
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
                    actualNumber: 0,
                    pledge: _pledge,
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
            _pledge,
            _fundId,
            _type
        );
    }

    function getFundRewards(uint256 _fundId)
        public
        view
        returns (RewardPool[] memory)
    {
        RewardPool[] memory rewards = new RewardPool[](s.rewards.length);
        uint256 counter = 0;
        for (uint256 i = 0; i < s.rewards.length; i++) {
            if (s.rewards[i].fundId == _fundId) {
                rewards[counter] = s.rewards[i];
                counter++;
            }
        }
        return rewards;
    }

    function getPoolRewards(uint256 _rewId)
        public
        view
        returns (Reward[] memory)
    {
        Reward[] memory rewards = new Reward[](s.rewardList.length);
        uint256 counter = 0;
        for (uint256 i = 1; i < s.rewardList.length; i++) {
            if (s.rewardList[i].rewardId == _rewId) {
                rewards[counter] = s.rewardList[i];
                counter++;
            }
        }
        return rewards;
    }

    function getRewardItems() public view returns (Reward[] memory) {
        Reward[] memory rewards = new Reward[](s.rewardList.length);
        uint256 counter = 0;
        for (uint256 i = 0; i < s.rewardList.length; i++) {
            rewards[counter] = s.rewardList[i];
            counter++;
        }
        return rewards;
    }

    ///@notice - Return fund rewards to the owner from closed fund
    ///@notice - Could be called by anyone as it does not provide any financial benefit to the caller
    ///@notice - Because of that expected to be called mainly by the contract owner
    ///@param _fundId - Fund id to return rewards for
    function returnRewards(uint256 _fundId) public {
        LibDiamond.enforceIsContractOwner();
        if (s.funds[_fundId].state != 0) revert FundNotClosed(_fundId);
        for (uint256 i = 0; i < s.rewards.length; i++) {
            if (
                s.rewards[i].fundId == _fundId && s.rewards[i].totalNumber > 0
            ) {
                if (s.rewards[i].state == 2) {
                    ///@dev - Note frontend and contract use different states to identify type
                    IERC20 rewardToken = IERC20(s.rewards[i].contractAddress);
                    rewardToken.approve(
                        address(this),
                        s.rewards[i].erc20amount * s.rewards[i].totalNumber
                    );
                    rewardToken.transferFrom(
                        address(this),
                        s.rewards[i].owner,
                        s.rewards[i].erc20amount * s.rewards[i].totalNumber
                    );
                } else if (s.rewards[i].state == 1) {
                    SolidStateERC1155 rewardNft = SolidStateERC1155(s.rewards[i].contractAddress);
                    rewardNft.setApprovalForAll(address(this), true);
                    rewardNft.safeTransferFrom(
                        address(this),
                        s.rewards[i].owner,
                        s.rewards[i].nftId,
                        s.rewards[i].totalNumber,
                        ""
                    );
                }
                s.rewards[i].state == 4; ///@dev - Set reward item state to canceled
            }
        }
    }

    ///@notice - Separated function  from MasterFacet -> distribute()
    ///@notice - Distribute rewards to backers
    function distributeFundRewards(uint256 _id) public {
        LibDiamond.enforceIsContractOwner();
        if (s.funds[_id].state != 2) revert FundNotClosed(_id);
        for (uint256 i = 0; i < s.rewards.length; i++) {
            IERC20 rewardToken = IERC20(s.rewards[i].contractAddress);
            SolidStateERC1155 rewardNft = SolidStateERC1155(s.rewards[i].contractAddress);
            if (s.rewards[i].fundId == _id && s.rewards[i].state != 3) {
                for (uint256 j = 0; j < s.rewardList.length; j++) {
                    ///@notice - Check NFT rewards
                    if (
                        s.rewardList[j].rewardId == s.rewards[i].rewardId &&
                        s.rewards[i].state == 1 &&
                        s.rewardList[j].state != 3 &&
                        s.rewardList[j].receiver != address(0)
                    ) {
                        s.rewardList[j].state = 3;
                        rewardNft.setApprovalForAll(address(this), true);
                        rewardNft.safeTransferFrom(
                            address(this),
                            s.rewardList[j].receiver,
                            s.rewards[i].nftId,
                            1,
                            ""
                        );
                        emit NftReward(
                            s.rewardList[j].receiver,
                            s.rewards[i].contractAddress,
                            s.rewards[i].fundId
                        );
                    }
                    ///@notice - Check ERC20 rewards
                    else if (
                        s.rewardList[j].rewardId == s.rewards[i].rewardId &&
                        s.rewards[i].state == 2 &&
                        s.rewardList[j].state != 3 &&
                        s.rewardList[j].receiver != address(0)
                    ) {
                        s.rewardList[j].state = 3;
                        rewardToken.approve(
                            address(this),
                            s.rewards[i].erc20amount
                        );
                        rewardToken.transferFrom(
                            address(this),
                            s.rewardList[j].receiver,
                            s.rewards[i].erc20amount
                        );
                        emit TokenReward(
                            s.rewardList[j].receiver,
                            s.rewards[i].erc20amount,
                            s.rewards[i].fundId
                        );
                    }
                }
                //@notice - Return non-claimed tokens to the creator
                if (s.rewards[i].totalNumber > s.rewards[i].actualNumber) {
                    uint256 rewardsDiff = s.rewards[i].totalNumber -
                        s.rewards[i].actualNumber;
                    ///@notice - NFT leftovers
                    if (s.rewards[i].state == 1) {
                        rewardNft.setApprovalForAll(address(this), true);
                        rewardNft.safeTransferFrom(
                            address(this),
                            s.rewards[i].owner,
                            s.rewards[i].nftId,
                            rewardsDiff,
                            ""
                        );
                        ///@notice - ERC20 leftovers
                    } else if (s.rewards[i].state == 2) {
                        rewardToken.approve(
                            address(this),
                            s.rewards[i].erc20amount * rewardsDiff
                        );
                        rewardToken.transferFrom(
                            address(this),
                            s.rewards[i].owner,
                            s.rewards[i].erc20amount * rewardsDiff
                        );
                    }
                }
                //@notice - Closing reward pool
                s.rewards[i].state = 3;
            }
        }
    }
}
