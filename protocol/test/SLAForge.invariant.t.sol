// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SLAForge} from "../src/SLAForge.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @dev Drives SLAForge with random but valid actions; skips actions that would revert.
contract SLAForgeHandler is Test {
    SLAForge public forge;
    MockUSDC public usdc;
    address public monitor;

    address[] public providers;
    address[] public customers;

    uint256 public ghostFees;
    uint256 public ghostSlashed;
    uint256 public ghostMinted;

    constructor(SLAForge _forge, MockUSDC _usdc, address _monitor) {
        forge = _forge;
        usdc = _usdc;
        monitor = _monitor;
        for (uint256 i = 0; i < 3; i++) {
            providers.push(makeAddr(string.concat("provider", vm.toString(i))));
            customers.push(makeAddr(string.concat("customer", vm.toString(i))));
        }
        for (uint256 i = 0; i < 3; i++) {
            _fund(providers[i]);
            _fund(customers[i]);
        }
    }

    function _fund(address who) internal {
        usdc.mint(who, 1_000_000e6);
        ghostMinted += 1_000_000e6;
        vm.prank(who);
        usdc.approve(address(forge), type(uint256).max);
    }

    function actors() external view returns (address[] memory all) {
        all = new address[](6);
        for (uint256 i = 0; i < 3; i++) {
            all[i] = providers[i];
            all[i + 3] = customers[i];
        }
    }

    function listService(uint256 who, uint256 bond, uint256 price, uint256 duration) external {
        SLAForge.PlanStruct[] memory plans = new SLAForge.PlanStruct[](1);
        plans[0] = SLAForge.PlanStruct({
            price: bound(price, 1e6, 10_000e6),
            duration: bound(duration, 5 minutes, 60 days)
        });
        vm.prank(providers[who % 3]);
        forge.listService(
            "Invariant service",
            "A service listed by the invariant handler.",
            SLAForge.Category.API,
            "https://example.com/health",
            "https://example.com/docs",
            9_990,
            200,
            bound(bond, 1e6, 100e6),
            plans
        );
    }

    function createAgreement(uint256 who, uint256 serviceSeed) external {
        uint256 total = forge.totalServiceIds();
        if (total == 0) return;
        uint256 serviceId = serviceSeed % total + 1;
        if (forge.getServiceById(serviceId).status != SLAForge.ServiceStatus.Bonded) return;
        vm.prank(customers[who % 3]);
        forge.createAgreement(serviceId, 0);
        ghostFees += forge.PLATFORM_FEE();
    }

    function settle(uint256 agreementSeed, bool met) external {
        uint256 total = forge.totalAgreementIds();
        if (total == 0) return;
        uint256 id = agreementSeed % total + 1;
        SLAForge.AgreementView memory a = forge.getAgreementById(id);
        if (a.status != SLAForge.AgreementStatus.Active) return;
        if (met && block.timestamp < a.endTime) vm.warp(a.endTime);
        uint256 bond = forge.getServiceById(a.serviceId).bond;
        vm.prank(monitor);
        forge.settleAgreement(id, met);
        if (!met) ghostSlashed += bond;
    }

    function withdraw(uint256 who) external {
        address account = who % 2 == 0 ? providers[who % 3] : customers[who % 3];
        if (forge.withdrawableBalance(account) == 0) return;
        vm.prank(account);
        forge.withdraw();
    }

    function rebond(uint256 serviceSeed, uint256 bond) external {
        uint256 total = forge.totalServiceIds();
        if (total == 0) return;
        SLAForge.ServiceView memory s = forge.getServiceById(serviceSeed % total + 1);
        if (s.status == SLAForge.ServiceStatus.Bonded) return;
        vm.prank(s.provider);
        forge.rebondService(s.id, bound(bond, 1e6, 100e6));
    }

    function increaseBond(uint256 serviceSeed, uint256 amount) external {
        uint256 total = forge.totalServiceIds();
        if (total == 0) return;
        SLAForge.ServiceView memory s = forge.getServiceById(serviceSeed % total + 1);
        uint256 room = forge.MAX_BOND() - s.bond;
        if (s.status != SLAForge.ServiceStatus.Bonded || room == 0) return;
        amount = bound(amount, 1, room);
        vm.prank(s.provider);
        forge.increaseBond(s.id, amount);
    }

    function delist(uint256 serviceSeed) external {
        uint256 total = forge.totalServiceIds();
        if (total == 0) return;
        SLAForge.ServiceView memory s = forge.getServiceById(serviceSeed % total + 1);
        if (s.status == SLAForge.ServiceStatus.Delisted || s.activeAgreements > 0) return;
        vm.prank(s.provider);
        forge.delistService(s.id);
    }

    function warp(uint256 seconds_) external {
        vm.warp(block.timestamp + bound(seconds_, 1, 30 days));
    }
}

