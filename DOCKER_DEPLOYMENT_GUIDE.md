# StandardBounties Docker Deployment Guide

Complete guide for deploying and testing StandardBounties smart contracts using Docker.

## 🚀 Quick Start

### 1. Build and Setup Environment

```bash
# Clone or navigate to the project directory
cd StandardBounties-Final

# Build Docker image
docker-compose build

# Setup environment with API keys
docker-compose run --rm standardbounties setup
```

### 2. Interactive Menu System

```bash
# Access the interactive menu
docker-compose run --rm standardbounties menu
```

The menu provides access to all deployment and testing functionality:

```
StandardBounties Docker Deployment System
==========================================

Main Menu:
1)  🔧 Setup Environment (Configure API keys)
2)  📋 List Available Scripts  
3)  🚀 Deploy Contracts
4)  🧪 Run All Tests
5)  📊 API Health Check
6)  🔍 Event Monitor
7)  ⛽ Gas Price Check
8)  🔐 Security Verification
9)  📈 Stress Test
10) 🎯 Custom Script
11) 🖥️  Interactive Shell
12) ❌ Exit
```

## 📋 Available Scripts

### Deployment Scripts
- `deploy-contracts` - Deploy StandardBounties contracts
- `test-deployment` - Test deployed contracts  
- `post-deploy-test` - Comprehensive post-deployment testing

### Monitoring Scripts  
- `api-health-check` - Check API connectivity and health
- `gas-price-check` - Monitor current gas prices
- `event-monitor` - Real-time contract event monitoring
- `check-balance` - Check account balances

### Security Scripts
- `verify-access-controls` - Test access control mechanisms
- `verify-ownership` - Verify contract ownership

### Test Scripts
- `run-tests` - Run complete test suite
- `stress-test` - Multi-threaded stress testing

### Utility Scripts
- `compile` - Compile contracts
- `clean` - Clean build artifacts

## 🔧 Environment Configuration

### Required API Keys

The setup will prompt for these API keys:

1. **Infura API Key** - Ethereum RPC access
2. **Etherscan API Key** - Contract verification and gas tracking  
3. **Alchemy API Key** - Enhanced RPC features
4. **Forta Key ID** - Security monitoring
5. **Forta API Key** - Threat detection

### Network Selection

Choose from available networks:
- `sepolia` - Ethereum Sepolia Testnet (Recommended for testing)
- `mainnet` - Ethereum Mainnet (Production only)
- `polygon` - Polygon Mainnet
- `localhost` - Local Hardhat Network

### Wallet Configuration

Two options:
1. **Private Key** - Direct private key (0x...)
2. **Mnemonic** - 12/24 word seed phrase

## 🚀 Deployment Workflow

### Complete Production Deployment

```bash
# 1. Setup environment
docker-compose run --rm standardbounties setup

# 2. Compile contracts
docker-compose run --rm standardbounties compile

# 3. Deploy contracts
docker-compose run --rm standardbounties deploy-contracts

# 4. Run post-deployment tests
docker-compose run --rm standardbounties post-deploy-test

# 5. Verify security
docker-compose run --rm standardbounties verify-access-controls
docker-compose run --rm standardbounties verify-ownership
```

### Individual Script Execution

```bash
# Run any script directly
docker-compose run --rm standardbounties <script-name>

# Examples:
docker-compose run --rm standardbounties api-health-check
docker-compose run --rm standardbounties gas-price-check
docker-compose run --rm standardbounties event-monitor
```

## 📊 Real-time Monitoring

### API Health Monitoring

```bash
# Check all API connections
docker-compose run --rm standardbounties api-health-check
```

Tests:
- ✅ Infura API connectivity
- ✅ Alchemy API connectivity  
- ✅ Etherscan API functionality
- ✅ Gas price tracking
- ✅ Forta security monitoring
- ✅ Provider synchronization
- ✅ Rate limiting assessment

### Event Monitoring

```bash
# Monitor contract events in real-time
docker-compose run --rm standardbounties event-monitor
```

Monitors:
- 🎯 BountyInitialized events
- 💰 BountyFunded events
- 📝 FulfillmentSubmitted events
- ✅ FulfillmentAccepted events

### Gas Price Monitoring

```bash
# Check current gas prices
docker-compose run --rm standardbounties gas-price-check
```

## 🔐 Security Verification

### Access Control Testing

```bash
# Test all access controls
docker-compose run --rm standardbounties verify-access-controls
```

Verifies:
- ✅ Owner-only functions protected
- ✅ Issuer-only functions protected
- ✅ Platform fee limits enforced
- ✅ Pausability working correctly
- ✅ Input validation active
- ✅ Address validation enforced

