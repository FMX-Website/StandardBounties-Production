#!/bin/bash

# Automated test setup script for Docker testing
# This creates a test environment with mock API keys

echo "Creating test environment configuration..."

sudo mkdir -p /app/config || mkdir -p /app/config

sudo cat > /app/config/.env << 'EOF' || cat > /app/config/.env << 'EOF'
# Test Environment Configuration
# Generated for Docker testing

# Network Configuration
NETWORK=sepolia

# API Keys (Test values)
INFURA_API_KEY=test_infura_key_for_docker
ETHERSCAN_API_KEY=test_etherscan_key_for_docker
ALCHEMY_API_KEY=test_alchemy_key_for_docker
FORTA_KEY_ID=test_forta_key_id
FORTA_API_KEY=test_forta_api_key

# Wallet Configuration (Test private key - DO NOT USE IN PRODUCTION)
PRIVATE_KEY=0x1111111111111111111111111111111111111111111111111111111111111111

# Optional Configuration
MONITOR_DURATION=10000

# Docker Configuration
NODE_ENV=development
EOF

chmod 600 /app/config/.env

echo "✅ Test environment configuration created"
echo "This is for testing purposes only - use real API keys for actual deployment"