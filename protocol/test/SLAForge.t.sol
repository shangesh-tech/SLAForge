// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SLAForge} from "../src/SLAForge.sol";
import {MockUSDC, Mock18DecimalToken} from "./mocks/MockUSDC.sol";

contract SLAForgeTest is Test {
    SLAForge internal forge;
    MockUSDC internal usdc;

    address internal owner = makeAddr("owner");
    address internal monitor = makeAddr("monitor");
    address internal treasury = makeAddr("treasury");
    address internal provider = makeAddr("provider");
    address internal provider2 = makeAddr("provider2");
    address internal customer = makeAddr("customer");
    address internal customer2 = makeAddr("customer2");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant USDC = 1e6;
    uint256 internal constant BOND = 50 * USDC;
    uint256 internal constant FEE = 100_000;
    uint256 internal constant SHORT_PRICE = 1 * USDC;
    uint256 internal constant MONTH_PRICE = 120 * USDC;

    string internal constant NAME = "Streamlet API";
    string internal constant DESCRIPTION = "Video, image and document delivery through one API.";
    string internal constant ENDPOINT = "https://api.streamletedge.com/health";
    string internal constant DOCS = "https://docs.streamlet.in";
    uint256 internal constant UPTIME = 9_990;
    uint256 internal constant LATENCY = 200;

    /// Every argument of listService, so a test can change one field.
    struct Listing {
        string name;
        string description;
        SLAForge.Category category;
        string endpoint;
        string docsUrl;
        uint256 uptimeBps;
        uint256 maxLatencyMs;
        uint256 bond;
        SLAForge.PlanStruct[] plans;
    }

    function setUp() public {
        usdc = new MockUSDC();
        forge = new SLAForge(IERC20(address(usdc)), owner, monitor, treasury);

        address[4] memory users = [provider, provider2, customer, customer2];
        for (uint256 i = 0; i < users.length; i++) {
            usdc.mint(users[i], 10_000 * USDC);
            vm.prank(users[i]);
            usdc.approve(address(forge), type(uint256).max);
        }
    }

    // =====================================================================
    //                               HELPERS
    // =====================================================================

    function _plans() internal pure returns (SLAForge.PlanStruct[] memory plans) {
        plans = new SLAForge.PlanStruct[](2);
        plans[0] = SLAForge.PlanStruct({price: SHORT_PRICE, duration: 5 minutes});
        plans[1] = SLAForge.PlanStruct({price: MONTH_PRICE, duration: 30 days});
    }

    function _listing() internal pure returns (Listing memory l) {
        l = Listing({
            name: NAME,
            description: DESCRIPTION,
            category: SLAForge.Category.API,
            endpoint: ENDPOINT,
            docsUrl: DOCS,
            uptimeBps: UPTIME,
            maxLatencyMs: LATENCY,
            bond: BOND,
            plans: _plans()
        });
    }

    function _submit(address from, Listing memory l) internal returns (uint256) {
        vm.prank(from);
        return forge.listService(
            l.name, l.description, l.category, l.endpoint, l.docsUrl, l.uptimeBps, l.maxLatencyMs, l.bond, l.plans
        );
    }

    function _list() internal returns (uint256) {
        return _submit(provider, _listing());
    }

    function _listWithBond(uint256 bond) internal returns (uint256) {
        Listing memory l = _listing();
        l.bond = bond;
        return _submit(provider, l);
    }

    function _expectListRevert(Listing memory l, bytes4 selector) internal {
        vm.expectRevert(selector);
        _submit(provider, l);
    }

    function _buy(address who, uint256 serviceId, uint256 planIndex) internal returns (uint256) {
        vm.prank(who);
        return forge.createAgreement(serviceId, planIndex);
    }

    function _settle(uint256 agreementId, bool met) internal {
        vm.prank(monitor);
        forge.settleAgreement(agreementId, met);
    }

    function _repeat(bytes1 char, uint256 length) internal pure returns (string memory) {
        bytes memory out = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            out[i] = char;
        }
        return string(out);
    }

    // =====================================================================
    //                             CONSTRUCTOR
    // =====================================================================

    function test_Constructor_SetsState() public view {
        assertEq(address(forge.USDC()), address(usdc));
        assertEq(forge.owner(), owner);
        assertEq(forge.monitor(), monitor);
        assertEq(forge.treasury(), treasury);
        assertEq(forge.totalServiceIds(), 0);
        assertEq(forge.totalAgreementIds(), 0);
        assertFalse(forge.paused());
    }

    function test_Constants() public view {
        assertEq(forge.PLATFORM_FEE(), 100_000);
        assertEq(forge.MIN_BOND(), 1 * USDC);
        assertEq(forge.MAX_BOND(), 100 * USDC);
        assertEq(forge.MIN_PLAN_PRICE(), 1 * USDC);
        assertEq(forge.MAX_PLANS(), 6);
    }

    function test_Constructor_EmitsRoleEvents() public {
        vm.expectEmit(true, true, false, false);
        emit SLAForge.MonitorUpdated(address(0), monitor);
        vm.expectEmit(true, true, false, false);
        emit SLAForge.TreasuryUpdated(address(0), treasury);
        new SLAForge(IERC20(address(usdc)), owner, monitor, treasury);
    }

    function test_RevertWhen_ConstructorZeroUsdc() public {
        vm.expectRevert(SLAForge.ZeroAddress.selector);
        new SLAForge(IERC20(address(0)), owner, monitor, treasury);
    }

    function test_RevertWhen_ConstructorZeroMonitor() public {
        vm.expectRevert(SLAForge.ZeroAddress.selector);
        new SLAForge(IERC20(address(usdc)), owner, address(0), treasury);
    }

    function test_RevertWhen_ConstructorZeroTreasury() public {
        vm.expectRevert(SLAForge.ZeroAddress.selector);
        new SLAForge(IERC20(address(usdc)), owner, monitor, address(0));
    }

    function test_RevertWhen_ConstructorZeroOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new SLAForge(IERC20(address(usdc)), address(0), monitor, treasury);
    }

    function test_RevertWhen_ConstructorTokenNotSixDecimals() public {
        Mock18DecimalToken token = new Mock18DecimalToken();
        vm.expectRevert(SLAForge.UnsupportedToken.selector);
        new SLAForge(IERC20(address(token)), owner, monitor, treasury);
    }

    // =====================================================================
    //                             LIST SERVICE
    // =====================================================================

    function test_ListService_StoresServiceAndLocksBond() public {
        uint256 before = usdc.balanceOf(provider);
        uint256 id = _list();

        assertEq(id, 1);
        assertEq(forge.totalServiceIds(), 1);
        assertEq(usdc.balanceOf(provider), before - BOND);
        assertEq(usdc.balanceOf(address(forge)), BOND);

        SLAForge.ServiceView memory s = forge.getServiceById(id);
        assertEq(s.id, 1);
        assertEq(s.provider, provider);
        assertEq(uint256(s.status), uint256(SLAForge.ServiceStatus.Bonded));
        assertEq(uint256(s.category), uint256(SLAForge.Category.API));
        assertEq(s.uptimeBps, UPTIME);
        assertEq(s.maxLatencyMs, LATENCY);
        assertEq(s.activeAgreements, 0);
        assertEq(s.bond, BOND);
        assertEq(s.name, NAME);
        assertEq(s.description, DESCRIPTION);
        assertEq(s.endpoint, ENDPOINT);
        assertEq(s.docsUrl, DOCS);
        assertEq(s.plans.length, 2);
        assertEq(s.plans[0].price, SHORT_PRICE);
        assertEq(s.plans[0].duration, 5 minutes);
        assertEq(s.plans[1].price, MONTH_PRICE);
        assertEq(s.plans[1].duration, 30 days);

        uint256[] memory ids = forge.getServiceIdsByProvider(provider);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    function test_ListService_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit SLAForge.ServiceListed(1, provider, SLAForge.Category.API, NAME, BOND);
        _list();
    }

    function test_ListService_IdsIncrement() public {
        assertEq(_list(), 1);
        assertEq(_submit(provider2, _listing()), 2);
        assertEq(_list(), 3);
        assertEq(forge.getServiceIdsByProvider(provider).length, 2);
        assertEq(forge.getServiceIdsByProvider(provider2).length, 1);
    }

    function test_ListService_AcceptsBoundaryValues() public {
        Listing memory l = _listing();
        l.name = _repeat("a", 3);
        l.description = _repeat("d", 30);
        l.uptimeBps = 9_500;
        l.maxLatencyMs = 1;
        l.bond = 1 * USDC;
        l.endpoint = _repeat("e", 200);
        l.docsUrl = _repeat("u", 200);
        _submit(provider, l);

        l.name = _repeat("a", 60);
        l.description = _repeat("d", 1000);
        l.uptimeBps = 10_000;
        l.maxLatencyMs = 60_000;
        l.bond = 100 * USDC;
        l.plans = new SLAForge.PlanStruct[](6);
        for (uint256 i = 0; i < 6; i++) {
            l.plans[i] = SLAForge.PlanStruct({price: 1 * USDC, duration: i % 2 == 0 ? 5 minutes : 365 days});
        }
        _submit(provider, l);
        assertEq(forge.totalServiceIds(), 2);
    }

    function test_RevertWhen_ListBondBelowMinimum() public {
        Listing memory l = _listing();
        l.bond = 1 * USDC - 1;
        _expectListRevert(l, SLAForge.BondTooLow.selector);
        l.bond = 0;
        _expectListRevert(l, SLAForge.BondTooLow.selector);
    }

    function test_RevertWhen_ListBondAboveMaximum() public {
        Listing memory l = _listing();
        l.bond = 100 * USDC + 1;
        _expectListRevert(l, SLAForge.BondTooHigh.selector);
    }

    function test_RevertWhen_ListNameInvalid() public {
        Listing memory l = _listing();
        l.name = "ab";
        _expectListRevert(l, SLAForge.InvalidNameLength.selector);
        l.name = _repeat("a", 61);
        _expectListRevert(l, SLAForge.InvalidNameLength.selector);
    }

    function test_RevertWhen_ListDescriptionInvalid() public {
        Listing memory l = _listing();
        l.description = _repeat("d", 29);
        _expectListRevert(l, SLAForge.InvalidDescriptionLength.selector);
        l.description = _repeat("d", 1001);
        _expectListRevert(l, SLAForge.InvalidDescriptionLength.selector);
    }

    function test_RevertWhen_ListEndpointInvalid() public {
        Listing memory l = _listing();
        l.endpoint = "";
        _expectListRevert(l, SLAForge.InvalidEndpointLength.selector);
        l.endpoint = _repeat("e", 201);
        _expectListRevert(l, SLAForge.InvalidEndpointLength.selector);
    }

    function test_RevertWhen_ListDocsUrlInvalid() public {
        Listing memory l = _listing();
        l.docsUrl = "";
        _expectListRevert(l, SLAForge.InvalidDocsUrlLength.selector);
        l.docsUrl = _repeat("u", 201);
        _expectListRevert(l, SLAForge.InvalidDocsUrlLength.selector);
    }

    function test_RevertWhen_ListUptimeInvalid() public {
        Listing memory l = _listing();
        l.uptimeBps = 9_499;
        _expectListRevert(l, SLAForge.InvalidUptimeTarget.selector);
        l.uptimeBps = 10_001;
        _expectListRevert(l, SLAForge.InvalidUptimeTarget.selector);
    }

    function test_RevertWhen_ListLatencyInvalid() public {
        Listing memory l = _listing();
        l.maxLatencyMs = 0;
        _expectListRevert(l, SLAForge.InvalidLatencyTarget.selector);
        l.maxLatencyMs = 60_001;
        _expectListRevert(l, SLAForge.InvalidLatencyTarget.selector);
    }

    function test_RevertWhen_ListPlanCountInvalid() public {
        Listing memory l = _listing();
        l.plans = new SLAForge.PlanStruct[](0);
        _expectListRevert(l, SLAForge.InvalidPlanCount.selector);
        l.plans = new SLAForge.PlanStruct[](7);
        for (uint256 i = 0; i < 7; i++) {
            l.plans[i] = SLAForge.PlanStruct({price: USDC, duration: 1 days});
        }
        _expectListRevert(l, SLAForge.InvalidPlanCount.selector);
    }

    function test_RevertWhen_ListPlanPriceTooLow() public {
        Listing memory l = _listing();
        l.plans[1].price = 1 * USDC - 1;
        _expectListRevert(l, SLAForge.InvalidPlanPrice.selector);
    }

    function test_RevertWhen_ListPlanDurationInvalid() public {
        Listing memory l = _listing();
        l.plans[0].duration = 5 minutes - 1;
        _expectListRevert(l, SLAForge.InvalidPlanDuration.selector);
        l.plans[0].duration = 365 days + 1;
        _expectListRevert(l, SLAForge.InvalidPlanDuration.selector);
    }

    function test_RevertWhen_ListWithoutAllowance() public {
        usdc.mint(stranger, 1_000 * USDC);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(forge), 0, BOND)
        );
        _submit(stranger, _listing());
    }

    function test_RevertWhen_ListWithoutBalance() public {
        vm.prank(stranger);
        usdc.approve(address(forge), type(uint256).max);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, stranger, 0, BOND)
        );
        _submit(stranger, _listing());
    }

    function test_RevertWhen_ListWhilePaused() public {
        vm.prank(owner);
        forge.pause();
        _expectListRevert(_listing(), Pausable.EnforcedPause.selector);
    }

    // =====================================================================
    //                           CREATE AGREEMENT
    // =====================================================================

    function test_CreateAgreement_FundsEscrowAndPaysFee() public {
        uint256 serviceId = _list();
        uint256 before = usdc.balanceOf(customer);

        uint256 id = _buy(customer, serviceId, 1);

        assertEq(id, 1);
        assertEq(forge.totalAgreementIds(), 1);
        assertEq(usdc.balanceOf(customer), before - MONTH_PRICE - FEE);
        assertEq(usdc.balanceOf(address(forge)), BOND + MONTH_PRICE);
        assertEq(usdc.balanceOf(treasury), FEE);

        SLAForge.AgreementView memory a = forge.getAgreementById(id);
        assertEq(a.id, 1);
        assertEq(a.serviceId, serviceId);
        assertEq(a.customer, customer);
        assertEq(a.provider, provider);
        assertEq(a.planIndex, 1);
        assertEq(uint256(a.status), uint256(SLAForge.AgreementStatus.Active));
        assertEq(a.price, MONTH_PRICE);
        assertEq(a.startTime, block.timestamp);
        assertEq(a.endTime, block.timestamp + 30 days);

        assertEq(forge.getServiceById(serviceId).activeAgreements, 1);
        uint256[] memory ids = forge.getAgreementIdsByCustomer(customer);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    function test_CreateAgreement_EmitsEvent() public {
        uint256 serviceId = _list();
        vm.expectEmit(true, true, true, true);
        emit SLAForge.AgreementCreated(1, serviceId, customer, 0, SHORT_PRICE, block.timestamp + 5 minutes);
        _buy(customer, serviceId, 0);
    }

    function test_CreateAgreement_ManyAgreementsCountTowardsService() public {
        uint256 serviceId = _list();
        _buy(customer, serviceId, 0);
        _buy(customer2, serviceId, 1);
        _buy(customer, serviceId, 1);
        assertEq(forge.getServiceById(serviceId).activeAgreements, 3);
        assertEq(forge.getAgreementIdsByCustomer(customer).length, 2);
        assertEq(usdc.balanceOf(treasury), 3 * FEE);
    }

    function test_QuoteAgreement() public {
        uint256 serviceId = _list();
        (uint256 price, uint256 fee, uint256 total) = forge.quoteAgreement(serviceId, 1);
        assertEq(price, MONTH_PRICE);
        assertEq(fee, FEE);
        assertEq(total, MONTH_PRICE + FEE);
    }

    function test_RevertWhen_QuoteUnknownServiceOrPlan() public {
        vm.expectRevert(SLAForge.ServiceNotFound.selector);
        forge.quoteAgreement(1, 0);
        uint256 serviceId = _list();
        vm.expectRevert(SLAForge.InvalidPlanIndex.selector);
        forge.quoteAgreement(serviceId, 2);
    }

    function test_RevertWhen_BuyUnknownService() public {
        vm.expectRevert(SLAForge.ServiceNotFound.selector);
        _buy(customer, 99, 0);
    }

    function test_RevertWhen_BuyInvalidPlan() public {
        uint256 serviceId = _list();
        vm.expectRevert(SLAForge.InvalidPlanIndex.selector);
        _buy(customer, serviceId, 2);
    }

    function test_RevertWhen_BuySlashedService() public {
        uint256 serviceId = _list();
        _settle(_buy(customer, serviceId, 0), false);
        vm.expectRevert(SLAForge.ServiceNotBonded.selector);
        _buy(customer2, serviceId, 0);
    }

    function test_RevertWhen_BuyDelistedService() public {
        uint256 serviceId = _list();
        vm.prank(provider);
        forge.delistService(serviceId);
        vm.expectRevert(SLAForge.ServiceNotBonded.selector);
        _buy(customer, serviceId, 0);
    }

    function test_RevertWhen_BuyWithoutFeeAllowance() public {
        uint256 serviceId = _list();
        usdc.mint(stranger, 1_000 * USDC);
        vm.prank(stranger);
        usdc.approve(address(forge), SHORT_PRICE); // price only, fee missing
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(forge), 0, FEE)
        );
        _buy(stranger, serviceId, 0);
    }

    function test_RevertWhen_BuyWhilePaused() public {
        uint256 serviceId = _list();
        vm.prank(owner);
        forge.pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        _buy(customer, serviceId, 0);
    }

    // =====================================================================
    //                              SETTLEMENT
    // =====================================================================

    function test_Settle_MetCreditsProviderAndKeepsBond() public {
        uint256 serviceId = _list();
        uint256 id = _buy(customer, serviceId, 1);
        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(true, true, false, true);
        emit SLAForge.AgreementSettled(id, serviceId, SLAForge.AgreementStatus.Passed, provider, MONTH_PRICE);
        _settle(id, true);

        assertEq(uint256(forge.getAgreementById(id).status), uint256(SLAForge.AgreementStatus.Passed));
        assertEq(forge.withdrawableBalance(provider), MONTH_PRICE);
        assertEq(forge.withdrawableBalance(customer), 0);

        SLAForge.ServiceView memory s = forge.getServiceById(serviceId);
        assertEq(uint256(s.status), uint256(SLAForge.ServiceStatus.Bonded));
        assertEq(s.bond, BOND);
        assertEq(s.activeAgreements, 0);
        // Nothing has left the contract yet: credits are pulled with withdraw().
        assertEq(usdc.balanceOf(address(forge)), BOND + MONTH_PRICE);
    }

    function test_Settle_MissedRefundsCustomerAndSlashesBond() public {
        uint256 serviceId = _list();
        uint256 id = _buy(customer, serviceId, 1);

        vm.expectEmit(true, true, false, true);
        emit SLAForge.AgreementSettled(id, serviceId, SLAForge.AgreementStatus.Failed, customer, MONTH_PRICE);
        vm.expectEmit(true, true, false, true);
        emit SLAForge.BondSlashed(serviceId, id, BOND);
        _settle(id, false); // a miss can be reported before the end

        assertEq(uint256(forge.getAgreementById(id).status), uint256(SLAForge.AgreementStatus.Failed));
        assertEq(forge.withdrawableBalance(customer), MONTH_PRICE);
        assertEq(forge.withdrawableBalance(provider), 0);
        assertEq(usdc.balanceOf(treasury), FEE + BOND);

        SLAForge.ServiceView memory s = forge.getServiceById(serviceId);
        assertEq(uint256(s.status), uint256(SLAForge.ServiceStatus.Slashed));
        assertEq(s.bond, 0);
        assertEq(s.activeAgreements, 0);
        assertEq(usdc.balanceOf(address(forge)), MONTH_PRICE);
    }

    function test_Settle_MetAllowedExactlyAtEndTime() public {
        uint256 id = _buy(customer, _list(), 0);
        vm.warp(forge.getAgreementById(id).endTime);
        _settle(id, true);
        assertEq(forge.withdrawableBalance(provider), SHORT_PRICE);
    }

    function test_RevertWhen_SettleMetBeforeEnd() public {
        uint256 id = _buy(customer, _list(), 0);
        vm.warp(forge.getAgreementById(id).endTime - 1);
        vm.expectRevert(SLAForge.AgreementNotEnded.selector);
        _settle(id, true);
    }

    function test_Settle_SecondMissOnSlashedServiceOnlyRefunds() public {
        uint256 serviceId = _list();
        uint256 first = _buy(customer, serviceId, 1);
        uint256 second = _buy(customer2, serviceId, 0);

        _settle(first, false);
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        _settle(second, false);

        assertEq(usdc.balanceOf(treasury), treasuryBefore); // the bond is already gone
        assertEq(forge.withdrawableBalance(customer2), SHORT_PRICE);
        assertEq(forge.getServiceById(serviceId).activeAgreements, 0);
    }

    function test_Settle_OpenAgreementOnSlashedServiceCanStillPass() public {
        uint256 serviceId = _list();
        uint256 missed = _buy(customer, serviceId, 0);
        uint256 kept = _buy(customer2, serviceId, 0);
        _settle(missed, false);

        vm.warp(block.timestamp + 5 minutes);
        _settle(kept, true);
        assertEq(forge.withdrawableBalance(provider), SHORT_PRICE);
    }

    function test_Settle_WorksWhilePaused() public {
        uint256 id = _buy(customer, _list(), 0);
        vm.prank(owner);
        forge.pause();
        _settle(id, false);
        assertEq(forge.withdrawableBalance(customer), SHORT_PRICE);
    }

    function test_RevertWhen_SettleByNonMonitor() public {
        uint256 id = _buy(customer, _list(), 0);
        address[4] memory callers = [owner, provider, customer, stranger];
        for (uint256 i = 0; i < callers.length; i++) {
            vm.expectRevert(SLAForge.NotMonitor.selector);
            vm.prank(callers[i]);
            forge.settleAgreement(id, false);
        }
    }

    function test_RevertWhen_SettleUnknownAgreement() public {
        vm.expectRevert(SLAForge.AgreementNotFound.selector);
        _settle(1, false);
    }

    function test_RevertWhen_SettleTwice() public {
        uint256 id = _buy(customer, _list(), 0);
        _settle(id, false);
        vm.expectRevert(SLAForge.AgreementNotActive.selector);
        _settle(id, false);
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(SLAForge.AgreementNotActive.selector);
        _settle(id, true);
    }

    // =====================================================================
    //                               WITHDRAW
    // =====================================================================

    function test_Withdraw_RefundToCustomer() public {
        uint256 id = _buy(customer, _list(), 1);
        _settle(id, false);
        uint256 before = usdc.balanceOf(customer);

        vm.expectEmit(true, false, false, true);
        emit SLAForge.Withdrawn(customer, MONTH_PRICE);
        vm.prank(customer);
        forge.withdraw();

        assertEq(usdc.balanceOf(customer), before + MONTH_PRICE);
        assertEq(forge.withdrawableBalance(customer), 0);
        assertEq(usdc.balanceOf(address(forge)), 0);
    }

    function test_Withdraw_AccumulatedEarningsToProvider() public {
        uint256 serviceId = _list();
        uint256 a = _buy(customer, serviceId, 0);
        uint256 b = _buy(customer2, serviceId, 1);
        vm.warp(block.timestamp + 30 days);
        _settle(a, true);
        _settle(b, true);

        uint256 before = usdc.balanceOf(provider);
        vm.prank(provider);
        forge.withdraw();
        assertEq(usdc.balanceOf(provider), before + SHORT_PRICE + MONTH_PRICE);
        assertEq(usdc.balanceOf(address(forge)), BOND); // only the bond stays
    }

    function test_Withdraw_WorksWhilePaused() public {
        uint256 id = _buy(customer, _list(), 0);
        _settle(id, false);
        vm.prank(owner);
        forge.pause();
        vm.prank(customer);
        forge.withdraw();
        assertEq(forge.withdrawableBalance(customer), 0);
    }

    function test_RevertWhen_WithdrawNothing() public {
        vm.expectRevert(SLAForge.NothingToWithdraw.selector);
        vm.prank(customer);
        forge.withdraw();
    }

    function test_RevertWhen_WithdrawTwice() public {
        _settle(_buy(customer, _list(), 0), false);
        vm.startPrank(customer);
        forge.withdraw();
        vm.expectRevert(SLAForge.NothingToWithdraw.selector);
        forge.withdraw();
        vm.stopPrank();
    }

    // =====================================================================
    //                                REBOND
    // =====================================================================

    function test_Rebond_AfterSlashRelistsService() public {
        uint256 serviceId = _list();
        _settle(_buy(customer, serviceId, 0), false);

        vm.expectEmit(true, true, false, true);
        emit SLAForge.ServiceRebonded(serviceId, provider, 80 * USDC);
        vm.prank(provider);
        forge.rebondService(serviceId, 80 * USDC);

        SLAForge.ServiceView memory s = forge.getServiceById(serviceId);
        assertEq(uint256(s.status), uint256(SLAForge.ServiceStatus.Bonded));
        assertEq(s.bond, 80 * USDC);
        _buy(customer2, serviceId, 0); // open for business again
    }

    function test_Rebond_AfterDelistRelistsService() public {
        uint256 serviceId = _list();
        vm.startPrank(provider);
        forge.delistService(serviceId);
        forge.rebondService(serviceId, 1 * USDC);
        vm.stopPrank();
        assertEq(uint256(forge.getServiceById(serviceId).status), uint256(SLAForge.ServiceStatus.Bonded));
        assertEq(usdc.balanceOf(address(forge)), 1 * USDC);
    }

    function test_Rebond_NewBondIsSlashedByNextMiss() public {
        uint256 serviceId = _list();
        uint256 open = _buy(customer, serviceId, 1);
        _settle(_buy(customer2, serviceId, 0), false); // slashes BOND

        vm.prank(provider);
        forge.rebondService(serviceId, 30 * USDC);
        assertEq(forge.getServiceById(serviceId).activeAgreements, 1);

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        _settle(open, false);
        assertEq(usdc.balanceOf(treasury), treasuryBefore + 30 * USDC);
    }

    function test_RevertWhen_RebondUnknownService() public {
        vm.expectRevert(SLAForge.ServiceNotFound.selector);
        vm.prank(provider);
        forge.rebondService(1, BOND);
    }

    function test_RevertWhen_RebondByNonProvider() public {
        uint256 serviceId = _list();
        _settle(_buy(customer, serviceId, 0), false);
        vm.expectRevert(SLAForge.NotServiceProvider.selector);
        vm.prank(provider2);
        forge.rebondService(serviceId, BOND);
    }

    function test_RevertWhen_RebondBondedService() public {
        uint256 serviceId = _list();
        vm.expectRevert(SLAForge.ServiceAlreadyBonded.selector);
        vm.prank(provider);
        forge.rebondService(serviceId, BOND);
    }

    function test_RevertWhen_RebondOutOfRange() public {
        uint256 serviceId = _list();
        _settle(_buy(customer, serviceId, 0), false);
        vm.startPrank(provider);
        vm.expectRevert(SLAForge.BondTooLow.selector);
        forge.rebondService(serviceId, 1 * USDC - 1);
        vm.expectRevert(SLAForge.BondTooHigh.selector);
        forge.rebondService(serviceId, 100 * USDC + 1);
        vm.stopPrank();
    }

    function test_RevertWhen_RebondWhilePaused() public {
        uint256 serviceId = _list();
        _settle(_buy(customer, serviceId, 0), false);
        vm.prank(owner);
        forge.pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(provider);
        forge.rebondService(serviceId, BOND);
    }

    // =====================================================================
    //                             INCREASE BOND
    // =====================================================================

    function test_IncreaseBond_AddsToLiveBond() public {
        uint256 serviceId = _listWithBond(30 * USDC);
        uint256 before = usdc.balanceOf(provider);

        vm.expectEmit(true, true, false, true);
        emit SLAForge.BondIncreased(serviceId, provider, 25 * USDC, 55 * USDC);
        vm.prank(provider);
        forge.increaseBond(serviceId, 25 * USDC);

        SLAForge.ServiceView memory s = forge.getServiceById(serviceId);
        assertEq(s.bond, 55 * USDC);
        assertEq(uint256(s.status), uint256(SLAForge.ServiceStatus.Bonded));
        assertEq(usdc.balanceOf(provider), before - 25 * USDC);
        assertEq(usdc.balanceOf(address(forge)), 55 * USDC);
    }

    function test_IncreaseBond_WorksWithActiveAgreements() public {
        uint256 serviceId = _listWithBond(10 * USDC);
        _buy(customer, serviceId, 1);
        vm.prank(provider);
        forge.increaseBond(serviceId, 40 * USDC);
        assertEq(forge.getServiceById(serviceId).bond, 50 * USDC);
        assertEq(forge.getServiceById(serviceId).activeAgreements, 1);
    }

    function test_IncreaseBond_UpToExactMaximum() public {
        uint256 serviceId = _listWithBond(1 * USDC);
        vm.prank(provider);
        forge.increaseBond(serviceId, 99 * USDC);
        assertEq(forge.getServiceById(serviceId).bond, 100 * USDC);
    }

    function test_IncreaseBond_ToppedUpBondIsSlashedInFull() public {
        uint256 serviceId = _listWithBond(20 * USDC);
        uint256 id = _buy(customer, serviceId, 0);
        vm.prank(provider);
        forge.increaseBond(serviceId, 30 * USDC);

        _settle(id, false);
        assertEq(usdc.balanceOf(treasury), FEE + 50 * USDC);
        assertEq(forge.getServiceById(serviceId).bond, 0);
    }

    function test_IncreaseBond_RefundedInFullOnDelist() public {
        uint256 serviceId = _listWithBond(20 * USDC);
        vm.startPrank(provider);
        forge.increaseBond(serviceId, 15 * USDC);
        uint256 before = usdc.balanceOf(provider);
        forge.delistService(serviceId);
        vm.stopPrank();
        assertEq(usdc.balanceOf(provider), before + 35 * USDC);
    }

    function test_RevertWhen_IncreaseBondAboveMaximum() public {
        uint256 serviceId = _listWithBond(BOND);
        vm.expectRevert(SLAForge.BondTooHigh.selector);
        vm.prank(provider);
        forge.increaseBond(serviceId, 100 * USDC - BOND + 1);
    }

    function test_RevertWhen_IncreaseBondAtMaximum() public {
        uint256 serviceId = _listWithBond(100 * USDC);
        vm.expectRevert(SLAForge.BondTooHigh.selector);
        vm.prank(provider);
        forge.increaseBond(serviceId, 1);
    }

    function test_RevertWhen_IncreaseBondByZero() public {
        uint256 serviceId = _list();
        vm.expectRevert(SLAForge.ZeroAmount.selector);
        vm.prank(provider);
        forge.increaseBond(serviceId, 0);
    }

    function test_RevertWhen_IncreaseBondUnknownService() public {
        vm.expectRevert(SLAForge.ServiceNotFound.selector);
        vm.prank(provider);
        forge.increaseBond(1, USDC);
    }

    function test_RevertWhen_IncreaseBondByNonProvider() public {
        uint256 serviceId = _list();
        vm.expectRevert(SLAForge.NotServiceProvider.selector);
        vm.prank(provider2);
        forge.increaseBond(serviceId, USDC);
    }

    function test_RevertWhen_IncreaseBondOnSlashedService() public {
        uint256 serviceId = _list();
        _settle(_buy(customer, serviceId, 0), false);
        vm.expectRevert(SLAForge.ServiceNotBonded.selector);
        vm.prank(provider);
        forge.increaseBond(serviceId, USDC);
    }

    function test_RevertWhen_IncreaseBondOnDelistedService() public {
        uint256 serviceId = _list();
        vm.startPrank(provider);
        forge.delistService(serviceId);
        vm.expectRevert(SLAForge.ServiceNotBonded.selector);
        forge.increaseBond(serviceId, USDC);
        vm.stopPrank();
    }

    function test_RevertWhen_IncreaseBondWhilePaused() public {
        uint256 serviceId = _list();
        vm.prank(owner);
        forge.pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(provider);
        forge.increaseBond(serviceId, USDC);
    }

    function testFuzz_IncreaseBond_NeverExceedsMaximum(uint256 start, uint256 amount) public {
        start = bound(start, 1 * USDC, 100 * USDC);
        amount = bound(amount, 1, 200 * USDC);
        uint256 serviceId = _listWithBond(start);
        if (start + amount > 100 * USDC) vm.expectRevert(SLAForge.BondTooHigh.selector);
        vm.prank(provider);
        forge.increaseBond(serviceId, amount);
        assertLe(forge.getServiceById(serviceId).bond, 100 * USDC);
    }

    // =====================================================================
    //                                DELIST
    // =====================================================================

    function test_Delist_RefundsBond() public {
        uint256 serviceId = _list();
        uint256 before = usdc.balanceOf(provider);

        vm.expectEmit(true, true, false, true);
        emit SLAForge.ServiceDelisted(serviceId, provider, BOND);
        vm.prank(provider);
        forge.delistService(serviceId);

        assertEq(usdc.balanceOf(provider), before + BOND);
        SLAForge.ServiceView memory s = forge.getServiceById(serviceId);
        assertEq(uint256(s.status), uint256(SLAForge.ServiceStatus.Delisted));
        assertEq(s.bond, 0);
    }

    function test_Delist_SlashedServiceRefundsNothing() public {
        uint256 serviceId = _list();
        _settle(_buy(customer, serviceId, 0), false);
        uint256 before = usdc.balanceOf(provider);

        vm.expectEmit(true, true, false, true);
        emit SLAForge.ServiceDelisted(serviceId, provider, 0);
        vm.prank(provider);
        forge.delistService(serviceId);
        assertEq(usdc.balanceOf(provider), before);
    }

    function test_Delist_AllowedAfterAgreementsSettle() public {
        uint256 serviceId = _list();
        uint256 id = _buy(customer, serviceId, 0);
        vm.warp(block.timestamp + 5 minutes);
        _settle(id, true);
        vm.prank(provider);
        forge.delistService(serviceId);
        assertEq(uint256(forge.getServiceById(serviceId).status), uint256(SLAForge.ServiceStatus.Delisted));
    }

    function test_Delist_WorksWhilePaused() public {
        uint256 serviceId = _list();
        vm.prank(owner);
        forge.pause();
        vm.prank(provider);
        forge.delistService(serviceId);
        assertEq(usdc.balanceOf(address(forge)), 0);
    }

    function test_RevertWhen_DelistWithActiveAgreements() public {
        uint256 serviceId = _list();
        _buy(customer, serviceId, 0);
        vm.expectRevert(SLAForge.ServiceHasActiveAgreements.selector);
        vm.prank(provider);
        forge.delistService(serviceId);
    }

    function test_RevertWhen_DelistUnknownService() public {
        vm.expectRevert(SLAForge.ServiceNotFound.selector);
        vm.prank(provider);
        forge.delistService(1);
    }

    function test_RevertWhen_DelistByNonProvider() public {
        uint256 serviceId = _list();
        vm.expectRevert(SLAForge.NotServiceProvider.selector);
        vm.prank(stranger);
        forge.delistService(serviceId);
    }

    function test_RevertWhen_DelistTwice() public {
        uint256 serviceId = _list();
        vm.startPrank(provider);
        forge.delistService(serviceId);
        vm.expectRevert(SLAForge.ServiceAlreadyDelisted.selector);
        forge.delistService(serviceId);
        vm.stopPrank();
    }

    // =====================================================================
    //                                VIEWS
    // =====================================================================

    function test_RevertWhen_GetUnknownService() public {
        vm.expectRevert(SLAForge.ServiceNotFound.selector);
        forge.getServiceById(1);
        _list();
        vm.expectRevert(SLAForge.ServiceNotFound.selector);
        forge.getServiceById(0);
    }

    function test_RevertWhen_GetUnknownAgreement() public {
        vm.expectRevert(SLAForge.AgreementNotFound.selector);
        forge.getAgreementById(1);
    }

    function test_GetServices_Paging() public {
        for (uint256 i = 0; i < 5; i++) {
            _list();
        }
        assertEq(forge.getServices(0, 10).length, 5);
        assertEq(forge.getServices(0, 2).length, 2);

        SLAForge.ServiceView[] memory page = forge.getServices(3, 10);
        assertEq(page.length, 2);
        assertEq(page[0].id, 4);
        assertEq(page[1].id, 5);

        assertEq(forge.getServices(5, 10).length, 0); // offset past the end
        assertEq(forge.getServices(0, 0).length, 0); // zero limit
    }

    function test_GetServices_Empty() public view {
        assertEq(forge.getServices(0, 10).length, 0);
    }

    function test_ViewLists_EmptyForUnknownAccounts() public view {
        assertEq(forge.getServiceIdsByProvider(stranger).length, 0);
        assertEq(forge.getAgreementIdsByCustomer(stranger).length, 0);
    }

    // =====================================================================
    //                                ADMIN
    // =====================================================================

    function test_SetMonitor_HandsOverSettlement() public {
        address newMonitor = makeAddr("newMonitor");
        uint256 id = _buy(customer, _list(), 0);

        vm.expectEmit(true, true, false, false);
        emit SLAForge.MonitorUpdated(monitor, newMonitor);
        vm.prank(owner);
        forge.setMonitor(newMonitor);
        assertEq(forge.monitor(), newMonitor);

        vm.expectRevert(SLAForge.NotMonitor.selector);
        vm.prank(monitor);
        forge.settleAgreement(id, false);

        vm.prank(newMonitor);
        forge.settleAgreement(id, false);
    }

    function test_SetTreasury_ReceivesFeesAndSlashes() public {
        address newTreasury = makeAddr("newTreasury");
        vm.expectEmit(true, true, false, false);
        emit SLAForge.TreasuryUpdated(treasury, newTreasury);
        vm.prank(owner);
        forge.setTreasury(newTreasury);

        _settle(_buy(customer, _list(), 0), false);
        assertEq(usdc.balanceOf(newTreasury), FEE + BOND);
        assertEq(usdc.balanceOf(treasury), 0);
    }

    function test_RevertWhen_AdminSetsZeroAddress() public {
        vm.startPrank(owner);
        vm.expectRevert(SLAForge.ZeroAddress.selector);
        forge.setMonitor(address(0));
        vm.expectRevert(SLAForge.ZeroAddress.selector);
        forge.setTreasury(address(0));
        vm.stopPrank();
    }

    function test_RevertWhen_NonOwnerCallsAdmin() public {
        bytes memory err = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger);
        vm.startPrank(stranger);
        vm.expectRevert(err);
        forge.setMonitor(stranger);
        vm.expectRevert(err);
        forge.setTreasury(stranger);
        vm.expectRevert(err);
        forge.pause();
        vm.expectRevert(err);
        forge.unpause();
        vm.expectRevert(err);
        forge.renounceOwnership();
        vm.stopPrank();
    }

    function test_PauseAndUnpause() public {
        vm.startPrank(owner);
        forge.pause();
        assertTrue(forge.paused());
        forge.unpause();
        assertFalse(forge.paused());
        vm.stopPrank();
        _list();
    }

    function test_RevertWhen_RenounceOwnership() public {
        vm.expectRevert(SLAForge.RenounceDisabled.selector);
        vm.prank(owner);
        forge.renounceOwnership();
        assertEq(forge.owner(), owner);
    }

    function test_OwnershipTransferIsTwoStep() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        forge.transferOwnership(newOwner);
        assertEq(forge.owner(), owner);
        assertEq(forge.pendingOwner(), newOwner);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vm.prank(stranger);
        forge.acceptOwnership();

        vm.prank(newOwner);
        forge.acceptOwnership();
        assertEq(forge.owner(), newOwner);
    }

    function test_RevertWhen_SendingEth() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        (bool ok, bytes memory data) = address(forge).call{value: 1 ether}("");
        assertFalse(ok);
        // casting to 'bytes4' is safe because a custom error starts with its 4-byte selector
        // forge-lint: disable-next-line(unsafe-typecast)
        assertEq(bytes4(data), SLAForge.EthNotAccepted.selector);
    }

    function test_RevertWhen_UnknownFunction() public {
        (bool ok, bytes memory data) = address(forge).call(abi.encodeWithSignature("doesNotExist()"));
        assertFalse(ok);
        // casting to 'bytes4' is safe because a custom error starts with its 4-byte selector
        // forge-lint: disable-next-line(unsafe-typecast)
        assertEq(bytes4(data), SLAForge.InvalidCall.selector);
    }

    // =====================================================================
    //                            FULL LIFECYCLE
    // =====================================================================

    function test_Lifecycle_EveryUsdcIsAccountedFor() public {
        uint256 start = usdc.balanceOf(provider) + usdc.balanceOf(customer) + usdc.balanceOf(customer2);

        uint256 serviceId = _list();
        uint256 met = _buy(customer, serviceId, 1);
        uint256 missed = _buy(customer2, serviceId, 0);

        _settle(missed, false); // refund customer2, slash bond
        vm.prank(provider);
        forge.rebondService(serviceId, 20 * USDC);
        vm.warp(block.timestamp + 30 days);
        _settle(met, true); // pay provider

        vm.prank(customer2);
        forge.withdraw();
        vm.startPrank(provider);
        forge.withdraw();
        forge.delistService(serviceId);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(forge)), 0, "contract keeps nothing");
        assertEq(usdc.balanceOf(treasury), 2 * FEE + BOND, "treasury: two fees + slashed bond");
        uint256 end = usdc.balanceOf(provider) + usdc.balanceOf(customer) + usdc.balanceOf(customer2);
        assertEq(start - end, usdc.balanceOf(treasury), "users lost exactly what the treasury gained");
        assertEq(uint256(forge.getServiceById(serviceId).status), uint256(SLAForge.ServiceStatus.Delisted));
    }

    // =====================================================================
    //                                 FUZZ
    // =====================================================================

    function testFuzz_ListService_AnyBondInRange(uint256 bond) public {
        bond = bound(bond, 1 * USDC, 100 * USDC);
        uint256 id = _listWithBond(bond);
        assertEq(forge.getServiceById(id).bond, bond);
        assertEq(usdc.balanceOf(address(forge)), bond);
    }

    function testFuzz_RevertWhen_BondOutOfRange(uint256 bond) public {
        vm.assume(bond < 1 * USDC || bond > 100 * USDC);
        Listing memory l = _listing();
        l.bond = bond;
        _expectListRevert(l, bond < 1 * USDC ? SLAForge.BondTooLow.selector : SLAForge.BondTooHigh.selector);
    }

    function testFuzz_Settle_ConservesFunds(uint256 price, uint256 duration, uint256 bond, bool met) public {
        price = bound(price, 1 * USDC, 5_000 * USDC);
        duration = bound(duration, 5 minutes, 365 days);
        bond = bound(bond, 1 * USDC, 100 * USDC);

        Listing memory l = _listing();
        l.bond = bond;
        l.plans = new SLAForge.PlanStruct[](1);
        l.plans[0] = SLAForge.PlanStruct({price: price, duration: duration});
        uint256 serviceId = _submit(provider, l);
        uint256 id = _buy(customer, serviceId, 0);

        if (met) vm.warp(block.timestamp + duration);
        _settle(id, met);

        assertEq(forge.withdrawableBalance(met ? provider : customer), price);
        assertEq(forge.withdrawableBalance(met ? customer : provider), 0);
        assertEq(usdc.balanceOf(treasury), FEE + (met ? 0 : bond));
        assertEq(usdc.balanceOf(address(forge)), price + (met ? bond : 0));
    }

    function testFuzz_RevertWhen_MetReportedEarly(uint256 elapsed) public {
        uint256 id = _buy(customer, _list(), 1);
        elapsed = bound(elapsed, 0, 30 days - 1);
        vm.warp(block.timestamp + elapsed);
        vm.expectRevert(SLAForge.AgreementNotEnded.selector);
        _settle(id, true);
    }
}
