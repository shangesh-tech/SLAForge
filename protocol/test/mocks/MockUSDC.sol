// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Stand-in for Arc USDC (6 decimals). Arc's real USDC needs a native precompile Foundry lacks.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev A token with the wrong decimals, to test the constructor check.
contract Mock18DecimalToken is ERC20 {
    constructor() ERC20("Eighteen", "E18") {}
}
