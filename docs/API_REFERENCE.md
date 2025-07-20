# API Reference - StandardBounties Smart Contract System

## Overview

This document provides a comprehensive API reference for the StandardBounties smart contract system. The system implements the EIP-1337 standard through a proxy pattern architecture, providing gas-efficient bounty management functionality.

## Contract Interfaces

### StandardBountiesImplementation

The core contract containing all bounty management logic.

#### State Variables

```solidity
uint256 public bountyCount;
address public owner;
address public feeRecipient;
uint256 public platformFeeRate;
bool public paused;
```

#### Events

```solidity
event BountyInitialized(
    uint256 indexed bountyId, 
    address indexed issuer, 
    address indexed arbiter
);

event BountyFunded(
    uint256 indexed bountyId, 
    address indexed funder, 
    uint256 amount
);

event FulfillmentSubmitted(
    uint256 indexed bountyId, 
    uint256 indexed fulfillmentId, 
    address indexed fulfiller
);

event FulfillmentAccepted(
    uint256 indexed bountyId, 
    uint256 indexed fulfillmentId, 
    uint256 amount
);
```

#### Custom Errors

```solidity
error Unauthorized();
error InvalidBounty();
error InvalidAmount();
error TokenMismatch();
error ContractPaused();
error AlreadyInitialized();
```

### StandardBountiesFactory

Factory contract for deploying proxy instances.

#### State Variables

```solidity
address public immutable implementation;
mapping(address => bool) public isProxy;
mapping(address => address) public proxyOwner;
```

#### Events

```solidity
event ProxyDeployed(
    address indexed proxy, 
    address indexed owner, 
    bytes32 salt
);
```

### StandardBountiesProxy

Minimal proxy that delegates to implementation.

#### State Variables

```solidity
address public immutable implementation;
```

## Core Functions

### Bounty Management

#### initializeBounty

Creates a new bounty with specified parameters.

```solidity
function initializeBounty(
    address _issuer,
    address _arbiter,
    string calldata _data,
    uint256 _deadline
) external whenNotPaused returns (uint256 bountyId)
```

**Parameters**:
- `_issuer` (address): Address authorized to accept fulfillments
- `_arbiter` (address): Optional arbitrator address (use address(0) for none)
- `_data` (string): IPFS hash containing bounty description and requirements
- `_deadline` (uint256): Unix timestamp when bounty expires

**Returns**:
- `bountyId` (uint256): Unique identifier for the created bounty

**Requirements**:
- Contract must not be paused
- Issuer address must not be zero
- Deadline must be at least 2 hours in the future
- Caller must have appropriate permissions

**Events Emitted**:
- `BountyInitialized(bountyId, issuer, arbiter)`

**Example Usage**:
```javascript
const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours
const tx = await contract.initializeBounty(
    issuerAddress,
    arbitratorAddress,
    "QmBountyDescriptionHash",
    deadline
);
const receipt = await tx.wait();
const bountyId = receipt.events[0].args.bountyId;
```

#### getBounty

Retrieves complete bounty information.

```solidity
function getBounty(uint256 _bountyId) external view returns (
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
)
```

**Parameters**:
- `_bountyId` (uint256): Bounty identifier

**Returns**:
- `issuer` (address): Address that can accept fulfillments
- `arbiter` (address): Arbitrator address (address(0) if none)
- `token` (address): Token contract address (address(0) for ETH)
- `data` (string): IPFS hash of bounty description
- `balance` (uint256): Current available balance
- `totalFunding` (uint256): Total amount ever funded
- `deadline` (uint256): Expiration timestamp
- `state` (uint8): Current state (0=DRAFT, 1=ACTIVE, 2=COMPLETED)
- `createdAt` (uint256): Creation timestamp
- `fulfillmentCount` (uint256): Number of submitted fulfillments

**Example Usage**:
```javascript
const bounty = await contract.getBounty(bountyId);
console.log(`Bounty ${bountyId}:`);
console.log(`- Issuer: ${bounty.issuer}`);
console.log(`- Balance: ${ethers.formatEther(bounty.balance)} ETH`);
console.log(`- State: ${bounty.state}`);
console.log(`- Deadline: ${new Date(bounty.deadline * 1000)}`);
```

### Funding Functions

#### fundBountyETH

Funds a bounty with ETH.

```solidity
function fundBountyETH(uint256 _bountyId) external payable validBounty(_bountyId) whenNotPaused
```

**Parameters**:
- `_bountyId` (uint256): Target bounty identifier

**Requirements**:
- Bounty must exist
- Contract must not be paused
- Bounty state must be DRAFT or ACTIVE
- Bounty must be ETH-only (no token set)
- Value must be greater than 0

**State Changes**:
- Increases bounty balance by msg.value
- Updates total funding amount
- Changes state from DRAFT to ACTIVE if first funding
- Tracks contributor and contribution amount

**Events Emitted**:
- `BountyFunded(bountyId, funder, amount)`

**Example Usage**:
```javascript
const fundingAmount = ethers.parseEther("0.1");
const tx = await contract.fundBountyETH(bountyId, { value: fundingAmount });
await tx.wait();
```