/// forge-config: default.invariant.runs = 128
/// forge-config: default.invariant.depth = 64
/// forge-config: default.invariant.fail-on-revert = true
contract SLAForgeInvariantTest is Test {
    SLAForge internal forge;
    MockUSDC internal usdc;
    SLAForgeHandler internal handler;
    address internal treasury = makeAddr("treasury");

    function setUp() public {
        usdc = new MockUSDC();
        address monitor = makeAddr("monitor");
        forge = new SLAForge(IERC20(address(usdc)), makeAddr("owner"), monitor, treasury);
        handler = new SLAForgeHandler(forge, usdc, monitor);
        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](8);
        selectors[0] = SLAForgeHandler.listService.selector;
        selectors[1] = SLAForgeHandler.createAgreement.selector;
        selectors[2] = SLAForgeHandler.settle.selector;
        selectors[3] = SLAForgeHandler.withdraw.selector;
        selectors[4] = SLAForgeHandler.rebond.selector;
        selectors[5] = SLAForgeHandler.delist.selector;
        selectors[6] = SLAForgeHandler.warp.selector;
        selectors[7] = SLAForgeHandler.increaseBond.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// The contract holds exactly: every bond + every active payment + every unpaid credit.
    function invariant_ContractIsFullyBacked() public view {
        uint256 owed;
        SLAForge.ServiceView[] memory services = forge.getServices(0, forge.totalServiceIds());
        for (uint256 i = 0; i < services.length; i++) {
            owed += services[i].bond;
        }
        for (uint256 id = 1; id <= forge.totalAgreementIds(); id++) {
            SLAForge.AgreementView memory a = forge.getAgreementById(id);
            if (a.status == SLAForge.AgreementStatus.Active) owed += a.price;
        }
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; i++) {
            owed += forge.withdrawableBalance(actors[i]);
        }
        assertEq(usdc.balanceOf(address(forge)), owed);
    }

    /// The treasury only ever receives platform fees and slashed bonds.
    function invariant_TreasuryGetsFeesAndSlashesOnly() public view {
        assertEq(usdc.balanceOf(treasury), handler.ghostFees() + handler.ghostSlashed());
        assertEq(forge.withdrawableBalance(treasury), 0);
    }

    /// No USDC is created or lost: users + treasury + contract = everything minted.
    function invariant_UsdcIsConserved() public view {
        uint256 sum = usdc.balanceOf(address(forge)) + usdc.balanceOf(treasury);
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; i++) {
            sum += usdc.balanceOf(actors[i]);
        }
        assertEq(sum, handler.ghostMinted());
    }

    /// Each service's activeAgreements counter matches its active agreements;
    /// slashed and delisted services hold no bond.
    function invariant_ServiceBookkeeping() public view {
        uint256 total = forge.totalServiceIds();
        uint256[] memory active = new uint256[](total + 1);
        for (uint256 id = 1; id <= forge.totalAgreementIds(); id++) {
            SLAForge.AgreementView memory a = forge.getAgreementById(id);
            if (a.status == SLAForge.AgreementStatus.Active) active[a.serviceId]++;
        }
        for (uint256 id = 1; id <= total; id++) {
            SLAForge.ServiceView memory s = forge.getServiceById(id);
            assertEq(s.activeAgreements, active[id]);
            if (s.status != SLAForge.ServiceStatus.Bonded) assertEq(s.bond, 0);
            else assertTrue(s.bond >= forge.MIN_BOND() && s.bond <= forge.MAX_BOND());
        }
    }
}
