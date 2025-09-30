// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ERC20Storage.sol";

abstract contract ERC20Internal {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function _balanceOf(address account) internal view returns (uint256) {
        return ERC20Storage.layout().balances[account];
    }

    function _totalSupply() internal view returns (uint256) {
        return ERC20Storage.layout().totalSupply;
    }

    function _allowance(address owner, address spender) internal view returns (uint256) {
        return ERC20Storage.layout().allowances[owner][spender];
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(from != address(0), "ERC20: transfer from zero address");
        require(to != address(0), "ERC20: transfer to zero address");

        ERC20Storage.Layout storage s = ERC20Storage.layout();
        
        uint256 fromBalance = s.balances[from];
        require(fromBalance >= amount, "ERC20: insufficient balance");
        
        unchecked {
            s.balances[from] = fromBalance - amount;
            s.balances[to] += amount;
        }

        emit Transfer(from, to, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal returns (bool) {
        require(owner != address(0), "ERC20: approve from zero address");
        require(spender != address(0), "ERC20: approve to zero address");

        ERC20Storage.layout().allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
        return true;
    }

    function _transferFrom(address from, address to, uint256 amount) internal returns (bool) {
        ERC20Storage.Layout storage s = ERC20Storage.layout();
        
        uint256 currentAllowance = s.allowances[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        
        unchecked {
            _approve(from, msg.sender, currentAllowance - amount);
        }
        
        return _transfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to zero address");

        ERC20Storage.Layout storage s = ERC20Storage.layout();
        
        require(s.totalSupply + amount <= s.maxSupply, "ERC20: exceeds max supply");
        
        s.totalSupply += amount;
        unchecked {
            s.balances[account] += amount;
        }

        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from zero address");

        ERC20Storage.Layout storage s = ERC20Storage.layout();
        
        uint256 accountBalance = s.balances[account];
        require(accountBalance >= amount, "ERC20: burn exceeds balance");
        
        unchecked {
            s.balances[account] = accountBalance - amount;
            s.totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);
    }
}