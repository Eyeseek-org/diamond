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
    function createFund(uint256 _level1) public {
        /// @notice Create a new project to be funded
        /// @param _currency - token address, fund could be created in any token, this will be also required for payments // For now always 0
        /// @param _level1 - 1st (minimum) level of donation accomplishment, same works for all levels.
        uint256 _deadline = block.timestamp + 30 days;
        /// if (msg.sender == address(0)) revert InvalidAddress(msg.sender);
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

    
    ///@notice - Single function to claim microfund leftovers separately
    /// TBD only after deadline
    function claimMicro(uint256 _id, address _add) public {
        if (s.microFunds[_id].state != 1) revert FundInactive(_id);
        if (s.microFunds[_id].cap == s.microFunds[_id].microBalance) revert LowBalance(s.microFunds[_id].microBalance);
        if (s.microFunds[_id].owner != _add) revert InvalidAddress(s.microFunds[_id].owner);
        s.microFunds[_id].state = 2; ///@dev closing the microfunds
        uint256 diff = s.microFunds[_id].cap - s.microFunds[_id].microBalance;
        uint256 fundId = s.microFunds[_id].fundId;
        if (s.microFunds[_id].currency == 1){
            s.usdc.approve(address(this), diff);   
            s.usdc.transferFrom( address(this), s.microFunds[_id].owner, diff);
        } else if (s.microFunds[_id].currency == 2){
            s.usdt.approve(address(this), diff);   
            s.usdt.transferFrom( address(this), s.microFunds[_id].owner, diff);
        }
        s.microFunds[_id].microBalance = 0; ///@dev resets the microfund
        emit Returned( s.microFunds[_id].owner, diff, s.funds[fundId].owner );
    }

    function getFundDetail(uint256 _id) public view returns (Fund memory) {
        return s.funds[_id];
    }

    function getMyMicrofunds() public view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < s.microFunds.length; i++) {
            if (s.microFunds[i].owner == msg.sender) {
                count++;
            }
        }
        uint256[] memory microIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < s.microFunds.length; i++) {
            if (s.microFunds[i].owner == msg.sender) {
                microIds[index] = s.microFunds[i].fundId;
                index++;
            }
        }
        return microIds;
    }

    function getMyDonations() public view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < s.donations.length; i++) {
            if (s.donations[i].backer == msg.sender) {
                count++;
            }
        }
        uint256[] memory donations = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < s.donations.length; i++) {
            if (s.donations[i].backer == msg.sender) {
                donations[index] = s.donations[i].fundId;
                index++;
            }
        }
        return donations;
    }



    /// @notice - Get total number of microfunds connected to the ID of fund
    function getConnectedMicroFunds(uint256 _index) public view returns (uint256)
    {
        uint256 count = 0;
        for (uint256 i = 0; i < s.microFunds.length; i++) {
            if (s.microFunds[i].fundId == _index) {
                count++;
            }
        }
        return count;
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
