// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {LibERC20} from "../libraries/LibERC20.sol";
import {LibSwap} from "../libraries/LibSwap.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract SwapFacet {
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event EthWithdrawn(address indexed to, uint256 amount);
    event TokenPriceUpdated(uint256 newPrice);
    event SwapStatusUpdated(bool enabled);
    event Transfer(address indexed from, address indexed to, uint256 value);

    /// @notice Buy BLL tokens with ETH
    /// @dev Tokens are minted to the buyer based on the current price
    function swapEthForTokens() external payable {
        require(msg.value > 0, "Swap: Must send ETH");
        LibSwap.SwapStorage storage ss = LibSwap.swapStorage();
        require(ss.swapEnabled, "Swap: Swapping is disabled");
        require(ss.tokenPrice > 0, "Swap: Token price not set");

        uint256 tokensToMint = (msg.value * 10**LibERC20.erc20Storage().decimals) / ss.tokenPrice;
        require(tokensToMint > 0, "Swap: Amount too small");

        // Mint tokens to buyer
        LibERC20.ERC20Storage storage es = LibERC20.erc20Storage();
        es.balances[msg.sender] += tokensToMint;
        es.totalSupply += tokensToMint;

        ss.totalEthReceived += msg.value;

        emit Transfer(address(0), msg.sender, tokensToMint);
        emit TokensPurchased(msg.sender, msg.value, tokensToMint);
    }

    /// @notice Set the price per token in wei
    /// @param _priceInWei Price per token (e.g., 0.001 ETH = 1000000000000000)
    function setTokenPrice(uint256 _priceInWei) external {
        LibDiamond.enforceIsContractOwner();
        require(_priceInWei > 0, "Swap: Price must be greater than 0");
        LibSwap.swapStorage().tokenPrice = _priceInWei;
        emit TokenPriceUpdated(_priceInWei);
    }

    /// @notice Enable or disable token swapping
    function setSwapEnabled(bool _enabled) external {
        LibDiamond.enforceIsContractOwner();
        LibSwap.swapStorage().swapEnabled = _enabled;
        emit SwapStatusUpdated(_enabled);
    }

    /// @notice Withdraw accumulated ETH (owner only)
    function withdrawEth(address payable _to, uint256 _amount) external {
        LibDiamond.enforceIsContractOwner();
        require(_amount <= address(this).balance, "Swap: Insufficient balance");
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Swap: Transfer failed");
        emit EthWithdrawn(_to, _amount);
    }

    /// @notice Get current token price in wei
    function getTokenPrice() external view returns (uint256) {
        return LibSwap.swapStorage().tokenPrice;
    }

    /// @notice Get total ETH received
    function getTotalEthReceived() external view returns (uint256) {
        return LibSwap.swapStorage().totalEthReceived;
    }

    /// @notice Check if swapping is enabled
    function isSwapEnabled() external view returns (bool) {
        return LibSwap.swapStorage().swapEnabled;
    }

    /// @notice Get contract ETH balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