#### fundBountyToken

Funds a bounty with ERC20 tokens.

```solidity
function fundBountyToken(
    uint256 _bountyId,
    address _token,
    uint256 _amount
) external validBounty(_bountyId) whenNotPaused
```

**Parameters**:
- `_bountyId` (uint256): Target bounty identifier
- `_token` (address): ERC20 token contract address
- `_amount` (uint256): Amount of tokens to fund

**Requirements**:
- Bounty must exist
- Contract must not be paused
- Bounty state must be DRAFT or ACTIVE
- Token address must not be zero
- Amount must be greater than 0
- Caller must have approved contract to spend tokens
- Token must match existing bounty token (if any)

**Example Usage**:
```javascript
// First approve the contract to spend tokens
const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
await tokenContract.approve(contractAddress, amount);

// Then fund the bounty
const tx = await contract.fundBountyToken(bountyId, tokenAddress, amount);
await tx.wait();
```

### Fulfillment Functions

#### fulfillBounty

Submits work for a bounty.

```solidity
function fulfillBounty(
    uint256 _bountyId,
    string calldata _data
) external validBounty(_bountyId) whenNotPaused returns (uint256 fulfillmentId)
```

**Parameters**:
- `_bountyId` (uint256): Target bounty identifier
- `_data` (string): IPFS hash containing fulfillment data

**Returns**:
- `fulfillmentId` (uint256): Unique fulfillment identifier

**Requirements**:
- Bounty must exist
- Contract must not be paused
- Bounty state must be ACTIVE
- Current time must be before deadline

**Events Emitted**:
- `FulfillmentSubmitted(bountyId, fulfillmentId, fulfiller)`

**Example Usage**:
```javascript
const fulfillmentData = "QmFulfillmentHash";
const tx = await contract.fulfillBounty(bountyId, fulfillmentData);
const receipt = await tx.wait();
const fulfillmentId = receipt.events[0].args.fulfillmentId;
```

#### acceptFulfillment

Accepts a fulfillment and transfers payment.

```solidity
function acceptFulfillment(
    uint256 _bountyId,
    uint256 _fulfillmentId,
    uint256 _amount
) external validBounty(_bountyId) whenNotPaused
```

**Parameters**:
- `_bountyId` (uint256): Target bounty identifier
- `_fulfillmentId` (uint256): Target fulfillment identifier
- `_amount` (uint256): Payment amount (in wei for ETH, token units for ERC20)

**Requirements**:
- Bounty must exist
- Contract must not be paused
- Caller must be bounty issuer or arbiter
- Amount must be greater than 0
- Amount must not exceed bounty balance
- Fulfillment must be in PENDING state

**State Changes**:
- Marks fulfillment as ACCEPTED
- Reduces bounty balance by payment amount
- Transfers payment to fulfiller (minus platform fee)
- Transfers platform fee to fee recipient
- May change bounty state to COMPLETED if balance reaches zero

**Events Emitted**:
- `FulfillmentAccepted(bountyId, fulfillmentId, amount)`

**Example Usage**:
```javascript
const paymentAmount = ethers.parseEther("0.05");
const tx = await contract.acceptFulfillment(bountyId, fulfillmentId, paymentAmount);
await tx.wait();
```

#### getFulfillment

Retrieves fulfillment information.

```solidity
function getFulfillment(
    uint256 _bountyId,
    uint256 _fulfillmentId
) external view returns (
    address fulfiller,
    uint256 amount,
    uint8 state
)
```

**Parameters**:
- `_bountyId` (uint256): Bounty identifier
- `_fulfillmentId` (uint256): Fulfillment identifier

**Returns**:
- `fulfiller` (address): Address that submitted the fulfillment
- `amount` (uint256): Payment amount (0 if not yet accepted)
- `state` (uint8): Fulfillment state (0=PENDING, 1=ACCEPTED, 2=REJECTED)

### Administrative Functions

#### pause / unpause

Controls contract operation state.

```solidity
function pause() external onlyOwner
function unpause() external onlyOwner
```

**Requirements**:
- Caller must be contract owner

**Effect**:
- Prevents/allows all state-changing operations
- Does not affect view functions

#### setPlatformFee

Updates the platform fee rate.

```solidity
function setPlatformFee(uint256 _feeRate) external onlyOwner
```

**Parameters**:
- `_feeRate` (uint256): Fee rate in basis points (100 = 1%, 250 = 2.5%)

**Requirements**:
- Caller must be contract owner
- Fee rate must not exceed 1000 (10%)

### Factory Functions

#### deployProxy

Deploys a new proxy contract.

```solidity
function deployProxy(
    address _owner,
    bytes32 _salt
) external returns (address proxy)
```

**Parameters**:
- `_owner` (address): Owner of the new proxy contract
- `_salt` (bytes32): Salt for deterministic address generation

**Returns**:
- `proxy` (address): Address of deployed proxy contract

**Events Emitted**:
- `ProxyDeployed(proxy, owner, salt)`

#### deployProxyAuto

