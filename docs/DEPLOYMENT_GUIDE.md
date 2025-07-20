# Deployment Guide - StandardBounties Smart Contract System

## Overview

This guide provides step-by-step instructions for deploying the StandardBounties smart contract system to various blockchain networks. The system uses a proxy pattern architecture that requires deploying multiple contracts in a specific sequence.

## Prerequisites

### Development Environment

- Node.js 16.0 or higher
- npm 7.0 or higher
- Git

### Required Tools

```bash
npm install -g hardhat
npm install -g @nomiclabs/hardhat-ethers
```

### Network Access

- RPC endpoint for target network
- Private key with sufficient funds for deployment
- API keys for contract verification (optional)

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd StandardBounties-Final
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# Network Configuration
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_api_key

# Contract Verification
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key

# Gas Reporting
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
REPORT_GAS=true
```

### 3. Network Configuration

The `hardhat.config.js` file includes configurations for multiple networks:

```javascript
networks: {
  sepolia: {
    url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY],
    chainId: 11155111,
  },
  mainnet: {
    url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY],
    chainId: 1,
  },
  polygon: {
    url: "https://polygon-rpc.com/",
    accounts: [PRIVATE_KEY],
    chainId: 137,
  }
}
```

## Pre-Deployment Checklist

### 1. Code Compilation

```bash
npx hardhat compile
```

Expected output:
```
Compiled 3 Solidity files successfully
```

### 2. Test Execution

```bash
npx hardhat test
```

Verify all tests pass:
```
✓ Should deploy implementation and factory
✓ Should deploy proxy under 500k gas
✓ Should create and fund bounties
✓ Should handle fulfillments correctly
... (all tests should pass)
```

### 3. Gas Estimation

```bash
npx hardhat run scripts/gas-analysis.js
```

Expected gas costs:
- Implementation: ~1,072,744 gas
- Factory: ~787,570 gas  
- Proxy: ~406,161 gas

### 4. Balance Verification

Ensure deployer account has sufficient funds:

| Network | Minimum Required | Recommended |
|---------|------------------|-------------|
| Ethereum Mainnet | 0.005 ETH | 0.01 ETH |
| Sepolia Testnet | 0.005 ETH | 0.01 ETH |
| Polygon | 0.1 MATIC | 0.5 MATIC |
| Arbitrum | 0.002 ETH | 0.005 ETH |

## Deployment Process

### Step 1: Deploy Implementation Contract

The implementation contract contains the core business logic and is deployed once per network.

```bash
# Deploy to testnet first
npx hardhat run scripts/deploy.js --network sepolia

# For mainnet deployment
npx hardhat run scripts/deploy.js --network mainnet
```

Expected output:
```
🚀 REAL-TIME TESTNET DEPLOYMENT - StandardBounties Proxy Pattern
================================================================
📊 DEPLOYMENT INFO:
Network: sepolia - Chain ID: 11155111
Deployer: 0x...
Balance: 1.234 ETH

🏗️ PHASE 1: Deploy Implementation Contract
==========================================
⛽ Estimated gas: 1072744
💰 Estimated cost: 0.002 ETH
✅ Implementation deployed at: 0x...
```

### Step 2: Deploy Factory Contract

The factory contract manages proxy deployments and requires the implementation address.

```bash
# Factory deployment is included in the main deploy script
# Implementation address is automatically passed to factory constructor
```

Expected output:
```
🏭 PHASE 2: Deploy Factory Contract
===================================
⛽ Estimated gas: 787570
💰 Estimated cost: 0.001 ETH
✅ Factory deployed at: 0x...
```

### Step 3: Deploy Proxy Contracts

Proxy contracts are deployed through the factory for optimal gas efficiency.

```bash
# Proxy deployment is demonstrated in the deploy script
# Each proxy costs ~406k gas
```

Expected output:
```
🎯 PHASE 3: Deploy Proxy Contracts (<500k gas target)
====================================================
⛽ Proxy deployment gas used: 406161
✅ Proxy deployed at: 0x...
🎯 Under 500k gas: ✅ YES
```

## Network-Specific Deployment

### Ethereum Mainnet

```bash
# Mainnet deployment with higher gas prices
npx hardhat run scripts/deploy.js --network mainnet
```

**Considerations**:
- High gas costs (~$5-10 for complete deployment)
- Slower confirmation times (1-2 minutes)
- Consider deploying during low network congestion

### Polygon Mainnet

```bash
# Polygon deployment with lower costs
npx hardhat run scripts/deploy.js --network polygon
```

**Considerations**:
- Low gas costs (~$0.01 for complete deployment)
- Fast confirmation times (2-3 seconds)
- Suitable for development and testing

### Arbitrum One

```bash
# Arbitrum deployment
npx hardhat run scripts/deploy.js --network arbitrum
```

**Considerations**:
- Moderate gas costs (~$0.50 for complete deployment)
- Fast confirmation times (1-2 seconds)
- L2 benefits with Ethereum security

### Testnets

```bash
# Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Goerli testnet (if configured)
npx hardhat run scripts/deploy.js --network goerli
```

**Considerations**:
- Free testnet tokens from faucets
- Identical to mainnet functionality
- Required for testing before mainnet deployment

## Post-Deployment Verification

### 1. Contract Verification

```bash
# Verify implementation contract
npx hardhat verify --network sepolia IMPLEMENTATION_ADDRESS

