#!/bin/bash

# StandardBounties Environment Setup Script
# This script prompts for API keys and creates the .env file

set -e

echo "==============================================="
echo "StandardBounties Docker Environment Setup"
echo "==============================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to prompt for input with validation
prompt_for_input() {
    local var_name=$1
    local description=$2
    local is_required=$3
    local is_private=$4
    local current_value=""
    
    if [ -f "/app/config/.env" ]; then
        current_value=$(grep "^${var_name}=" /app/config/.env 2>/dev/null | cut -d'=' -f2- | tr -d '"' || echo "")
    fi
    
    echo -e "${BLUE}${description}${NC}"
    if [ ! -z "$current_value" ]; then
        if [ "$is_private" = "true" ]; then
            echo -e "${YELLOW}Current: [HIDDEN]${NC}"
        else
            echo -e "${YELLOW}Current: ${current_value}${NC}"
        fi
    fi
    
    if [ "$is_private" = "true" ]; then
        echo -n "Enter value (input hidden): "
        read -s value
        echo
    else
        echo -n "Enter value: "
        read value
    fi
    
    if [ -z "$value" ] && [ ! -z "$current_value" ]; then
        value="$current_value"
        echo -e "${GREEN}Using existing value${NC}"
    elif [ -z "$value" ] && [ "$is_required" = "true" ]; then
        echo -e "${RED}This field is required!${NC}"
        prompt_for_input "$var_name" "$description" "$is_required" "$is_private"
        return
    fi
    
    eval "${var_name}='${value}'"
}

echo -e "${GREEN}Setting up your StandardBounties environment...${NC}"
echo "You will be prompted for API keys and configuration."
echo "Press Enter to keep existing values, or input new ones."
echo

# Create config directory if it doesn't exist
mkdir -p /app/config

# Network Selection
echo -e "${BLUE}Network Configuration${NC}"
echo "Available networks:"
echo "1) sepolia (Ethereum Sepolia Testnet) - Recommended for testing"
echo "2) mainnet (Ethereum Mainnet) - Production only"
echo "3) polygon (Polygon Mainnet)"
echo "4) localhost (Local Hardhat Network)"
echo

current_network=""
if [ -f "/app/config/.env" ]; then
    current_network=$(grep "^NETWORK=" /app/config/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "sepolia")
fi

echo -n "Select network [1-4] (current: ${current_network:-sepolia}): "
read network_choice

case $network_choice in
    1|"") NETWORK="sepolia" ;;
    2) NETWORK="mainnet" ;;
    3) NETWORK="polygon" ;;
    4) NETWORK="localhost" ;;
    *) echo -e "${YELLOW}Invalid choice, using sepolia${NC}"; NETWORK="sepolia" ;;
esac

echo

# API Keys Configuration
echo -e "${BLUE}API Keys Configuration${NC}"
echo "These APIs are used for real-time monitoring and deployment"
echo

prompt_for_input "INFURA_API_KEY" "Infura API Key (for Ethereum RPC access):" true false
prompt_for_input "ETHERSCAN_API_KEY" "Etherscan API Key (for contract verification and gas tracking):" true false
prompt_for_input "ALCHEMY_API_KEY" "Alchemy API Key (for enhanced RPC features):" true false
prompt_for_input "FORTA_KEY_ID" "Forta Key ID (for security monitoring):" true false
prompt_for_input "FORTA_API_KEY" "Forta API Key (for threat detection):" true true

echo

# Wallet Configuration
echo -e "${BLUE}Wallet Configuration${NC}"
echo "Choose your wallet method:"
echo "1) Private Key (direct private key)"
echo "2) Mnemonic (12/24 word seed phrase)"
echo

current_method=""
if [ -f "/app/config/.env" ]; then
    if grep -q "^PRIVATE_KEY=" /app/config/.env 2>/dev/null; then
        current_method="private_key"
    elif grep -q "^MNEMONIC=" /app/config/.env 2>/dev/null; then
        current_method="mnemonic"
    fi
fi

echo -n "Select wallet method [1-2] (current: ${current_method:-private_key}): "
read wallet_choice

case $wallet_choice in
    1|"") 
        prompt_for_input "PRIVATE_KEY" "Private Key (0x...):" true true
        MNEMONIC=""
        ;;
    2) 
        prompt_for_input "MNEMONIC" "Mnemonic Phrase (12 or 24 words):" true true
        PRIVATE_KEY=""
        ;;
    *) 
        echo -e "${YELLOW}Invalid choice, using private key method${NC}"
        prompt_for_input "PRIVATE_KEY" "Private Key (0x...):" true true
        MNEMONIC=""
        ;;
esac

echo

# Optional Configuration
echo -e "${BLUE}Optional Configuration${NC}"
prompt_for_input "MONITOR_DURATION" "Event monitoring duration in ms (default: 3600000 = 1 hour):" false false

if [ -z "$MONITOR_DURATION" ]; then
    MONITOR_DURATION="3600000"
fi

echo

# Write .env file
echo -e "${GREEN}Writing configuration to .env file...${NC}"

cat > /app/config/.env << EOF
# StandardBounties Environment Configuration
# Generated on: $(date)

# Network Configuration
NETWORK=${NETWORK}

# API Keys
INFURA_API_KEY=${INFURA_API_KEY}
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY}
ALCHEMY_API_KEY=${ALCHEMY_API_KEY}
FORTA_KEY_ID=${FORTA_KEY_ID}
FORTA_API_KEY=${FORTA_API_KEY}

# Wallet Configuration
EOF

if [ ! -z "$PRIVATE_KEY" ]; then
    echo "PRIVATE_KEY=${PRIVATE_KEY}" >> /app/config/.env
fi

if [ ! -z "$MNEMONIC" ]; then
    echo "MNEMONIC=${MNEMONIC}" >> /app/config/.env
fi

cat >> /app/config/.env << EOF

# Optional Configuration
MONITOR_DURATION=${MONITOR_DURATION}

# Docker Configuration
NODE_ENV=development
EOF

# Set proper permissions
chmod 600 /app/config/.env

echo -e "${GREEN}✅ Environment setup complete!${NC}"
echo
echo -e "${BLUE}Configuration saved to: /app/config/.env${NC}"
echo -e "${BLUE}Network: ${NETWORK}${NC}"
echo -e "${BLUE}APIs configured: Infura, Etherscan, Alchemy, Forta${NC}"
echo

# Validate configuration
echo -e "${YELLOW}Validating configuration...${NC}"

validation_errors=0

if [ -z "$INFURA_API_KEY" ]; then
    echo -e "${RED}❌ Infura API key is missing${NC}"
    validation_errors=$((validation_errors + 1))
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo -e "${RED}❌ Etherscan API key is missing${NC}"
    validation_errors=$((validation_errors + 1))
fi

if [ -z "$PRIVATE_KEY" ] && [ -z "$MNEMONIC" ]; then
    echo -e "${RED}❌ Either private key or mnemonic is required${NC}"
    validation_errors=$((validation_errors + 1))
fi

if [ $validation_errors -eq 0 ]; then
    echo -e "${GREEN}✅ Configuration validation passed${NC}"
    echo
    echo -e "${GREEN}Ready to deploy and test StandardBounties!${NC}"
    echo "Use 'docker-compose run standardbounties menu' to access the main menu"
else
    echo -e "${RED}❌ Configuration validation failed with ${validation_errors} errors${NC}"
    echo "Please run the setup again to fix these issues"
    exit 1
fi