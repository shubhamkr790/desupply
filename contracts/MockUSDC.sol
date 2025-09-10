// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    uint8 private _decimals = 6; // USDC uses 6 decimals

    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        // Mint 1 million USDC to deployer for testing
        _mint(msg.sender, 1000000 * 10**_decimals);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // Allow anyone to mint for testing purposes
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // Faucet function for demo
    function faucet() public {
        _mint(msg.sender, 10000 * 10**_decimals); // Give 10,000 USDC
    }
}
