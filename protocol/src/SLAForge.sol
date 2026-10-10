// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SLAForge
 * @dev SLA-backed USDC payments. SLA met: provider is paid.
 *      SLA missed: customer is refunded in full and the provider's bond is slashed.
 */
contract SLAForge is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error UnsupportedToken();
    error NotMonitor();
    error RenounceDisabled();
    error InvalidNameLength();
    error InvalidDescriptionLength();
    error InvalidEndpointLength();
    error InvalidDocsUrlLength();
    error InvalidUptimeTarget();
    error InvalidLatencyTarget();
    error BondTooLow();
    error BondTooHigh();
    error ZeroAmount();
    error InvalidPlanCount();
    error InvalidPlanPrice();
    error InvalidPlanDuration();
    error ServiceNotFound();
    error NotServiceProvider();
    error ServiceNotBonded();
    error ServiceAlreadyBonded();
    error ServiceAlreadyDelisted();
    error ServiceHasActiveAgreements();
    error InvalidPlanIndex();
    error AgreementNotFound();
    error AgreementNotActive();
    error AgreementNotEnded();
    error NothingToWithdraw();
    error EthNotAccepted();
    error InvalidCall();

    uint256 public constant USDC_UNIT = 1_000_000; // 1 USDC (6 decimals) (1e6)
    uint256 public constant PLATFORM_FEE = 100_000; // 0.1 USDC
    uint256 public constant MIN_BOND = 1_000_000; // 1 USDC
    uint256 public constant MAX_BOND = 100_000_000; // 100 USDC
    uint256 public constant MIN_PLAN_PRICE = 1_000_000; // 1 USDC

    uint256 public constant MAX_PLANS = 6;
    uint256 public constant MIN_PLAN_DURATION = 5 minutes;
    uint256 public constant MAX_PLAN_DURATION = 365 days;

    uint256 public constant MIN_UPTIME_BPS = 9_500; // 95.00%
    uint256 public constant MAX_UPTIME_BPS = 10_000; // 100%
    uint256 public constant MAX_LATENCY_MS = 60_000; // 60 seconds

    uint256 public constant MIN_NAME_LENGTH = 3;
    uint256 public constant MAX_NAME_LENGTH = 60;
    uint256 public constant MIN_DESCRIPTION_LENGTH = 30;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MAX_URL_LENGTH = 200;

    IERC20 public immutable USDC;
    address public monitor;
    address public treasury;
    uint256 public totalServiceIds = 0;
    uint256 public totalAgreementIds = 0;

    enum ServiceStatus {
        None,
        Bonded,
        Slashed,
        Delisted
    }

    enum AgreementStatus {
        None,
        Active,
        Passed,
        Failed
    }

    enum Category {
        API,
        RPC,
        AI,
        Cloud,
        Data,
        Storage
    }

    struct PlanStruct {
        uint256 price; // USDC units
        uint256 duration; // seconds
    }

    struct ServiceStruct {
        address provider;
        ServiceStatus status;
        Category category;
        uint256 uptimeBps; // 9_990 = 99.90%
        uint256 maxLatencyMs; // p95 latency
        uint256 activeAgreements;
        uint256 bond;
        string name;
        string description;
        string endpoint;
        string docsUrl;
        PlanStruct[] plans;
    }

    struct AgreementStruct {
        address customer;
        uint256 serviceId;
        uint256 planIndex;
        AgreementStatus status;
        uint256 price;
        uint256 startTime;
        uint256 endTime;
    }

    mapping(uint256 => ServiceStruct) private services;
    mapping(uint256 => AgreementStruct) private agreements;
    mapping(address => uint256[]) private providerServiceIds;
    mapping(address => uint256[]) private customerAgreementIds;
    mapping(address => uint256) public withdrawableBalance;

    event MonitorUpdated(address indexed previousMonitor, address indexed newMonitor);

    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    event ServiceListed(
        uint256 indexed serviceId, address indexed provider, Category category, string name, uint256 bond
    );

    event ServiceRebonded(uint256 indexed serviceId, address indexed provider, uint256 bond);

    event BondIncreased(uint256 indexed serviceId, address indexed provider, uint256 amount, uint256 newBond);

    event ServiceDelisted(uint256 indexed serviceId, address indexed provider, uint256 bondRefunded);

    event AgreementCreated(
        uint256 indexed agreementId,
        uint256 indexed serviceId,
        address indexed customer,
        uint256 planIndex,
        uint256 price,
        uint256 endTime
    );

    event AgreementSettled(
        uint256 indexed agreementId, uint256 indexed serviceId, AgreementStatus status, address paidTo, uint256 amount
    );

    event BondSlashed(uint256 indexed serviceId, uint256 indexed agreementId, uint256 amount);

    event Withdrawn(address indexed account, uint256 amount);

    /**
     * @param _monitor Trusted reporter that settles agreements
     * @param _treasury Receives platform fees and slashed bonds
     */
    constructor(IERC20 _usdc, address _owner, address _monitor, address _treasury) Ownable(_owner) {
        if (address(_usdc) == address(0) || _monitor == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }
        if (IERC20Metadata(address(_usdc)).decimals() != 6) revert UnsupportedToken();

        USDC = _usdc;
        monitor = _monitor;
        treasury = _treasury;
        emit MonitorUpdated(address(0), _monitor);
        emit TreasuryUpdated(address(0), _treasury);
    }

    modifier onlyMonitor() {
        _checkMonitor();
        _;
    }

    function _checkMonitor() internal view {
        if (msg.sender != monitor) revert NotMonitor();
    }

    // =====================================================================
    //                              PROVIDER
    // =====================================================================

    /**
     * @notice Lists a new service and locks its bond
     * @dev Provider must approve `_bond` USDC first. SLA targets and plans cannot be changed later.
     */
    function listService(
        string calldata _name,
        string calldata _description,
        Category _category,
        string calldata _endpoint,
        string calldata _docsUrl,
        uint256 _uptimeBps,
        uint256 _maxLatencyMs,
        uint256 _bond,
        PlanStruct[] calldata _plans
    ) external whenNotPaused nonReentrant returns (uint256 serviceId) {
        if (bytes(_name).length < MIN_NAME_LENGTH || bytes(_name).length > MAX_NAME_LENGTH) {
            revert InvalidNameLength();
        }
        if (bytes(_description).length < MIN_DESCRIPTION_LENGTH || bytes(_description).length > MAX_DESCRIPTION_LENGTH)
        {
            revert InvalidDescriptionLength();
        }
        if (bytes(_endpoint).length == 0 || bytes(_endpoint).length > MAX_URL_LENGTH) revert InvalidEndpointLength();
        if (bytes(_docsUrl).length == 0 || bytes(_docsUrl).length > MAX_URL_LENGTH) revert InvalidDocsUrlLength();
        if (_uptimeBps < MIN_UPTIME_BPS || _uptimeBps > MAX_UPTIME_BPS) revert InvalidUptimeTarget();
        if (_maxLatencyMs == 0 || _maxLatencyMs > MAX_LATENCY_MS) revert InvalidLatencyTarget();
        if (_bond < MIN_BOND) revert BondTooLow();
        if (_bond > MAX_BOND) revert BondTooHigh();

        uint256 planCount = _plans.length;
        if (planCount == 0 || planCount > MAX_PLANS) revert InvalidPlanCount();
        for (uint256 i = 0; i < planCount;) {
            if (_plans[i].price < MIN_PLAN_PRICE) revert InvalidPlanPrice();
            if (_plans[i].duration < MIN_PLAN_DURATION || _plans[i].duration > MAX_PLAN_DURATION) {
                revert InvalidPlanDuration();
            }
            unchecked {
                ++i;
            }
        }

        totalServiceIds++;
        serviceId = totalServiceIds;

        ServiceStruct storage newService = services[serviceId];
        newService.provider = msg.sender;
        newService.status = ServiceStatus.Bonded;
        newService.category = _category;
        newService.uptimeBps = _uptimeBps;
        newService.maxLatencyMs = _maxLatencyMs;
        newService.bond = _bond;
        newService.name = _name;
        newService.description = _description;
        newService.endpoint = _endpoint;
        newService.docsUrl = _docsUrl;
        for (uint256 i = 0; i < planCount;) {
            newService.plans.push(_plans[i]);
            unchecked {
                ++i;
            }
        }
        providerServiceIds[msg.sender].push(serviceId);

        USDC.safeTransferFrom(msg.sender, address(this), _bond);

        emit ServiceListed(serviceId, msg.sender, _category, _name, _bond);
    }

    /**
     * @notice Re-lists a slashed or delisted service with a new bond
     */
    function rebondService(uint256 _serviceId, uint256 _bond) external whenNotPaused nonReentrant {
        ServiceStruct storage service = services[_serviceId];

        if (service.status == ServiceStatus.None) revert ServiceNotFound();
        if (service.provider != msg.sender) revert NotServiceProvider();
        if (service.status == ServiceStatus.Bonded) revert ServiceAlreadyBonded();
        if (_bond < MIN_BOND) revert BondTooLow();
        if (_bond > MAX_BOND) revert BondTooHigh();

        service.status = ServiceStatus.Bonded;
        service.bond = _bond;

        USDC.safeTransferFrom(msg.sender, address(this), _bond);

        emit ServiceRebonded(_serviceId, msg.sender, _bond);
    }

    /**
     * @notice Adds to the bond of a live service, up to MAX_BOND
     * @dev Works while agreements are active. Provider must approve `_amount` USDC first.
     */
    function increaseBond(uint256 _serviceId, uint256 _amount) external whenNotPaused nonReentrant {
        ServiceStruct storage service = services[_serviceId];

        if (service.status == ServiceStatus.None) revert ServiceNotFound();
        if (service.provider != msg.sender) revert NotServiceProvider();
        if (service.status != ServiceStatus.Bonded) revert ServiceNotBonded();
        if (_amount == 0) revert ZeroAmount();

        uint256 newBond = service.bond + _amount;
        if (newBond > MAX_BOND) revert BondTooHigh();
        service.bond = newBond;

        USDC.safeTransferFrom(msg.sender, address(this), _amount);

        emit BondIncreased(_serviceId, msg.sender, _amount, newBond);
    }

    /**
     * @notice Removes a service and refunds its bond
     * @dev Blocked while the service has active agreements
     */
    function delistService(uint256 _serviceId) external nonReentrant {
        ServiceStruct storage service = services[_serviceId];

        if (service.status == ServiceStatus.None) revert ServiceNotFound();
        if (service.provider != msg.sender) revert NotServiceProvider();
        if (service.status == ServiceStatus.Delisted) revert ServiceAlreadyDelisted();
        if (service.activeAgreements > 0) revert ServiceHasActiveAgreements();

        uint256 refund = service.bond;
        service.bond = 0;
        service.status = ServiceStatus.Delisted;

        if (refund > 0) USDC.safeTransfer(msg.sender, refund);

        emit ServiceDelisted(_serviceId, msg.sender, refund);
    }

    // =====================================================================
    //                              CUSTOMER
    // =====================================================================

    /**
     * @notice Buys a plan; the agreement starts immediately
     * @dev Customer must approve price + PLATFORM_FEE first. The price is held until settlement.
     */
    function createAgreement(uint256 _serviceId, uint256 _planIndex)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 agreementId)
    {
        ServiceStruct storage service = services[_serviceId];

        if (service.status == ServiceStatus.None) revert ServiceNotFound();
        if (service.status != ServiceStatus.Bonded) revert ServiceNotBonded();
        if (_planIndex >= service.plans.length) revert InvalidPlanIndex();

        PlanStruct memory plan = service.plans[_planIndex];
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + plan.duration;

        totalAgreementIds++;
        agreementId = totalAgreementIds;

        agreements[agreementId] = AgreementStruct({
            customer: msg.sender,
            serviceId: _serviceId,
            planIndex: _planIndex,
            status: AgreementStatus.Active,
            price: plan.price,
            startTime: startTime,
            endTime: endTime
        });
        service.activeAgreements++;
        customerAgreementIds[msg.sender].push(agreementId);

        USDC.safeTransferFrom(msg.sender, address(this), plan.price);
        USDC.safeTransferFrom(msg.sender, treasury, PLATFORM_FEE);

        emit AgreementCreated(agreementId, _serviceId, msg.sender, _planIndex, plan.price, endTime);
    }

    // =====================================================================
    //                             SETTLEMENT
    // =====================================================================

    /**
     * @notice Monitor reports the SLA result for an agreement
     * @dev "Met" only after endTime; "missed" at any time.
     */
    function settleAgreement(uint256 _agreementId, bool _slaMet) external onlyMonitor nonReentrant {
        AgreementStruct storage agreement = agreements[_agreementId];

        if (agreement.status == AgreementStatus.None) revert AgreementNotFound();
        if (agreement.status != AgreementStatus.Active) revert AgreementNotActive();
        if (_slaMet && block.timestamp < agreement.endTime) revert AgreementNotEnded();

        _settle(_agreementId, _slaMet);
    }

    /// @dev Credits withdrawableBalance (pull payments) so a blocked address cannot stop settlement.
    function _settle(uint256 _agreementId, bool _slaMet) internal {
        AgreementStruct storage agreement = agreements[_agreementId];
        uint256 serviceId = agreement.serviceId;
        ServiceStruct storage service = services[serviceId];
        uint256 price = agreement.price;

        service.activeAgreements--;

        if (_slaMet) {
            agreement.status = AgreementStatus.Passed;
            withdrawableBalance[service.provider] += price;
            emit AgreementSettled(_agreementId, serviceId, AgreementStatus.Passed, service.provider, price);
            return;
        }

        agreement.status = AgreementStatus.Failed;
        withdrawableBalance[agreement.customer] += price;
        emit AgreementSettled(_agreementId, serviceId, AgreementStatus.Failed, agreement.customer, price);

        uint256 slashed = service.bond;
        if (slashed > 0) {
            service.bond = 0;
            service.status = ServiceStatus.Slashed;
            emit BondSlashed(serviceId, _agreementId, slashed);
            USDC.safeTransfer(treasury, slashed);
        }
    }

    /// @notice Withdraws all USDC credited to the caller (payouts and refunds)
    function withdraw() external nonReentrant {
        uint256 amount = withdrawableBalance[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        withdrawableBalance[msg.sender] = 0;
        USDC.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    // =====================================================================
    //                                VIEWS
    // =====================================================================

    struct ServiceView {
        uint256 id;
        address provider;
        ServiceStatus status;
        Category category;
        uint256 uptimeBps;
        uint256 maxLatencyMs;
        uint256 activeAgreements;
        uint256 bond;
        string name;
        string description;
        string endpoint;
        string docsUrl;
        PlanStruct[] plans;
    }

    struct AgreementView {
        uint256 id;
        uint256 serviceId;
        address customer;
        address provider;
        uint256 planIndex;
        AgreementStatus status;
        uint256 price;
        uint256 startTime;
        uint256 endTime;
    }

    function getServiceById(uint256 _serviceId) external view returns (ServiceView memory) {
        if (services[_serviceId].status == ServiceStatus.None) revert ServiceNotFound();
        return _toServiceView(_serviceId);
    }

    /// @notice Paged list of services, oldest first (_offset 0 = service #1)
    function getServices(uint256 _offset, uint256 _limit) external view returns (ServiceView[] memory) {
        uint256 total = totalServiceIds;
        if (_offset >= total || _limit == 0) return new ServiceView[](0);

        uint256 count = total - _offset;
        if (count > _limit) count = _limit;

        ServiceView[] memory result = new ServiceView[](count);
        for (uint256 i = 0; i < count;) {
            result[i] = _toServiceView(_offset + i + 1);
            unchecked {
                ++i;
            }
        }
        return result;
    }

    function getServiceIdsByProvider(address _provider) external view returns (uint256[] memory) {
        return providerServiceIds[_provider];
    }

    function getAgreementById(uint256 _agreementId) external view returns (AgreementView memory) {
        AgreementStruct storage a = agreements[_agreementId];
        if (a.status == AgreementStatus.None) revert AgreementNotFound();

        return AgreementView({
            id: _agreementId,
            serviceId: a.serviceId,
            customer: a.customer,
            provider: services[a.serviceId].provider,
            planIndex: a.planIndex,
            status: a.status,
            price: a.price,
            startTime: a.startTime,
            endTime: a.endTime
        });
    }

    function getAgreementIdsByCustomer(address _customer) external view returns (uint256[] memory) {
        return customerAgreementIds[_customer];
    }

    /// @notice Amount a customer must approve for a plan (total = price + fee)
    function quoteAgreement(uint256 _serviceId, uint256 _planIndex)
        external
        view
        returns (uint256 price, uint256 fee, uint256 total)
    {
        ServiceStruct storage service = services[_serviceId];
        if (service.status == ServiceStatus.None) revert ServiceNotFound();
        if (_planIndex >= service.plans.length) revert InvalidPlanIndex();

        price = service.plans[_planIndex].price;
        fee = PLATFORM_FEE;
        total = price + fee;
    }

    function _toServiceView(uint256 _serviceId) internal view returns (ServiceView memory) {
        ServiceStruct storage s = services[_serviceId];
        return ServiceView({
            id: _serviceId,
            provider: s.provider,
            status: s.status,
            category: s.category,
            uptimeBps: s.uptimeBps,
            maxLatencyMs: s.maxLatencyMs,
            activeAgreements: s.activeAgreements,
            bond: s.bond,
            name: s.name,
            description: s.description,
            endpoint: s.endpoint,
            docsUrl: s.docsUrl,
            plans: s.plans
        });
    }

    // =====================================================================
    //                                ADMIN
    // =====================================================================

    function setMonitor(address _newMonitor) external onlyOwner {
        if (_newMonitor == address(0)) revert ZeroAddress();
        emit MonitorUpdated(monitor, _newMonitor);
        monitor = _newMonitor;
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _newTreasury);
        treasury = _newTreasury;
    }

    /// @notice Pauses new listings, re-bonds and agreements. Settlement, delisting and withdrawals still work.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Disabled: without an owner nobody could replace the monitor
    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    receive() external payable {
        revert EthNotAccepted();
    }

    fallback() external payable {
        revert InvalidCall();
    }
}