### Ownership Verification

```bash
# Verify contract ownership
docker-compose run --rm standardbounties verify-ownership
```

Tests:
- ✅ Factory deployment permissions
- ✅ Proxy ownership initialization
- ✅ Owner-only function access
- ✅ Ownership transfer capability
- ✅ Multi-signature compatibility
- ✅ Emergency function access

## 🧪 Testing Suite

### Comprehensive Testing

```bash
# Run complete test workflow
docker-compose run --rm standardbounties menu
# Select option 4: "Run All Tests"
```

This executes:
1. Contract compilation
2. Unit test suite
3. Contract deployment
4. Integration testing
5. Post-deployment validation

### Stress Testing

```bash
# Multi-threaded stress testing
docker-compose run --rm standardbounties stress-test
```

Features:
- 🔥 Concurrent bounty creation
- 🔥 Parallel funding operations
- 🔥 Multi-threaded fulfillments
- 🔥 Race condition testing
- 🔥 Load testing with 100+ operations

## 🌐 Network Deployment

### Local Development

```bash
# Start local Hardhat node
docker-compose --profile local up -d hardhat-node

# Deploy to local network
docker-compose run --rm -e NETWORK=localhost standardbounties deploy-contracts
```

### Testnet Deployment

```bash
# Setup with testnet configuration
docker-compose run --rm standardbounties setup
# Select "sepolia" network

# Deploy to testnet
docker-compose run --rm standardbounties deploy-contracts
```

### Mainnet Deployment

```bash
# Setup with mainnet configuration
docker-compose run --rm standardbounties setup  
# Select "mainnet" network

# Deploy to mainnet (use with caution)
docker-compose run --rm standardbounties deploy-contracts
```

## 🔄 Monitoring Services

### Background Monitoring

```bash
# Start monitoring services
docker-compose --profile monitoring up -d

# View monitoring logs
docker-compose logs -f api-monitor
docker-compose logs -f event-monitor
```

Services include:
- **api-monitor** - Continuous API health checking
- **event-monitor** - Real-time event monitoring

## 📁 Data Persistence

### Volume Mounts

- `./deployments` - Contract deployment information
- `./logs` - Application and monitoring logs
- `./config` - Environment configuration files

### Output Files

After deployment, you'll find:
- `deployments/<network>.json` - Deployment addresses and info
- `deployments/<network>-test-results.json` - Test results
- `deployments/<network>-ownership-report.json` - Ownership verification
- `deployments/<network>-access-control-report.json` - Security report
- `logs/events-<date>.json` - Event monitoring logs

## 🛡️ Security Best Practices

### Environment Security

- Environment files created with 600 permissions
- Private keys handled securely
- Non-root user in containers
- API key validation during setup

### Deployment Security

- Multi-signature compatibility verified
- Access controls thoroughly tested
- Ownership transfer capabilities validated
- Emergency pause mechanisms working

### Production Recommendations

- Transfer ownership to multi-signature wallet
- Use time-locked admin functions
- Implement emergency pause procedures  
- Set up monitoring for ownership changes
- Use hardware wallets for signing

## 🚨 Troubleshooting

### Environment Issues

```bash
# Re-configure environment
docker-compose run --rm standardbounties setup

# Check current configuration
docker-compose run --rm standardbounties shell
cat /app/config/.env
```

### Network Issues

```bash
# Test connectivity
docker-compose run --rm standardbounties api-health-check

# Check gas prices
docker-compose run --rm standardbounties gas-price-check
```

### Deployment Issues

```bash
# Clean and rebuild
docker-compose run --rm standardbounties clean
docker-compose run --rm standardbounties compile

# Check balances
docker-compose run --rm standardbounties check-balance
```

### Container Issues

```bash
# Rebuild containers
docker-compose build --no-cache

# Clean up
docker-compose down -v
docker system prune -f
```

## 🎯 Key Features

✅ **Gas Optimized** - Deployment under 500k gas using proxy pattern  
✅ **Production Ready** - Comprehensive testing and verification  
✅ **Real-time Monitoring** - API health, gas prices, events  
✅ **Security Verified** - Access controls and ownership testing  
✅ **Multi-network** - Supports all major networks  
✅ **Docker Integrated** - Complete containerized environment  
✅ **Interactive UI** - User-friendly menu system  
✅ **Automated Testing** - Stress testing with concurrent operations  

## 📞 Support

For issues:
1. Check troubleshooting section
2. Review container logs: `docker-compose logs`
3. Use interactive shell: `docker-compose run --rm standardbounties shell`
4. Refer to individual script documentation

---

**Ready to deploy production-grade StandardBounties contracts with Docker! 🚀**