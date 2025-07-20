# StandardBounties API Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [Core Contract Functions](#core-contract-functions)
5. [Events](#events)
6. [Error Handling](#error-handling)
7. [Gas Optimization](#gas-optimization)
8. [Security Considerations](#security-considerations)
9. [Integration Examples](#integration-examples)
10. [Real-Time Monitoring](#real-time-monitoring)

## Introduction

The StandardBounties API provides a comprehensive interface for interacting with the StandardBounties smart contract system. This documentation covers all available functions, events, and integration patterns for building applications on top of the StandardBounties protocol.

### Contract Architecture

**Proxy Pattern Implementation:**
- Implementation Contract: Contains core logic
- Factory Contract: Deploys proxy instances
- Proxy Contract: Minimal proxy for gas optimization

**Deployment Information:**
- Solidity Version: 0.8.20
- OpenZeppelin Version: 4.9.0
- Gas Limit: Under 500,000 for proxy deployment
- Networks: Ethereum, Polygon, Arbitrum

## Getting Started

### Contract Addresses

**Ethereum Mainnet:**
```
Implementation: 0x[CONTRACT_ADDRESS]
Factory: 0x[FACTORY_ADDRESS]
```

**Sepolia Testnet:**
```
Implementation: 0x[TESTNET_IMPLEMENTATION]
Factory: 0x[TESTNET_FACTORY]
```

**Polygon Mainnet:**
```
Implementation: 0x[POLYGON_IMPLEMENTATION]
Factory: 0x[POLYGON_FACTORY]
```

### ABI Interfaces

**StandardBountiesImplementation ABI:**
```json
[
  {
    "type": "function",
    "name": "initializeBounty",
    "inputs": [
      {"name": "_issuer", "type": "address"},
      {"name": "_arbiter", "type": "address"},
      {"name": "_data", "type": "string"},
      {"name": "_deadline", "type": "uint256"}
    ],
    "outputs": [{"name": "bountyId", "type": "uint256"}],
    "stateMutability": "nonpayable"
  }
]
```

### JavaScript Integration

**Using Ethers.js:**
```javascript
import { ethers } from 'ethers';

// Connect to contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

// Create bounty
const tx = await contract.initializeBounty(
  issuerAddress,
  arbiterAddress,
  "ipfs://bounty-data",
  Math.floor(Date.now() / 1000) + 86400
);
```

**Using Web3.js:**
```javascript
import Web3 from 'web3';

// Initialize Web3
const web3 = new Web3(RPC_URL);
const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

// Create bounty
const result = await contract.methods.initializeBounty(
  issuerAddress,
  arbiterAddress,
  "ipfs://bounty-data",
  Math.floor(Date.now() / 1000) + 86400
).send({ from: senderAddress });
```

## Authentication

### Wallet Connection

**MetaMask Integration:**
```javascript
// Request account access
await window.ethereum.request({ method: 'eth_requestAccounts' });

// Create provider and signer
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
```

**WalletConnect Integration:**
```javascript
import { WalletConnectProvider } from '@walletconnect/ethereum-provider';

// Initialize WalletConnect
const provider = await WalletConnectProvider.init({
  projectId: 'YOUR_PROJECT_ID',
  chains: [1], // Ethereum mainnet
  showQrModal: true
});

// Enable session
await provider.enable();
const ethersProvider = new ethers.BrowserProvider(provider);
```

### Access Control

**Owner Functions:**
- pause()
- unpause()
- setPlatformFee()
- emergencyWithdraw()

**Issuer Functions:**
- initializeBounty()
- acceptFulfillment()

**Public Functions:**
- fundBountyETH()
- fulfillBounty()
- getBounty()

## Core Contract Functions

### Bounty Management

#### initializeBounty

Creates a new bounty with specified parameters.

**Function Signature:**
```solidity
function initializeBounty(
    address _issuer,
    address _arbiter,
    string calldata _data,
    uint256 _deadline
) external returns (uint256 bountyId)
```

**Parameters:**
- `_issuer`: Address of the bounty issuer
- `_arbiter`: Address of the arbiter (can be zero address)
- `_data`: IPFS hash or metadata string
- `_deadline`: Unix timestamp deadline (minimum 2 hours from now)

**Returns:**
- `bountyId`: Unique identifier for the created bounty

**Gas Usage:** Approximately 121,000 gas

**JavaScript Example:**
```javascript
const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours
const tx = await contract.initializeBounty(
  "0x742d35Cc4e8a3b1b31eD8C0a748e9b091a4E5e72",
  "0x0000000000000000000000000000000000000000", // No arbiter
  "ipfs://QmBountyData123",
  deadline
);
const receipt = await tx.wait();
const bountyId = receipt.logs[0].args.bountyId;
```

#### fundBountyETH

Funds a bounty with ETH, activating it for fulfillment.

**Function Signature:**
```solidity
function fundBountyETH(uint256 _bountyId) external payable
```

**Parameters:**
- `_bountyId`: ID of the bounty to fund

**Requirements:**
- Must send ETH with transaction
- Bounty must exist and be in DRAFT or ACTIVE state

**Gas Usage:** Approximately 147,000 gas

**JavaScript Example:**
```javascript
const fundingAmount = ethers.parseEther("0.1"); // 0.1 ETH
const tx = await contract.fundBountyETH(bountyId, {
  value: fundingAmount
});
await tx.wait();
```

#### fundBountyToken

Funds a bounty with ERC20 tokens.

**Function Signature:**
```solidity
function fundBountyToken(
    uint256 _bountyId,
    address _token,
    uint256 _amount
) external
```

**Parameters:**
- `_bountyId`: ID of the bounty to fund
- `_token`: Address of the ERC20 token
- `_amount`: Amount of tokens to fund

**Requirements:**
- Token approval required before calling
- Bounty must exist and be in DRAFT or ACTIVE state

**JavaScript Example:**
```javascript
// First approve token transfer
const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
await tokenContract.approve(CONTRACT_ADDRESS, amount);

// Then fund bounty
const tx = await contract.fundBountyToken(
  bountyId,
  TOKEN_ADDRESS,
  ethers.parseUnits("100", 18) // 100 tokens
);
await tx.wait();
```

### Fulfillment Management

#### fulfillBounty

Submits a fulfillment for an active bounty.

**Function Signature:**
```solidity
function fulfillBounty(
    uint256 _bountyId,
    string calldata _data
) external returns (uint256 fulfillmentId)
```

**Parameters:**
- `_bountyId`: ID of the bounty to fulfill
- `_data`: IPFS hash or fulfillment metadata

**Requirements:**
- Bounty must be ACTIVE
- Deadline must not have passed

**Gas Usage:** Approximately 58,000 gas

**JavaScript Example:**
```javascript
const tx = await contract.fulfillBounty(
  bountyId,
  "ipfs://QmFulfillmentData456"
);
const receipt = await tx.wait();
const fulfillmentId = receipt.logs[0].args.fulfillmentId;
```

#### acceptFulfillment

Accepts a fulfillment and pays the fulfiller.

**Function Signature:**
```solidity
function acceptFulfillment(
    uint256 _bountyId,
    uint256 _fulfillmentId,
    uint256 _amount
) external
```

**Parameters:**
- `_bountyId`: ID of the bounty
- `_fulfillmentId`: ID of the fulfillment to accept
- `_amount`: Amount to pay the fulfiller

**Requirements:**
- Only issuer or arbiter can accept
- Fulfillment must be in PENDING state
- Sufficient bounty balance required

**Gas Usage:** Approximately 108,000 gas

**JavaScript Example:**
```javascript
const paymentAmount = ethers.parseEther("0.05");
const tx = await contract.acceptFulfillment(
  bountyId,
  fulfillmentId,
  paymentAmount
);
await tx.wait();
```

### View Functions

#### getBounty

Retrieves complete bounty information.

**Function Signature:**
```solidity
function getBounty(uint256 _bountyId) external view returns (
    address issuer,
    address arbiter,
    uint256 balance,
    uint256 state,
    uint256 deadline,
    string memory data
)
```

**Parameters:**
- `_bountyId`: ID of the bounty

**Returns:**
- `issuer`: Address of the bounty issuer
- `arbiter`: Address of the arbiter
- `balance`: Current bounty balance
- `state`: Bounty state (0=DRAFT, 1=ACTIVE, 2=COMPLETED)
- `deadline`: Unix timestamp deadline
- `data`: IPFS hash or metadata

**JavaScript Example:**
```javascript
const bountyInfo = await contract.getBounty(bountyId);
console.log("Issuer:", bountyInfo.issuer);
console.log("Balance:", ethers.formatEther(bountyInfo.balance));
console.log("State:", bountyInfo.state); // 0=DRAFT, 1=ACTIVE, 2=COMPLETED
console.log("Deadline:", new Date(bountyInfo.deadline * 1000));
```

#### getFulfillment

Retrieves fulfillment information.

**Function Signature:**
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

**Parameters:**
- `_bountyId`: ID of the bounty
- `_fulfillmentId`: ID of the fulfillment

**Returns:**
- `fulfiller`: Address of the fulfiller
- `amount`: Amount paid (if accepted)
- `state`: Fulfillment state (0=PENDING, 1=ACCEPTED, 2=REJECTED)

**JavaScript Example:**
```javascript
const fulfillmentInfo = await contract.getFulfillment(bountyId, fulfillmentId);
console.log("Fulfiller:", fulfillmentInfo.fulfiller);
console.log("Amount:", ethers.formatEther(fulfillmentInfo.amount));
console.log("State:", fulfillmentInfo.state);
```

### Administrative Functions

#### pause

Pauses all contract operations (owner only).

**Function Signature:**
```solidity
function pause() external onlyOwner
```

**JavaScript Example:**
```javascript
const tx = await contract.pause();
await tx.wait();
console.log("Contract paused");
```

#### unpause

Resumes contract operations (owner only).

**Function Signature:**
```solidity
function unpause() external onlyOwner
```

#### setPlatformFee

Sets the platform fee rate (owner only).

**Function Signature:**
```solidity
function setPlatformFee(uint256 _feeRate) external onlyOwner
```

**Parameters:**
- `_feeRate`: Fee rate in basis points (e.g., 500 = 5%)

**Requirements:**
- Fee rate must not exceed 50% (5000 basis points)

**JavaScript Example:**
```javascript
const feeRate = 500; // 5%
const tx = await contract.setPlatformFee(feeRate);
await tx.wait();
```

## Events

### BountyInitialized

Emitted when a new bounty is created.

**Event Signature:**
```solidity
event BountyInitialized(
    uint256 indexed bountyId,
    address indexed issuer,
    address indexed arbiter
)
```

**JavaScript Listening:**
```javascript
contract.on("BountyInitialized", (bountyId, issuer, arbiter, event) => {
  console.log("New bounty created:", {
    bountyId: bountyId.toString(),
    issuer,
    arbiter,
    blockNumber: event.blockNumber
  });
});
```

### BountyFunded

Emitted when a bounty receives funding.

**Event Signature:**
```solidity
event BountyFunded(
    uint256 indexed bountyId,
    address indexed funder,
    uint256 amount
)
```

**JavaScript Listening:**
```javascript
contract.on("BountyFunded", (bountyId, funder, amount, event) => {
  console.log("Bounty funded:", {
    bountyId: bountyId.toString(),
    funder,
    amount: ethers.formatEther(amount),
    blockNumber: event.blockNumber
  });
});
```

### FulfillmentSubmitted

Emitted when a fulfillment is submitted.

**Event Signature:**
```solidity
event FulfillmentSubmitted(
    uint256 indexed bountyId,
    uint256 indexed fulfillmentId,
    address indexed fulfiller
)
```

### FulfillmentAccepted

Emitted when a fulfillment is accepted and payment is made.

**Event Signature:**
```solidity
event FulfillmentAccepted(
    uint256 indexed bountyId,
    uint256 indexed fulfillmentId,
    uint256 amount
)
```

### Event Filtering

**Filter by Bounty ID:**
```javascript
const filter = contract.filters.BountyFunded(bountyId);
const events = await contract.queryFilter(filter, fromBlock, toBlock);
```

**Filter by Address:**
```javascript
const filter = contract.filters.BountyInitialized(null, issuerAddress);
const events = await contract.queryFilter(filter);
```

## Error Handling

### Custom Errors

**InvalidBounty():**
- Thrown when bounty ID doesn't exist
- Check bounty existence before operations

**Unauthorized():**
- Thrown when caller lacks required permissions
- Verify caller is issuer/arbiter for restricted functions

**InvalidAmount():**
- Thrown when amount is zero or invalid
- Ensure positive amounts for funding/payments

**InsufficientBalance():**
- Thrown when bounty lacks funds for payment
- Check bounty balance before accepting fulfillments

### Error Handling Patterns

**Try-Catch Pattern:**
```javascript
try {
  const tx = await contract.initializeBounty(
    issuer, arbiter, data, deadline
  );
  const receipt = await tx.wait();
  return receipt;
} catch (error) {
  if (error.reason === "Invalid deadline") {
    throw new Error("Deadline must be at least 2 hours in the future");
  }
  if (error.code === "INSUFFICIENT_FUNDS") {
    throw new Error("Insufficient ETH balance for transaction");
  }
  throw error;
}
```

**Gas Estimation:**
```javascript
try {
  const gasEstimate = await contract.initializeBounty.estimateGas(
    issuer, arbiter, data, deadline
  );
  
  const tx = await contract.initializeBounty(
    issuer, arbiter, data, deadline,
    { gasLimit: gasEstimate * 120n / 100n } // 20% buffer
  );
} catch (error) {
  console.error("Gas estimation failed:", error);
}
```

## Gas Optimization

### Gas Usage Guidelines

**Function Gas Costs:**
- initializeBounty: ~121,000 gas
- fundBountyETH: ~147,000 gas
- fulfillBounty: ~58,000 gas
- acceptFulfillment: ~108,000 gas

**Optimization Tips:**
```javascript
// Batch operations when possible
const multicall = await contract.interface.encodeFunctionData("multicall", [
  [
    contract.interface.encodeFunctionData("initializeBounty", [...args1]),
    contract.interface.encodeFunctionData("fundBountyETH", [...args2])
  ]
]);

// Use gas estimation
const gasEstimate = await contract.estimateGas.functionName(...args);
const tx = await contract.functionName(...args, {
  gasLimit: gasEstimate * 110n / 100n // 10% buffer
});
```

### Gas Price Management

**Dynamic Gas Pricing:**
```javascript
// Get current gas price
const gasPrice = await provider.getGasPrice();

// Use EIP-1559 for better pricing
const feeData = await provider.getFeeData();
const tx = await contract.functionName(...args, {
  maxFeePerGas: feeData.maxFeePerGas,
  maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
});
```

## Security Considerations

### Access Control Validation

**Check Permissions:**
```javascript
// Verify caller is bounty issuer
const bounty = await contract.getBounty(bountyId);
if (bounty.issuer !== signerAddress) {
  throw new Error("Only bounty issuer can perform this action");
}

// Check bounty state
if (bounty.state !== 1) { // ACTIVE
  throw new Error("Bounty must be active");
}
```

### Input Validation

**Validate Addresses:**
```javascript
function isValidAddress(address) {
  return ethers.isAddress(address) && address !== ethers.ZeroAddress;
}

if (!isValidAddress(issuerAddress)) {
  throw new Error("Invalid issuer address");
}
```

**Validate Amounts:**
```javascript
function validateAmount(amount) {
  if (!amount || amount <= 0) {
    throw new Error("Amount must be positive");
  }
  return true;
}
```

### Transaction Security

**Nonce Management:**
```javascript
const nonce = await provider.getTransactionCount(signerAddress, "pending");
const tx = await contract.functionName(...args, { nonce });
```

**Transaction Monitoring:**
```javascript
const tx = await contract.functionName(...args);
console.log("Transaction sent:", tx.hash);

const receipt = await tx.wait();
if (receipt.status === 0) {
  throw new Error("Transaction failed");
}
```

## Integration Examples

### React Integration

**Hook for Contract Interaction:**
```javascript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useStandardBounties(contractAddress) {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initContract() {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractInstance = new ethers.Contract(
          contractAddress, ABI, signer
        );
        setContract(contractInstance);
      }
      setLoading(false);
    }
    initContract();
  }, [contractAddress]);

  return { contract, loading };
}
```

**Create Bounty Component:**
```javascript
function CreateBounty({ contract }) {
  const [formData, setFormData] = useState({
    arbiter: '',
    data: '',
    deadline: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const deadline = Math.floor(new Date(formData.deadline).getTime() / 1000);
      const tx = await contract.initializeBounty(
        await contract.signer.getAddress(),
        formData.arbiter || ethers.ZeroAddress,
        formData.data,
        deadline
      );
      await tx.wait();
      alert('Bounty created successfully!');
    } catch (error) {
      alert('Error creating bounty: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Arbiter Address (optional)"
        value={formData.arbiter}
        onChange={(e) => setFormData({...formData, arbiter: e.target.value})}
      />
      <input
        type="text"
        placeholder="IPFS Data Hash"
        value={formData.data}
        onChange={(e) => setFormData({...formData, data: e.target.value})}
        required
      />
      <input
        type="datetime-local"
        value={formData.deadline}
        onChange={(e) => setFormData({...formData, deadline: e.target.value})}
        required
      />
      <button type="submit">Create Bounty</button>
    </form>
  );
}
```

### Node.js Backend Integration

**Express.js API Server:**
```javascript
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

app.get('/api/bounty/:id', async (req, res) => {
  try {
    const bountyId = req.params.id;
    const bounty = await contract.getBounty(bountyId);
    
    res.json({
      id: bountyId,
      issuer: bounty.issuer,
      arbiter: bounty.arbiter,
      balance: ethers.formatEther(bounty.balance),
      state: ['DRAFT', 'ACTIVE', 'COMPLETED'][bounty.state],
      deadline: new Date(bounty.deadline * 1000).toISOString(),
      data: bounty.data
    });
  } catch (error) {
    res.status(404).json({ error: 'Bounty not found' });
  }
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

## Real-Time Monitoring

### Event Monitoring Service

**Real-Time Event Listener:**
```javascript
class BountyMonitor {
  constructor(contractAddress, provider) {
    this.contract = new ethers.Contract(contractAddress, ABI, provider);
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Monitor new bounties
    this.contract.on("BountyInitialized", (bountyId, issuer, arbiter) => {
      this.handleNewBounty({ bountyId, issuer, arbiter });
    });

    // Monitor funding
    this.contract.on("BountyFunded", (bountyId, funder, amount) => {
      this.handleBountyFunded({ bountyId, funder, amount });
    });

    // Monitor fulfillments
    this.contract.on("FulfillmentSubmitted", (bountyId, fulfillmentId, fulfiller) => {
      this.handleNewFulfillment({ bountyId, fulfillmentId, fulfiller });
    });

    // Monitor acceptances
    this.contract.on("FulfillmentAccepted", (bountyId, fulfillmentId, amount) => {
      this.handleFulfillmentAccepted({ bountyId, fulfillmentId, amount });
    });
  }

  async handleNewBounty(event) {
    const bounty = await this.contract.getBounty(event.bountyId);
    console.log("New bounty created:", {
      id: event.bountyId.toString(),
      issuer: event.issuer,
      data: bounty.data,
      deadline: new Date(bounty.deadline * 1000)
    });
    
    // Send notification, update database, etc.
    await this.notifyNewBounty(event);
  }

  async handleBountyFunded(event) {
    console.log("Bounty funded:", {
      id: event.bountyId.toString(),
      funder: event.funder,
      amount: ethers.formatEther(event.amount)
    });
    
    // Update bounty status in database
    await this.updateBountyStatus(event.bountyId, 'ACTIVE');
  }
}

// Initialize monitoring
const monitor = new BountyMonitor(CONTRACT_ADDRESS, provider);
```

### Performance Monitoring

**Gas Usage Tracking:**
```javascript
class GasTracker {
  constructor() {
    this.gasUsage = new Map();
  }

  async trackTransaction(functionName, txPromise) {
    const startTime = Date.now();
    
    try {
      const tx = await txPromise;
      const receipt = await tx.wait();
      
      const gasUsed = receipt.gasUsed;
      const duration = Date.now() - startTime;
      
      this.gasUsage.set(functionName, {
        gasUsed: gasUsed.toString(),
        duration,
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.transactionHash
      });
      
      console.log(`${functionName} - Gas: ${gasUsed}, Duration: ${duration}ms`);
      return receipt;
    } catch (error) {
      console.error(`${functionName} failed:`, error);
      throw error;
    }
  }

  getAverageGasUsage(functionName) {
    const entries = Array.from(this.gasUsage.entries())
      .filter(([name]) => name === functionName);
    
    if (entries.length === 0) return null;
    
    const totalGas = entries.reduce((sum, [, data]) => 
      sum + parseInt(data.gasUsed), 0
    );
    
    return Math.round(totalGas / entries.length);
  }
}

// Usage
const gasTracker = new GasTracker();

const receipt = await gasTracker.trackTransaction(
  'initializeBounty',
  contract.initializeBounty(issuer, arbiter, data, deadline)
);
```

## API Reference Summary

### Core Functions

| Function | Gas Cost | Access | Description |
|----------|----------|--------|-------------|
| initializeBounty | ~121k | Public | Create new bounty |
| fundBountyETH | ~147k | Public | Fund bounty with ETH |
| fundBountyToken | ~165k | Public | Fund bounty with tokens |
| fulfillBounty | ~58k | Public | Submit fulfillment |
| acceptFulfillment | ~108k | Issuer/Arbiter | Accept and pay fulfillment |
| getBounty | 0 | View | Get bounty information |
| getFulfillment | 0 | View | Get fulfillment information |

### Events

| Event | Parameters | Description |
|-------|------------|-------------|
| BountyInitialized | bountyId, issuer, arbiter | New bounty created |
| BountyFunded | bountyId, funder, amount | Bounty received funding |
| FulfillmentSubmitted | bountyId, fulfillmentId, fulfiller | New fulfillment |
| FulfillmentAccepted | bountyId, fulfillmentId, amount | Payment made |

### Error Codes

| Error | Description | Resolution |
|-------|-------------|------------|
| InvalidBounty() | Bounty doesn't exist | Check bounty ID |
| Unauthorized() | Permission denied | Verify caller permissions |
| InvalidAmount() | Amount is zero/invalid | Use positive amounts |
| InsufficientBalance() | Not enough funds | Check bounty balance |

---

**Documentation Version:** 1.0.0  
**Last Updated:** 2025-07-20  
**Contract Version:** StandardBounties v1.0.0  
**Networks:** Ethereum, Polygon, Arbitrum