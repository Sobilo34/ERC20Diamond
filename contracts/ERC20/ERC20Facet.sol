// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ERC20Internal.sol";
import "./ERC20Storage.sol";

contract ERC20Facet is ERC20Internal {
    
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_
    ) external {
        ERC20Storage.Layout storage s = ERC20Storage.layout();
        require(bytes(s.name).length == 0, "Already initialized");
        
        s.name = name_;
        s.symbol = symbol_;
        s.decimals = 18;
        s.maxSupply = maxSupply_;
    }

    function name() external view returns (string memory) {
        return ERC20Storage.layout().name;
    }

    function symbol() external view returns (string memory) {
        return ERC20Storage.layout().symbol;
    }

    function decimals() external view returns (uint8) {
        return ERC20Storage.layout().decimals;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply();
    }

    function maxSupply() external view returns (uint256) {
        return ERC20Storage.layout().maxSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balanceOf(account);
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowance(owner, spender);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        return _approve(msg.sender, spender, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        return _transferFrom(from, to, amount);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}