// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library ERC20Storage {
    bytes32 internal constant STORAGE_SLOT = keccak256("diamond.storage.erc20");

    struct Layout {
        string name;
        string symbol;
        uint8 decimals;
        uint256 totalSupply;
        uint256 maxSupply;
        mapping(address => uint256) balances;
        mapping(address => mapping(address => uint256)) allowances;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}