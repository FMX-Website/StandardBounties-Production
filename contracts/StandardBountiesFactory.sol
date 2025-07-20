// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StandardBountiesProxy.sol";

/**
 * @title StandardBountiesFactory
 * @notice Factory contract for deploying StandardBounties proxies under 500k gas
 * @dev Uses CREATE2 for deterministic addresses and minimal proxy pattern
 */
contract StandardBountiesFactory {
    
    // Implementation contract (deployed once)
    address public immutable implementation;
    
    // Registry of deployed proxies
    mapping(address => bool) public isProxy;
    mapping(address => address) public proxyOwner;
    
    // Events
    event ProxyDeployed(address indexed proxy, address indexed owner, bytes32 salt);
    event ImplementationSet(address indexed implementation);
    
    /**
     * @dev Constructor sets the implementation contract
     * @param _implementation Address of the pre-deployed implementation
     */
    constructor(address _implementation) {
        require(_implementation != address(0), "Invalid implementation");
        implementation = _implementation;
        emit ImplementationSet(implementation);
    }
    
    /**
     * @dev Deploy a new proxy with CREATE2 for deterministic address
     * @param _owner Owner of the new bounty contract
     * @param _salt Salt for CREATE2 deployment
     * @return proxy Address of the deployed proxy
     */
    function deployProxy(address _owner, bytes32 _salt) external returns (address proxy) {
        require(_owner != address(0), "Invalid owner");
        
        // Generate deterministic address
        bytes memory bytecode = abi.encodePacked(
            type(StandardBountiesProxy).creationCode,
            abi.encode(implementation)
        );
        
        bytes32 hash = keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            _salt,
            keccak256(bytecode)
        ));
        
        proxy = address(uint160(uint256(hash)));
        
        // Check if already deployed
        require(!isProxy[proxy], "Proxy already exists");
        
        // Deploy proxy using CREATE2
        assembly {
            proxy := create2(0, add(bytecode, 0x20), mload(bytecode), _salt)
            if iszero(proxy) { revert(0, 0) }
        }
        
        // Initialize the proxy
        (bool success, ) = proxy.call(abi.encodeWithSignature("initialize(address)", _owner));
        require(success, "Proxy initialization failed");
        
        // Register proxy
        isProxy[proxy] = true;
        proxyOwner[proxy] = _owner;
        
        emit ProxyDeployed(proxy, _owner, _salt);
    }
    
    /**
     * @dev Deploy proxy with automatic salt generation
     * @param _owner Owner of the new bounty contract
     * @return proxy Address of the deployed proxy
     */
    function deployProxyAuto(address _owner) external returns (address proxy) {
        bytes32 salt = keccak256(abi.encodePacked(_owner, block.timestamp, msg.sender));
        return this.deployProxy(_owner, salt);
    }
    
    /**
     * @dev Predict proxy address for given owner and salt
     * @param _owner Owner address
     * @param _salt Deployment salt
     * @return predicted Predicted proxy address
     */
    function predictProxyAddress(address _owner, bytes32 _salt) external view returns (address predicted) {
        bytes memory bytecode = abi.encodePacked(
            type(StandardBountiesProxy).creationCode,
            abi.encode(implementation)
        );
        
        bytes32 hash = keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            _salt,
            keccak256(bytecode)
        ));
        
        predicted = address(uint160(uint256(hash)));
    }
    
    /**
     * @dev Get deployment cost estimation
     * @return gas Estimated gas cost for proxy deployment
     */
    function getDeploymentCost() external pure returns (uint256 gas) {
        // Proxy deployment is approximately 100-200k gas
        return 150000;
    }
}

/**
 * @title StandardBountiesImplementation
 * @notice Implementation contract with proxy-safe initialization
 */
