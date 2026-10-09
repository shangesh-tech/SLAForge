// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SLAForge} from "../src/SLAForge.sol";

/**
 * @title DeploySLAForge
 * @dev Reads addresses from the environment (see .env.example) and deploys SLAForge.
 *
 *   forge script script/SLAForge.s.sol:DeploySLAForge --rpc-url <RPC_URL> --account deployer --broadcast
 */
contract DeploySLAForge is Script {
    function run() external returns (SLAForge slaForge) {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address monitor = vm.envAddress("MONITOR_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast();
        slaForge = new SLAForge(IERC20(usdc), owner, monitor, treasury);
        vm.stopBroadcast();

        console.log("SLAForge deployed at:", address(slaForge));
        console.log("USDC:    ", usdc);
        console.log("Owner:   ", owner);
        console.log("Monitor: ", monitor);
        console.log("Treasury:", treasury);
    }
}
