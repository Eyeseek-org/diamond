// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {Modifiers, IERC20, Fund} from "../AppStorage.sol";
import "../Errors.sol";

import "hardhat/console.sol";

contract FundFacet is Modifiers {
    event FundCreated(uint256 id);
    event MicroDrained(address owner, uint256 amount, uint256 fundId);
    event MicroClosed(address owner, uint256 cap, uint256 fundId);
    event Returned(address microOwner, uint256 balance, address fundOwner);

    /// @notice Main function to create crowdfunding project
    function createFund(uint256 _level1, uint256 _days) public {
        if (msg.sender == address(0)) revert InvalidAddress(msg.sender);
        /// @notice Create a new project to be funded
        uint256 _deadline = block.timestamp + 30 days;
        /// @notice Let users pick between 1 and 90 days, if outside of range, set to 30 days
        if (_days > 1 && _days < 90){
            _deadline = block.timestamp + _days;
        }
        if (_level1 < 0) revert InvalidAmount(_level1);
        s.funds.push(
            Fund({
                owner: msg.sender,
                balance: 0,
                id: s.funds.length,
                state: 1,
                deadline: _deadline,
                level1: _level1,
                usdcBalance: 0,
                usdtBalance: 0,
                micros: 0,
                backerNumber: 0
            })
        );
        emit FundCreated(s.funds.length);
    }

    
    ///@notice - Emergency withdrawal of reward tokens in case they get stuck in the contract
    ///@notice - Temporary until app establishes as harmless 
    function emergencyWithdrawal(address _add, uint256 _currency, uint256 _nftId, uint256 _amount) public {
        LibDiamond.enforceIsContractOwner();
        IERC20 rewardToken = IERC20(_add);
        IERC1155 rewardNft = IERC1155(_add);
        if (_currency == 1){
            rewardToken.approve(address(this), _amount);   
            rewardToken.transferFrom( address(this), msg.sender, _amount);
        } else if (_currency == 2){
            rewardNft.setApprovalForAll(address(this), true);
            rewardNft.safeTransferFrom(
                            address(this),
                            msg.sender,
                            _nftId,
                            _amount,
                            ""
                        );
            }
        }


    function getFundDetail(uint256 _id) public view returns (Fund memory) {
        return s.funds[_id];
    }


    /// @notice - Calculate amounts of all involved microfunds in the donation
    function calcOutcome(uint256 _index, uint256 _amount)
        public
        view
        returns (uint256)
    {
        uint256 total = 0;
        total += _amount;
        for (uint256 i = 0; i < s.microFunds.length; i++) {
            if (
                s.microFunds[i].fundId == _index &&
                s.microFunds[i].state == 1 &&
                s.microFunds[i].cap - s.microFunds[i].microBalance >= _amount
            ) {
                total += _amount;
            }
        }
        return total;
    }

    /// @notice - Calculate number of involved microfunds for specific donation amount
    function calcInvolvedMicros(uint256 _index, uint256 _amount)
        public
        view
        returns (uint256)
    {
        uint256 microNumber = 0;
        for (uint256 i = 0; i < s.microFunds.length; i++) {
            if (
                s.microFunds[i].fundId == _index &&
                s.microFunds[i].state == 1 &&
                s.microFunds[i].cap - s.microFunds[i].microBalance >= _amount
            ) {
                microNumber++;
            }
        }
        return microNumber;
    }
}
