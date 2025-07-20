# StandardBounties Docker Setup

Complete Docker environment for StandardBounties smart contract deployment and testing.

## Quick Start

### 1. Build and Setup
```bash
# Build the Docker image
docker-compose build

# Setup environment (API keys configuration)
docker-compose run --rm standardbounties setup

# Access interactive menu
docker-compose run --rm standardbounties menu
```

### 2. Environment Configuration

The setup script will prompt you for:

- **Network Selection**: sepolia, mainnet, polygon, localhost
- **Infura API Key**: For Ethereum RPC access
- **Etherscan API Key**: Contract verification and gas tracking
- **Alchemy API Key**: Enhanced RPC features
- **Forta Keys**: Security monitoring and threat detection
- **Wallet**: Private key or mnemonic phrase

### 3. Available Services

#### Main Application
```bash
# Interactive menu system
docker-compose run --rm standardbounties menu

# Direct script execution
docker-compose run --rm standardbounties deploy-contracts
docker-compose run --rm standardbounties api-health-check
```

#### Local Hardhat Node
```bash
# Start local blockchain
docker-compose --profile local up hardhat-node

# Deploy to local node
docker-compose run --rm -e NETWORK=localhost standardbounties deploy-contracts
```

#### Monitoring Services
```bash
# Start monitoring services
docker-compose --profile monitoring up -d

# View logs
docker-compose logs -f api-monitor
docker-compose logs -f event-monitor
```

## Available Scripts

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

## Usage Examples

### Complete Deployment Workflow
```bash
# 1. Setup environment
docker-compose run --rm standardbounties setup

# 2. Compile contracts
docker-compose run --rm standardbounties compile

# 3. Run tests
docker-compose run --rm standardbounties run-tests

# 4. Deploy contracts
docker-compose run --rm standardbounties deploy-contracts

# 5. Post-deployment testing
docker-compose run --rm standardbounties post-deploy-test

# 6. Security verification
docker-compose run --rm standardbounties verify-access-controls
docker-compose run --rm standardbounties verify-ownership
```

### Real-time Monitoring
```bash
# Check API health
docker-compose run --rm standardbounties api-health-check

# Monitor gas prices
docker-compose run --rm standardbounties gas-price-check

# Monitor contract events (runs continuously)
docker-compose run --rm standardbounties event-monitor
```

### Development Workflow
```bash
# Start local node in background
docker-compose --profile local up -d hardhat-node

# Deploy to local network
docker-compose run --rm -e NETWORK=localhost standardbounties deploy-contracts

# Run stress tests
docker-compose run --rm -e NETWORK=localhost standardbounties stress-test

# Interactive shell for development
docker-compose run --rm standardbounties shell
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NETWORK` | Target network (sepolia, mainnet, polygon, localhost) | Yes |
| `INFURA_API_KEY` | Infura API key for RPC access | Yes |
| `ETHERSCAN_API_KEY` | Etherscan API key for verification | Yes |
| `ALCHEMY_API_KEY` | Alchemy API key for enhanced features | Yes |
| `FORTA_KEY_ID` | Forta key ID for security monitoring | Yes |
| `FORTA_API_KEY` | Forta API key for threat detection | Yes |
| `PRIVATE_KEY` | Private key for deployment (alternative to mnemonic) | Yes* |
| `MNEMONIC` | Mnemonic phrase for deployment (alternative to private key) | Yes* |
| `MONITOR_DURATION` | Event monitoring duration in ms (default: 3600000) | No |

*Either `PRIVATE_KEY` or `MNEMONIC` is required

## Docker Services

### standardbounties
Main application container with interactive menu and all scripts.

### hardhat-node (profile: local)
Local Ethereum blockchain for development and testing.

### api-monitor (profile: monitoring)
Continuous API health monitoring service.

### event-monitor (profile: monitoring)
Real-time contract event monitoring service.

## Volumes

- `./deployments` - Contract deployment information
- `./logs` - Application and monitoring logs
- `./config` - Environment configuration files
- `bounty_data` - Docker managed volume for application data

## Security Notes

- Environment files are created with restricted permissions (600)
- Private keys and sensitive data are handled securely
- All API keys are validated during setup
- Non-root user is used in containers for security

## Troubleshooting

### Environment Issues
```bash
# Re-run setup if configuration is incorrect
docker-compose run --rm standardbounties setup

# Check current configuration
docker-compose run --rm standardbounties shell
cat /app/config/.env
```

### Network Issues
```bash
# Test API connectivity
docker-compose run --rm standardbounties api-health-check

# Check gas prices
docker-compose run --rm standardbounties gas-price-check
```

### Deployment Issues
```bash
# Clean and rebuild
docker-compose run --rm standardbounties clean
docker-compose run --rm standardbounties compile

# Check account balance
docker-compose run --rm standardbounties check-balance
```

### Container Issues
```bash
# Rebuild containers
docker-compose build --no-cache

# View container logs
docker-compose logs standardbounties

# Clean up everything
docker-compose down -v
docker system prune -f
```

## Support

For issues and support:
1. Check the troubleshooting section above
2. Review container logs: `docker-compose logs`
3. Use interactive shell: `docker-compose run --rm standardbounties shell`
4. Refer to the main project documentation