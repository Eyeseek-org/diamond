// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import "../AppStorage.sol";
import "../Errors.sol";
import "./RewardFacet.sol";

contract MasterFacet is Modifiers {

    event MicroCreated(address owner,uint256 cap,uint256 fundId,uint256 currency,uint256 microId);
    event Donated(address donator,uint256 amount,uint256 fundId,uint256 currency,uint256 microDrained);
    event Returned(address microOwner, uint256 balance, address fundOwner);
    event MicroDrained(address owner, uint256 amount, uint256 fundId);
    event MicroClosed(address owner, uint256 cap, uint256 fundId);
    event TokenReward(address backer, uint256 amount, uint256 fundId);
    event NftReward(address backer, address contractAddress, uint256 fundId);
    event DistributionAccomplished(address owner,uint256 balance,uint256 currency,uint256 fee);
    event Refunded(address backer, uint256 amount, uint256 fundId);
    event RewardCharged(uint256 _id, address owner, uint256 rewardId, uint256 amount);
    event RewardNotCharged(uint256 _id, address owner, uint256 rewardId);


    /// @notice Use modifiers to check when deadline is passed
    modifier isDeadlinePassed(uint256 _id) {
        if (block.timestamp > s.funds[_id].deadline) {
            revert Deadline(true);
        }
        _;
    }

    ///@notice Helper reward pool function to gather non-token related rewards
    ///@dev Need to create fake fund 0, with fake pool 0, otherwise contribution won't work universally
    function createZeroData() public {
        LibDiamond.enforceIsContractOwner();
        s.funds.push(
            Fund({
                owner: address(0),
                balance: 0,
                id: 0,
                state: 1,
                deadline: 0,
                level1: 500000000000,
                usdcBalance: 0,
                usdtBalance: 0,
                micros: 0,
                backerNumber: 0
            })
        );
        s.rewards.push(
            RewardPool({
                rewardId: 0,
                fundId: 0,
                totalNumber: 1000000000000000,
                actualNumber: 0,
                pledge: 0,
                owner: msg.sender,
                contractAddress: address(0),
                erc20amount: 0,
                nftId: 0,
                state: 1
            })
        );
    }

/// Prozium + Validace ????stky 
    /// @notice Function to donate to a project
    function contribute(
        uint256 _amountM,
        uint256 _amountD,
        uint256 _id,
        uint256 _currency,
        uint256 _rewardId
    ) public  {
        /// @param _amountM - amount of tokens to be sent to microfund
        /// @param _amountD - amount of tokens to be direcly donated
        /// @notice User can create microfund and donate at the same time
        if (s.funds[_id].state != 1) revert FundInactive(_id);
        if (_amountM < 0) revert InvalidAmount(_amountM);
        if (_amountD < 0) revert InvalidAmount(_amountD);
        /// @notice Transfer function stores amount into this contract, both initial donation and microfund
        /// @dev User approval needed before the donation for _amount (FE part)
        /// @dev Currency recognition
        if (_currency == 1) {
            s.usdc.transferFrom(msg.sender, address(this), _amountD + _amountM);
            s.funds[_id].usdcBalance += _amountD;
        } else if (_currency == 2) {
            s.usdt.transferFrom(msg.sender, address(this), _amountD + _amountM);
            s.funds[_id].usdtBalance += _amountD;
        }
        /// @notice If donated, fund adds balance and related microfunds are involed
        /// @notice Updated the direct donations
        if (_amountD > 0) {
            s.donations.push(
                Donate({
                    id: s.donations.length,
                    fundId: _id,
                    backer: msg.sender,
                    amount: _amountD,
                    state: 1,
                    currency: _currency /// TBD flexible in last stage
                })
            );
            s.funds[_id].backerNumber += 1;
            ///@notice Add total drained amount to the donated event for stats
            uint256 drained = 0;
            drained = drainMicro(_id, _amountD);
            emit Donated(msg.sender, _amountD, _id, _currency, drained);
        }
        /// @notice If microfund created, it is added to the list
        if (_amountM > 0) {
            s.microFunds.push(
                MicroFund({
                    owner: msg.sender,
                    cap: _amountM,
                    microBalance: 0,
                    microId: s.microFunds.length,
                    fundId: _id,
                    state: 1,
                    currency: _currency
                })
            );
            s.funds[_id].micros += 1;
            emit MicroCreated( msg.sender, _amountM, _id, _currency, s.microFunds.length);
        }
        s.funds[_id].balance += _amountD;
        rewardCharge(_id, _rewardId, _amountM + _amountD);
    }

        /// @notice Distributes resources to the owner upon successful funding campaign
    /// @notice All related microfunds, and fund are closed
    /// @notice Check all supported currencies and distribute them to the project owner
    function distribute(uint256 _id) public {
        LibDiamond.enforceIsContractOwner();
        ///@dev currently done manually - need batch for automation
        if (s.funds[_id].state != 1) revert FundInactive(_id);
        if (s.funds[_id].balance <= 0) revert LowBalance(s.funds[_id].balance);
        s.funds[_id].state = 2;
        if (s.funds[_id].usdcBalance > 0) {
            distributeUni(_id, s.funds[_id].usdcBalance, 1, s.usdc);
        } else if (s.funds[_id].usdtBalance > 0) {
            distributeUni(_id, s.funds[_id].usdtBalance, 2, s.usdt);
        }
    }

    /// @notice Internal universal function to distribute resources for each currency
    function distributeUni(
        uint256 _id,
        uint256 _fundBalance,
        uint256 _currency,
        IERC20 _token
    ) internal {
        /// @notice Take fee to Eyeseek treasury
        uint256 fee = 0; // Temporary 0% fee
        uint256 gain = _fundBalance - fee;
        _token.approve(address(this), _fundBalance);
        _token.transferFrom(address(this), s.funds[_id].owner, gain);
        _fundBalance -= gain;
        s.funds[_id].balance -= gain;
        emit DistributionAccomplished(
            s.funds[_id].owner,
            _fundBalance,
            _currency,
            fee
        );
        /// @notice Resources are returned back to the c
        returnMicrofunds(_id, _currency, _token);
    }

    /// @notice - Internal function activated if there are leftovers 
    /// @notice - Working only in completed microfunds
    function returnMicrofunds(uint256 _id, uint256 _currency, IERC20 _token) internal {
        LibDiamond.enforceIsContractOwner();
        if (s.funds[_id].state != 2) revert FundNotClosed(_id);
        for (uint256 i = 0; i < s.microFunds.length; i++) {
        if ( s.microFunds[i].fundId == _id && s.microFunds[i].state == 1 && s.microFunds[i].currency == _currency && s.microFunds[i].cap > s.microFunds[i].microBalance) {
            s.microFunds[i].state = 2; ///@dev closing the microfunds
            uint256 diff = s.microFunds[i].cap - s.microFunds[i].microBalance;
            _token.approve(address(this), diff);
            s.microFunds[i].microBalance = 0; ///@dev resets the microfund
            _token.transferFrom( address(this), s.microFunds[i].owner, diff);
            emit Returned( s.microFunds[i].owner, diff, s.funds[_id].owner);
            }
        }
    }

    /// @notice Charge rewards during contribution process
    function rewardCharge(uint256 _id, uint256 _rewardId, uint256 _charged) internal {
        if ( s.rewards[_rewardId].state == 4) revert FundInactive(_rewardId);
        if ( s.rewards[_rewardId].actualNumber >= s.rewards[_rewardId].totalNumber ) revert RewardFull(_rewardId);
        if ( _rewardId != 0 && s.rewards[_rewardId].pledge > 0 ){
            if (s.rewards[_rewardId].pledge != _charged ) revert InvalidAmount(_charged);
            s.rewards[_rewardId].actualNumber += 1;
            s.rewardList.push(
                Reward({
                    fundId: _id,
                    rewardItemId: s.rewardList.length,
                    rewardId: _rewardId,
                    receiver: msg.sender,
                    state: 1,
                    charged: _charged /// @dev convert from 6 decimals (stablecoins)
                })
            );
            emit RewardCharged(_id, msg.sender, _rewardId, _charged);
        } else {
            emit RewardNotCharged(_id, msg.sender, _rewardId);
        }

    }

    /// @notice If microfunds are deployed on project, contribution function will drain them
    function drainMicro(uint256 _id, uint256 _amount)
        internal
        returns (uint256)
    {
        /// @notice Find all active microfunds related to the main fund and join the chain donation
        uint256 totalDrained = 0;
        for (uint256 i = 0; i < s.microFunds.length; i++) {
            if (
                s.microFunds[i].cap - s.microFunds[i].microBalance >= _amount &&
                s.microFunds[i].fundId == _id &&
                s.microFunds[i].state == 1
            ) {
                s.microFunds[i].microBalance += _amount;
                s.funds[_id].balance += _amount;
                totalDrained += _amount;
                if (s.microFunds[i].currency == 1) {
                    s.funds[_id].usdcBalance += _amount;
                } else if (s.microFunds[i].currency == 2) {
                    s.funds[_id].usdtBalance += _amount;
                }
                /// @notice Close microfund if it reaches its cap
                if (s.microFunds[i].cap == s.microFunds[i].microBalance) {
                    s.microFunds[i].state = 2;
                    emit MicroClosed(
                        s.microFunds[i].owner,
                        s.microFunds[i].cap,
                        s.microFunds[i].fundId
                    );
                }
                emit MicroDrained(s.microFunds[i].owner, _amount, _id);
            }
        }
        return totalDrained;
    }

    ///@notice - Checks balances for each supported currency and returns funds back to the users
    ///@dev 0=Canceled, 1=Active, 2=Finished
    function cancelFund(uint256 _id) public {
        LibDiamond.enforceIsContractOwner();
        if (s.funds[_id].state != 1) revert FundInactive(_id);
        s.funds[_id].state = 0;
        if (s.funds[_id].usdcBalance > 0) {
            cancelUni(_id, 1, s.usdc);
            s.funds[_id].usdcBalance = 0;
        }
        if (s.funds[_id].usdtBalance > 0) {
            cancelUni(_id, 2, s.usdt);
            s.funds[_id].usdtBalance = 0;
        }																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																				        
    }

    ///@notice - Cancel the fund and return the resources to the microfunds, universal for all supported currencies
    function getMicrofundDetail (uint256 _id) public view returns (MicroFund memory) {
        return s.microFunds[_id];
    }

    function cancelUni(
        uint256 _id,
        uint256 _currency,
        IERC20 _token
    ) internal {
        for (uint256 i = 0; i < s.microFunds.length; i++) {
            if (
                s.microFunds[i].fundId == _id &&
                s.microFunds[i].currency == _currency &&
                s.microFunds[i].cap > 0
            ) {
                ///@notice Send back the remaining amount to the microfund owner
                    s.microFunds[i].state = 0;
                    _token.approve(address(this), s.microFunds[i].cap);
                    _token.transferFrom(
                        address(this),
                        s.microFunds[i].owner,
                        s.microFunds[i].cap
                    );
                    emit Returned(
                        s.microFunds[i].owner,
                        s.microFunds[i].cap,
                        s.funds[i].owner
                    );
                    s.microFunds[i].cap = 0;
            }
        }
        ///@dev Fund states - 0=Created, 1=Distributed, 2=Refunded
        for (uint256 i = 0; i < s.donations.length; i++) {
            if (
                s.donations[i].fundId == _id &&
                s.donations[i].state != 0 &&
                s.donations[i].currency == _currency
            ) {
                s.donations[i].state = 0;
                _token.approve(address(this), s.donations[i].amount);
                _token.transferFrom(
                    address(this),
                    s.donations[i].backer,
                    s.donations[i].amount
                );
                emit Refunded(
                    s.donations[i].backer,
                    s.donations[i].amount,
                    _id
                );
            }
        }
    }
}