Deploys a proxy with automatically generated salt.

```solidity
function deployProxyAuto(address _owner) external returns (address proxy)
```

**Parameters**:
- `_owner` (address): Owner of the new proxy contract

**Returns**:
- `proxy` (address): Address of deployed proxy contract

#### predictProxyAddress

Calculates the address a proxy would have with given parameters.

```solidity
function predictProxyAddress(
    address _owner,
    bytes32 _salt
) external view returns (address predicted)
```

**Parameters**:
- `_owner` (address): Intended proxy owner
- `_salt` (bytes32): Salt for address calculation

**Returns**:
- `predicted` (address): Predicted proxy address

## Gas Costs

### Deployment Costs

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Implementation Deployment | 1,072,744 | One-time per network |
| Factory Deployment | 787,570 | One-time per network |
| Proxy Deployment | 406,161 | Per bounty instance |

### Operation Costs

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Create Bounty | ~150,000 | Initial bounty setup |
| Fund Bounty (ETH) | ~80,000 | Add funds to bounty |
| Fund Bounty (ERC20) | ~120,000 | Add tokens to bounty |
| Submit Fulfillment | ~100,000 | Submit work |
| Accept Fulfillment | ~120,000 | Pay fulfiller |
| View Functions | ~5,000 | Read contract state |

## Error Handling

### Common Error Scenarios

#### InvalidBounty
- **Cause**: Bounty ID does not exist
- **Solution**: Verify bounty ID before calling functions

#### Unauthorized  
- **Cause**: Caller lacks required permissions
- **Solution**: Use correct account (issuer/arbiter for acceptance)

#### TokenMismatch
- **Cause**: Trying to fund with wrong token type
- **Solution**: Use consistent token type for bounty

#### ContractPaused
- **Cause**: Contract is paused by owner
- **Solution**: Wait for unpause or contact administrator

#### InvalidAmount
- **Cause**: Amount is zero or exceeds available balance
- **Solution**: Verify amount is positive and within limits

### Error Handling Examples

```javascript
try {
    const tx = await contract.acceptFulfillment(bountyId, fulfillmentId, amount);
    await tx.wait();
} catch (error) {
    if (error.message.includes("InvalidBounty")) {
        console.error("Bounty does not exist");
    } else if (error.message.includes("Unauthorized")) {
        console.error("You are not authorized to perform this action");
    } else if (error.message.includes("InvalidAmount")) {
        console.error("Payment amount is invalid");
    } else {
        console.error("Unexpected error:", error.message);
    }
}
```

## Integration Examples

### Creating and Funding a Bounty

```javascript
async function createAndFundBounty(issuer, description, deadline, fundingAmount) {
    // 1. Create bounty
    const createTx = await contract.initializeBounty(
        issuer,
        ethers.ZeroAddress, // No arbiter
        description,
        deadline
    );
    const createReceipt = await createTx.wait();
    const bountyId = createReceipt.events[0].args.bountyId;
    
    // 2. Fund bounty
    const fundTx = await contract.fundBountyETH(bountyId, {
        value: fundingAmount
    });
    await fundTx.wait();
    
    return bountyId;
}
```

### Monitoring Bounty Events

```javascript
// Listen for new bounties
contract.on("BountyInitialized", (bountyId, issuer, arbiter, event) => {
    console.log(`New bounty ${bountyId} created by ${issuer}`);
});

// Listen for funding
contract.on("BountyFunded", (bountyId, funder, amount, event) => {
    console.log(`Bounty ${bountyId} funded with ${ethers.formatEther(amount)} ETH`);
});

// Listen for fulfillments
contract.on("FulfillmentSubmitted", (bountyId, fulfillmentId, fulfiller, event) => {
    console.log(`Fulfillment ${fulfillmentId} submitted for bounty ${bountyId}`);
});
```

### Working with Proxies

```javascript
// Deploy a new proxy
const factory = new ethers.Contract(factoryAddress, factoryAbi, signer);
const deployTx = await factory.deployProxyAuto(ownerAddress);
const deployReceipt = await deployTx.wait();
const proxyAddress = deployReceipt.events[0].args.proxy;

// Interact with proxy using implementation ABI
const proxy = new ethers.Contract(proxyAddress, implementationAbi, signer);
await proxy.initialize(ownerAddress);
```

## Best Practices

### Security Considerations

1. **Always validate bounty existence** before operations
2. **Check bounty state** before state-changing operations
3. **Verify permissions** before administrative actions
4. **Handle errors gracefully** in frontend applications
5. **Monitor events** for state changes
6. **Use appropriate gas limits** for operations

### Gas Optimization

1. **Batch operations** when possible
2. **Use view functions** for reading state
3. **Monitor gas prices** before transactions
4. **Consider L2 networks** for lower costs

### Development Workflow

1. **Test on testnets** before mainnet deployment
2. **Verify contracts** on block explorers
3. **Monitor contract health** in production
4. **Keep documentation updated** with contract addresses

---

**Note**: This API reference covers the current version of the StandardBounties system. Always refer to the latest contract code for the most up-to-date function signatures and requirements.