contract StandardBountiesImplementation {
    
    // Storage layout (must match proxy storage)
    mapping(uint256 => uint256) private _bountyDataA;     // issuer + arbiter
    mapping(uint256 => uint256) private _bountyDataB;     // token + state + deadline + created
    mapping(uint256 => uint256) private _bountyBalances;  // balance amounts
    mapping(uint256 => uint256) private _bountyTotals;    // total funding amounts
    mapping(uint256 => string) private _bountyData;       // IPFS data
    mapping(uint256 => mapping(uint256 => address)) private _fulfillments;  // fulfillmentId => fulfiller
    mapping(uint256 => mapping(uint256 => uint256)) private _fulfillmentAmounts;  // amounts
    mapping(uint256 => mapping(uint256 => uint8)) private _fulfillmentStates;    // states
    mapping(uint256 => mapping(address => uint256)) private _contributions;      // contributor amounts
    mapping(uint256 => address[]) private _bountyFunders;  // list of funders
    
    uint256 public bountyCount;
    address public owner;
    address public feeRecipient;
    uint256 public platformFeeRate;
    bool public paused;
    
    // Initialization flag
    bool private _implementationInitialized;
    
    // Events
    event BountyInitialized(uint256 indexed bountyId, address indexed issuer, address indexed arbiter);
    event BountyFunded(uint256 indexed bountyId, address indexed funder, uint256 amount);
    event FulfillmentSubmitted(uint256 indexed bountyId, uint256 indexed fulfillmentId, address indexed fulfiller);
    event FulfillmentAccepted(uint256 indexed bountyId, uint256 indexed fulfillmentId, uint256 amount);
    
    // Errors
    error Unauthorized();
    error InvalidBounty();
    error InvalidAmount();
    error TokenMismatch();
    error ContractPaused();
    error AlreadyInitialized();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    modifier validBounty(uint256 _bountyId) {
        if (_bountyId >= bountyCount) revert InvalidBounty();
        _;
    }
    
    /**
     * @dev Proxy-safe initialization (replaces constructor)
     * @param _owner Initial owner of the contract
     */
    function initialize(address _owner) external {
        if (_implementationInitialized) revert AlreadyInitialized();
        require(_owner != address(0), "Invalid owner");
        
        owner = _owner;
        feeRecipient = _owner;
        platformFeeRate = 250; // 2.5%
        _implementationInitialized = true;
    }
    
    /**
     * @dev Initialize a new bounty with arbiter support
     * @param _issuer Address that can accept fulfillments for this bounty
     * @param _arbiter Address that can accept fulfillments (optional, use address(0) for none)
     * @param _data IPFS hash of the bounty data
     * @param _deadline Unix timestamp of the bounty deadline
     * @return bountyId The ID of the newly created bounty
     */
    function initializeBounty(
        address _issuer,
        address _arbiter,
        string calldata _data,
        uint256 _deadline
    ) external whenNotPaused returns (uint256 bountyId) {
        require(_issuer != address(0), "Invalid issuer");
        require(_deadline > block.timestamp + 7200, "Invalid deadline"); // 2 hours minimum
        
        bountyId = bountyCount++;
        
        // Pack data into slot A: issuer(160) + arbiter(96) = 256 bits max
        uint256 dataA = uint256(uint160(_issuer)) | 
                       (uint256(uint160(_arbiter)) << 160);
        
        // Pack data into slot B: token(160) + state(8) + deadline(64) + created(24) = 256 bits max  
        uint256 dataB = uint256(0) |  // token = 0 (ETH)
                       (uint256(0) << 160) |  // state = 0 (DRAFT)
                       (uint256(_deadline) << 168) |
                       (uint256(block.timestamp) << 232);
        
        _bountyDataA[bountyId] = dataA;
        _bountyDataB[bountyId] = dataB;
        _bountyData[bountyId] = _data;
        
        emit BountyInitialized(bountyId, _issuer, _arbiter);
    }
    
    /**
     * @dev Fund a bounty with ETH
     * @param _bountyId The ID of the bounty
     */
    function fundBountyETH(uint256 _bountyId) 
        external 
        payable 
        validBounty(_bountyId) 
        whenNotPaused 
    {
        require(msg.value > 0, "Invalid amount");
        
        uint256 dataB = _bountyDataB[_bountyId];
        uint256 currentBalance = _bountyBalances[_bountyId];
        uint256 currentTotal = _bountyTotals[_bountyId];
        
        // Extract state and token from dataB
        address currentToken = address(uint160(dataB));
        uint8 currentState = uint8(dataB >> 160);
        
        // Validate funding conditions
        require(currentState <= 1, "Cannot fund"); // DRAFT or ACTIVE only
        require(currentToken == address(0), "Token mismatch"); // ETH bounty only
        
        // Update balances
        uint256 newBalance = currentBalance + msg.value;
        uint256 newTotal = currentTotal + msg.value;
        
        _bountyBalances[_bountyId] = newBalance;
        _bountyTotals[_bountyId] = newTotal;
        
        // Update state to ACTIVE if was DRAFT
        if (currentState == 0) {
            uint256 tokenAndRest = dataB & ~(uint256(0xFF) << 160);
            dataB = tokenAndRest | (uint256(1) << 160); // Set state to ACTIVE
            _bountyDataB[_bountyId] = dataB;
        }
        
        // Track contribution
        if (_contributions[_bountyId][msg.sender] == 0) {
            _bountyFunders[_bountyId].push(msg.sender);
        }
        _contributions[_bountyId][msg.sender] += msg.value;
        
        emit BountyFunded(_bountyId, msg.sender, msg.value);
    }
    
    /**
     * @dev Submit a fulfillment for a bounty
     * @param _bountyId The ID of the bounty
     * @param _data IPFS hash of the fulfillment data
     * @return fulfillmentId The ID of the newly created fulfillment
     */
    function fulfillBounty(uint256 _bountyId, string calldata _data) 
        external 
        validBounty(_bountyId) 
        whenNotPaused 
        returns (uint256 fulfillmentId) 
    {
        uint256 dataB = _bountyDataB[_bountyId];
        
        uint8 state = uint8(dataB >> 160);
        uint256 deadline = uint256(uint64(dataB >> 168));
        
        require(state == 1, "Bounty not active");
        require(block.timestamp < deadline, "Bounty expired");
        
        // Use a simple counter for fulfillments
        fulfillmentId = 0; // Simplified: only allow one fulfillment per bounty
        
        // Store fulfillment
        _fulfillments[_bountyId][fulfillmentId] = msg.sender;
        _fulfillmentStates[_bountyId][fulfillmentId] = 0; // PENDING
        
        emit FulfillmentSubmitted(_bountyId, fulfillmentId, msg.sender);
    }
    
    /**
     * @dev Accept a fulfillment and pay the fulfiller
     * @param _bountyId The ID of the bounty
     * @param _fulfillmentId The ID of the fulfillment
     * @param _amount The amount to pay (in wei for ETH, in token units for ERC20)
     */
    function acceptFulfillment(
        uint256 _bountyId, 
        uint256 _fulfillmentId, 
        uint256 _amount
    ) external validBounty(_bountyId) whenNotPaused {
        uint256 dataA = _bountyDataA[_bountyId];
        uint256 dataB = _bountyDataB[_bountyId];
        uint256 currentBalance = _bountyBalances[_bountyId];
        
        address issuer = address(uint160(dataA));
        address arbiter = address(uint160(dataA >> 160));
        
        require(msg.sender == issuer || msg.sender == arbiter, "Unauthorized");
        require(_amount > 0, "Invalid amount");
        require(_fulfillmentStates[_bountyId][_fulfillmentId] == 0, "Already processed");
        require(_amount <= currentBalance, "Insufficient balance");
        
        address fulfiller = _fulfillments[_bountyId][_fulfillmentId];
        require(fulfiller != address(0), "Invalid fulfillment");
        
        // Calculate fees
        uint256 fee = (_amount * platformFeeRate) / 10000;
        uint256 payout = _amount - fee;
        
        // Update fulfillment state
        _fulfillmentStates[_bountyId][_fulfillmentId] = 1; // ACCEPTED
        _fulfillmentAmounts[_bountyId][_fulfillmentId] = _amount;
        
        // Update bounty balance
        uint256 newBalance = currentBalance - _amount;
        _bountyBalances[_bountyId] = newBalance;
        
        // Update state to COMPLETED if balance is zero
        if (newBalance == 0) {
            uint256 tokenAndRest = dataB & ~(uint256(0xFF) << 160);
            dataB = tokenAndRest | (uint256(2) << 160); // Set state to COMPLETED
            _bountyDataB[_bountyId] = dataB;
        }
        
        // Transfer payment
        address token = address(uint160(dataB));
        if (token == address(0)) {
            // ETH payment
            payable(fulfiller).transfer(payout);
            if (fee > 0) payable(feeRecipient).transfer(fee);
        } else {
            // ERC20 payment
            (bool success1, ) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", fulfiller, payout)
            );
            require(success1, "Transfer failed");
            
            if (fee > 0) {
                (bool success2, ) = token.call(
                    abi.encodeWithSignature("transfer(address,uint256)", feeRecipient, fee)
                );
                require(success2, "Fee transfer failed");
            }
        }
        
        emit FulfillmentAccepted(_bountyId, _fulfillmentId, _amount);
    }
    
    /**
     * @dev Fund a bounty with ERC20 tokens
     * @param _bountyId The ID of the bounty
     * @param _token The token contract address
     * @param _amount The amount of tokens to fund
     */
    function fundBountyToken(
        uint256 _bountyId,
        address _token,
        uint256 _amount
    ) external validBounty(_bountyId) whenNotPaused {
        require(_token != address(0), "Invalid token");
        require(_amount > 0, "Invalid amount");
        
        uint256 dataB = _bountyDataB[_bountyId];
        uint256 currentBalance = _bountyBalances[_bountyId];
        uint256 currentTotal = _bountyTotals[_bountyId];
        
        // Extract state and token from dataB
        address currentToken = address(uint160(dataB));
        uint8 currentState = uint8(dataB >> 160);
        
        // Validate funding conditions
        require(currentState <= 1, "Cannot fund"); // DRAFT or ACTIVE only
        require(currentToken == address(0) || currentToken == _token, "Token mismatch");
        
        // Update token in dataB if first token funding
        if (currentToken == address(0)) {
            uint256 addressMask = (1 << 160) - 1; // 160-bit mask for address
            uint256 stateAndRest = dataB & ~addressMask;
            dataB = uint256(uint160(_token)) | stateAndRest;
            _bountyDataB[_bountyId] = dataB;
        }
        
        // Transfer tokens
        (bool success, ) = _token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", 
            msg.sender, address(this), _amount)
        );
        require(success, "Transfer failed");
        
        // Update balances
        uint256 newBalance = currentBalance + _amount;
        uint256 newTotal = currentTotal + _amount;
        
        _bountyBalances[_bountyId] = newBalance;
        _bountyTotals[_bountyId] = newTotal;
        
        // Update state to ACTIVE if was DRAFT
        if (currentState == 0) {
            uint256 tokenAndRest = dataB & ~(uint256(0xFF) << 160);
            dataB = tokenAndRest | (uint256(1) << 160);
            _bountyDataB[_bountyId] = dataB;
        }
        
        // Track contribution
        if (_contributions[_bountyId][msg.sender] == 0) {
            _bountyFunders[_bountyId].push(msg.sender);
        }
        _contributions[_bountyId][msg.sender] += _amount;
        
        emit BountyFunded(_bountyId, msg.sender, _amount);
    }
    
    /**
     * @dev Get fulfillment information
     * @param _bountyId The ID of the bounty
     * @param _fulfillmentId The ID of the fulfillment
     */
    function getFulfillment(
        uint256 _bountyId,
        uint256 _fulfillmentId
    ) external view validBounty(_bountyId) returns (
        address fulfiller,
        uint256 amount,
        uint8 state
    ) {
        fulfiller = _fulfillments[_bountyId][_fulfillmentId];
        amount = _fulfillmentAmounts[_bountyId][_fulfillmentId];
        state = _fulfillmentStates[_bountyId][_fulfillmentId];
    }
    
    /**
     * @dev Get bounty information
     * @param _bountyId The ID of the bounty
     */
    function getBounty(uint256 _bountyId) external view validBounty(_bountyId) returns (
        address issuer,
        address arbiter,
        address token,
        string memory data,
        uint256 balance,
        uint256 totalFunding,
        uint256 deadline,
        uint8 state,
        uint256 createdAt,
        uint256 fulfillmentCount
    ) {
        uint256 dataA = _bountyDataA[_bountyId];
        uint256 dataB = _bountyDataB[_bountyId];
        
        issuer = address(uint160(dataA));
        arbiter = address(uint160(dataA >> 160));
        token = address(uint160(dataB));
        state = uint8(dataB >> 160);
        
        balance = _bountyBalances[_bountyId];
        totalFunding = _bountyTotals[_bountyId];
        deadline = uint256(uint64(dataB >> 168));
        createdAt = uint256(uint64(dataB >> 232));
        fulfillmentCount = 0; // Simplified for now
        
        data = _bountyData[_bountyId];
    }
    
    /**
     * @dev Pause the contract (owner only)
     */
    function pause() external onlyOwner {
        paused = true;
    }
    
    /**
     * @dev Unpause the contract (owner only)
     */
    function unpause() external onlyOwner {
        paused = false;
    }
    
    /**
     * @dev Set platform fee rate (owner only)
     * @param _feeRate New fee rate in basis points (100 = 1%)
     */
    function setPlatformFee(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "Fee too high"); // Max 10%
        platformFeeRate = _feeRate;
    }
}