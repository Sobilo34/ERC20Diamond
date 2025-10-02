// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {LibMultiSig} from "../libraries/LibMultiSig.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract MultiSigFacet {
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event RequirementChanged(uint256 required);
    event TransactionSubmitted(uint256 indexed txId, address indexed to, uint256 value, bytes data);
    event TransactionConfirmed(uint256 indexed txId, address indexed owner);
    event TransactionRevoked(uint256 indexed txId, address indexed owner);
    event TransactionExecuted(uint256 indexed txId);

    modifier onlyMultiSigOwner() {
        require(LibMultiSig.multiSigStorage().isOwner[msg.sender], "MultiSig: Not an owner");
        _;
    }

    modifier txExists(uint256 _txId) {
        require(_txId < LibMultiSig.multiSigStorage().transactions.length, "MultiSig: Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 _txId) {
        require(!LibMultiSig.multiSigStorage().transactions[_txId].executed, "MultiSig: Transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 _txId) {
        require(!LibMultiSig.multiSigStorage().confirmations[_txId][msg.sender], "MultiSig: Transaction already confirmed");
        _;
    }

    function initializeMultiSig(address[] memory _owners, uint256 _required) external {
        LibDiamond.enforceIsContractOwner();
        LibMultiSig.MultiSigStorage storage ms = LibMultiSig.multiSigStorage();
        
        require(ms.owners.length == 0, "MultiSig: Already initialized");
        require(_owners.length > 0, "MultiSig: Owners required");
        require(_required > 0 && _required <= _owners.length, "MultiSig: Invalid required number");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "MultiSig: Invalid owner");
            require(!ms.isOwner[owner], "MultiSig: Owner not unique");

            ms.isOwner[owner] = true;
            ms.owners.push(owner);
            emit OwnerAdded(owner);
        }

        ms.requiredConfirmations = _required;
        emit RequirementChanged(_required);
    }

    function submitTransaction(address _to, uint256 _value, bytes memory _data) external onlyMultiSigOwner returns (uint256) {
        LibMultiSig.MultiSigStorage storage ms = LibMultiSig.multiSigStorage();
        
        uint256 txId = ms.transactions.length;
        ms.transactions.push(LibMultiSig.Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            confirmations: 0
        }));

        emit TransactionSubmitted(txId, _to, _value, _data);
        return txId;
    }

    function confirmTransaction(uint256 _txId) 
        external 
        onlyMultiSigOwner 
        txExists(_txId) 
        notExecuted(_txId) 
        notConfirmed(_txId) 
    {
        LibMultiSig.MultiSigStorage storage ms = LibMultiSig.multiSigStorage();
        ms.confirmations[_txId][msg.sender] = true;
        ms.transactions[_txId].confirmations += 1;
        emit TransactionConfirmed(_txId, msg.sender);
    }

    function executeTransaction(uint256 _txId) 
        external 
        onlyMultiSigOwner 
        txExists(_txId) 
        notExecuted(_txId) 
    {
        LibMultiSig.MultiSigStorage storage ms = LibMultiSig.multiSigStorage();
        LibMultiSig.Transaction storage transaction = ms.transactions[_txId];
        
        require(transaction.confirmations >= ms.requiredConfirmations, "MultiSig: Not enough confirmations");

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "MultiSig: Transaction execution failed");

        emit TransactionExecuted(_txId);
    }

    function revokeConfirmation(uint256 _txId) 
        external 
        onlyMultiSigOwner 
        txExists(_txId) 
        notExecuted(_txId) 
    {
        LibMultiSig.MultiSigStorage storage ms = LibMultiSig.multiSigStorage();
        require(ms.confirmations[_txId][msg.sender], "MultiSig: Transaction not confirmed");

        ms.confirmations[_txId][msg.sender] = false;
        ms.transactions[_txId].confirmations -= 1;
        emit TransactionRevoked(_txId, msg.sender);
    }

    function addOwner(address _owner) external {
        LibDiamond.enforceIsContractOwner();
        LibMultiSig.MultiSigStorage storage ms = LibMultiSig.multiSigStorage();
        
        require(_owner != address(0), "MultiSig: Invalid owner");
        require(!ms.isOwner[_owner], "MultiSig: Owner exists");

        ms.isOwner[_owner] = true;
        ms.owners.push(_owner);
        emit OwnerAdded(_owner);
    }

    function removeOwner(address _owner) external {
        LibDiamond.enforceIsContractOwner();
        LibMultiSig.MultiSigStorage storage ms = LibMultiSig.multiSigStorage();
        
        require(ms.isOwner[_owner], "MultiSig: Not an owner");
        require(ms.owners.length - 1 >= ms.requiredConfirmations, "MultiSig: Cannot remove owner");

        ms.isOwner[_owner] = false;
        
        for (uint256 i = 0; i < ms.owners.length; i++) {
            if (ms.owners[i] == _owner) {
                ms.owners[i] = ms.owners[ms.owners.length - 1];
                ms.owners.pop();
                break;
            }
        }
        emit OwnerRemoved(_owner);
    }

    function changeRequirement(uint256 _required) external {
        LibDiamond.enforceIsContractOwner();
        LibMultiSig.MultiSigStorage storage ms = LibMultiSig.multiSigStorage();
        
        require(_required > 0 && _required <= ms.owners.length, "MultiSig: Invalid required number");
        ms.requiredConfirmations = _required;
        emit RequirementChanged(_required);
    }

    function getOwners() external view returns (address[] memory) {
        return LibMultiSig.multiSigStorage().owners;
    }

    function getRequiredConfirmations() external view returns (uint256) {
        return LibMultiSig.multiSigStorage().requiredConfirmations;
    }

    function getTransactionCount() external view returns (uint256) {
        return LibMultiSig.multiSigStorage().transactions.length;
    }

    function getTransaction(uint256 _txId) external view returns (
        address to,
        uint256 value,
        bytes memory data,
        bool executed,
        uint256 confirmations
    ) {
        LibMultiSig.Transaction storage transaction = LibMultiSig.multiSigStorage().transactions[_txId];
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.confirmations
        );
    }

    function isConfirmed(uint256 _txId, address _owner) external view returns (bool) {
        return LibMultiSig.multiSigStorage().confirmations[_txId][_owner];
    }

    function isOwner(address _address) external view returns (bool) {
        return LibMultiSig.multiSigStorage().isOwner[_address];
    }
}