# Verify factory contract  
npx hardhat verify --network sepolia FACTORY_ADDRESS IMPLEMENTATION_ADDRESS

# Verify proxy contract
npx hardhat verify --network sepolia PROXY_ADDRESS IMPLEMENTATION_ADDRESS
```

### 2. Functionality Testing

Run the comprehensive test to verify deployment:

```bash
# Test deployed contracts
IMPLEMENTATION_ADDRESS=0x... FACTORY_ADDRESS=0x... npx hardhat run scripts/test-deployment.js --network sepolia
```

### 3. Gas Usage Validation

Verify gas usage meets requirements:

```bash
# Check proxy deployment gas
npx hardhat run scripts/gas-validation.js --network sepolia
```

Expected validation output:
```
✅ Proxy deployment: 406,161 gas
✅ Under 500k limit: YES (18.8% margin)
✅ All tests passed
```

## Deployment Scripts

### Main Deployment Script

```javascript
// scripts/deploy.js
async function main() {
  // 1. Deploy Implementation
  const Implementation = await ethers.getContractFactory("StandardBountiesImplementation");
  const implementation = await Implementation.deploy();
  
  // 2. Deploy Factory
  const Factory = await ethers.getContractFactory("StandardBountiesFactory");
  const factory = await Factory.deploy(implementation.address);
  
  // 3. Deploy Proxy (demonstration)
  const proxy = await factory.deployProxyAuto(deployer.address);
  
  console.log("Implementation:", implementation.address);
  console.log("Factory:", factory.address);
  console.log("Proxy:", proxy.address);
}
```

### Verification Script

```javascript
// scripts/verify.js
async function verify() {
  await hre.run("verify:verify", {
    address: implementationAddress,
    constructorArguments: []
  });
  
  await hre.run("verify:verify", {
    address: factoryAddress,
    constructorArguments: [implementationAddress]
  });
}
```

## Troubleshooting

### Common Issues

#### 1. Out of Gas Error

```
Error: Transaction ran out of gas
```

**Solution**: Increase gas limit in network configuration:

```javascript
networks: {
  sepolia: {
    gas: 8000000,  // Increase from default
    gasPrice: 20000000000
  }
}
```

#### 2. Nonce Too Low

```
Error: nonce too low
```

**Solution**: Reset account nonce or wait for pending transactions.

#### 3. Insufficient Funds

```
Error: insufficient funds for gas * price + value
```

**Solution**: Add more funds to deployer account or reduce gas price.

#### 4. Network Connection Issues

```
Error: could not detect network
```

**Solution**: Verify RPC endpoint and network configuration.

### Gas Optimization Issues

If proxy deployment exceeds 500k gas:

1. **Check Compiler Settings**:
   ```javascript
   solidity: {
     settings: {
       optimizer: {
         enabled: true,
         runs: 1000
       }
     }
   }
   ```

2. **Verify Contract Size**:
   ```bash
   npx hardhat size-contracts
   ```

3. **Test Gas Usage**:
   ```bash
   npx hardhat test --grep "gas"
   ```

## Production Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code audited and reviewed
- [ ] Gas costs estimated and approved
- [ ] Network configuration verified
- [ ] Deployer account funded
- [ ] Backup of private keys secured

### Deployment

- [ ] Implementation contract deployed successfully
- [ ] Factory contract deployed successfully
- [ ] Proxy deployment tested and verified
- [ ] Gas usage under 500k confirmed
- [ ] All contracts verified on block explorer

### Post-Deployment

- [ ] Functionality tests executed successfully
- [ ] Contract addresses documented
- [ ] Monitoring systems configured
- [ ] Access controls verified
- [ ] Emergency procedures documented

## Monitoring and Maintenance

### Event Monitoring

Set up event listeners for production monitoring:

```javascript
// Monitor proxy deployments
factory.on("ProxyDeployed", (proxy, owner, salt) => {
  console.log(`New proxy deployed: ${proxy} for ${owner}`);
});

// Monitor bounty creation
implementation.on("BountyInitialized", (bountyId, issuer, arbiter) => {
  console.log(`Bounty ${bountyId} created by ${issuer}`);
});
```

### Health Checks

Regular health checks for deployed contracts:

```javascript
// Verify contract state
const isActive = await implementation.paused();
const bountyCount = await implementation.bountyCount();
const owner = await implementation.owner();
```

### Upgrade Planning

For future upgrades:

1. Deploy new implementation contract
2. Deploy new factory pointing to new implementation  
3. Existing proxies continue using original implementation
4. New proxies use updated implementation

## Support and Resources

### Documentation

- [Technical Specification](TECHNICAL_SPECIFICATION.md)
- [Gas Usage Report](GAS_USAGE_REPORT.md)
- [Security Audit](SECURITY_AUDIT.md)

### Community

- GitHub Issues: Report bugs and request features
- Documentation: Comprehensive guides and examples
- Discord/Telegram: Community support channels

### Professional Services

For enterprise deployments:
- Custom network configurations
- Advanced monitoring setup
- Security audits and consultations
- Training and support packages

---

**Note**: Always test on testnets before mainnet deployment. Ensure you understand the gas costs and have sufficient funds before deploying to production networks.