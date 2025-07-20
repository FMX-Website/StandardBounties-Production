#!/bin/bash

# StandardBounties Docker Entrypoint Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Header
show_header() {
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                     StandardBounties                        ║
║                 Docker Deployment System                    ║
║                                                              ║
║     Production-Ready Smart Contract Deployment Suite        ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Load environment variables if they exist
load_env() {
    if [ -f "/app/config/.env" ]; then
        export $(grep -v '^#' /app/config/.env | xargs)
        echo -e "${GREEN}✅ Environment variables loaded${NC}"
    else
        echo -e "${YELLOW}⚠️ No environment file found${NC}"
    fi
}

# Check if environment is configured
check_env() {
    if [ -f "/app/config/.env" ]; then
        return 0
    else
        return 1
    fi
}

# Show available scripts
show_scripts() {
    echo -e "${BLUE}📋 Available Scripts:${NC}"
    echo
    echo -e "${CYAN}Deployment Scripts:${NC}"
    echo "  deploy-contracts    - Deploy StandardBounties contracts"
    echo "  test-deployment     - Test deployed contracts"
    echo "  post-deploy-test    - Comprehensive post-deployment testing"
    echo
    echo -e "${CYAN}Monitoring Scripts:${NC}"
    echo "  api-health-check    - Check API connectivity and health"
    echo "  gas-price-check     - Monitor current gas prices"
    echo "  event-monitor       - Real-time contract event monitoring"
    echo "  check-balance       - Check account balances"
    echo
    echo -e "${CYAN}Security Scripts:${NC}"
    echo "  verify-access-controls - Test access control mechanisms"
    echo "  verify-ownership       - Verify contract ownership"
    echo
    echo -e "${CYAN}Test Scripts:${NC}"
    echo "  run-tests          - Run complete test suite"
    echo "  stress-test        - Multi-threaded stress testing"
    echo
    echo -e "${CYAN}Utility Scripts:${NC}"
    echo "  compile            - Compile contracts"
    echo "  clean              - Clean build artifacts"
    echo
}

# Main menu
show_menu() {
    clear
    show_header
    
    if check_env; then
        echo -e "${GREEN}✅ Environment configured${NC}"
        current_network=$(grep "^NETWORK=" /app/config/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "unknown")
        echo -e "${BLUE}Current Network: ${current_network}${NC}"
    else
        echo -e "${YELLOW}⚠️ Environment not configured${NC}"
    fi
    
    echo
    echo -e "${BLUE}Main Menu:${NC}"
    echo
    echo "1)  🔧 Setup Environment (Configure API keys)"
    echo "2)  📋 List Available Scripts"
    echo "3)  🚀 Deploy Contracts"
    echo "4)  🧪 Run All Tests"
    echo "5)  📊 API Health Check"
    echo "6)  🔍 Event Monitor"
    echo "7)  ⛽ Gas Price Check"
    echo "8)  🔐 Security Verification"
    echo "9)  📈 Stress Test"
    echo "10) 🎯 Custom Script"
    echo "11) 🖥️  Interactive Shell"
    echo "12) ❌ Exit"
    echo
    echo -n "Select an option [1-12]: "
}

# Run specific script with environment
run_script() {
    local script_name=$1
    echo -e "${BLUE}🚀 Running: ${script_name}${NC}"
    echo
    
    # Load environment
    load_env
    
    case $script_name in
        "deploy-contracts")
            npx hardhat run scripts/deploy.js --network ${NETWORK:-sepolia}
            ;;
        "test-deployment")
            node scripts/test-deployment.js
            ;;
        "post-deploy-test")
            node scripts/post-deploy-test.js
            ;;
        "api-health-check")
            node scripts/api-health-check.js
            ;;
        "gas-price-check")
            node scripts/gas-price-check.js
            ;;
        "event-monitor")
            node scripts/event-monitor.js
            ;;
        "check-balance")
            node scripts/check-balance.js
            ;;
        "verify-access-controls")
            node scripts/verify-access-controls.js
            ;;
        "verify-ownership")
            node scripts/verify-ownership.js
            ;;
        "run-tests")
            npm test
            ;;
        "stress-test")
            node scripts/stress-test.js
            ;;
        "compile")
            npx hardhat compile
            ;;
        "clean")
            npx hardhat clean
            ;;
        *)
            echo -e "${RED}❌ Unknown script: ${script_name}${NC}"
            return 1
            ;;
    esac
}

# Interactive script runner
run_interactive() {
    while true; do
        show_menu
        read choice
        
        case $choice in
            1)
                echo -e "${YELLOW}🔧 Setting up environment...${NC}"
                /app/docker/setup-env.sh
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            2)
                clear
                show_header
                show_scripts
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            3)
                if ! check_env; then
                    echo -e "${RED}❌ Environment not configured. Please run setup first.${NC}"
                    echo -e "${GREEN}Press Enter to continue...${NC}"
                    read
                    continue
                fi
                echo -e "${YELLOW}🚀 Deploying contracts...${NC}"
                run_script "deploy-contracts"
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            4)
                if ! check_env; then
                    echo -e "${RED}❌ Environment not configured. Please run setup first.${NC}"
                    echo -e "${GREEN}Press Enter to continue...${NC}"
                    read
                    continue
                fi
                echo -e "${YELLOW}🧪 Running all tests...${NC}"
                run_script "compile"
                run_script "run-tests"
                run_script "deploy-contracts"
                run_script "test-deployment"
                run_script "post-deploy-test"
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            5)
                if ! check_env; then
                    echo -e "${RED}❌ Environment not configured. Please run setup first.${NC}"
                    echo -e "${GREEN}Press Enter to continue...${NC}"
                    read
                    continue
                fi
                run_script "api-health-check"
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            6)
                if ! check_env; then
                    echo -e "${RED}❌ Environment not configured. Please run setup first.${NC}"
                    echo -e "${GREEN}Press Enter to continue...${NC}"
                    read
                    continue
                fi
                echo -e "${YELLOW}🔍 Starting event monitor (Press Ctrl+C to stop)...${NC}"
                run_script "event-monitor"
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            7)
                if ! check_env; then
                    echo -e "${RED}❌ Environment not configured. Please run setup first.${NC}"
                    echo -e "${GREEN}Press Enter to continue...${NC}"
                    read
                    continue
                fi
                run_script "gas-price-check"
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            8)
                if ! check_env; then
                    echo -e "${RED}❌ Environment not configured. Please run setup first.${NC}"
                    echo -e "${GREEN}Press Enter to continue...${NC}"
                    read
                    continue
                fi
                echo -e "${YELLOW}🔐 Running security verification...${NC}"
                run_script "verify-access-controls"
                run_script "verify-ownership"
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            9)
                if ! check_env; then
                    echo -e "${RED}❌ Environment not configured. Please run setup first.${NC}"
                    echo -e "${GREEN}Press Enter to continue...${NC}"
                    read
                    continue
                fi
                run_script "stress-test"
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            10)
                if ! check_env; then
                    echo -e "${RED}❌ Environment not configured. Please run setup first.${NC}"
                    echo -e "${GREEN}Press Enter to continue...${NC}"
                    read
                    continue
                fi
                echo
                show_scripts
                echo
                echo -n "Enter script name: "
                read custom_script
                if [ ! -z "$custom_script" ]; then
                    run_script "$custom_script"
                fi
                echo
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
            11)
                echo -e "${BLUE}🖥️ Starting interactive shell...${NC}"
                echo -e "${YELLOW}Type 'exit' to return to menu${NC}"
                load_env
                /bin/bash
                ;;
            12)
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Invalid option${NC}"
                echo -e "${GREEN}Press Enter to continue...${NC}"
                read
                ;;
        esac
    done
}

# Handle command line arguments
case "${1:-menu}" in
    "menu")
        run_interactive
        ;;
    "setup")
        /app/docker/setup-env.sh
        ;;
    "test-setup")
        /app/docker/test-setup.sh
        ;;
    "start-node")
        echo -e "${BLUE}🚀 Starting Hardhat Node...${NC}"
        npx hardhat node --hostname 0.0.0.0
        ;;
    "api-health-check"|"gas-price-check"|"event-monitor"|"check-balance"|"verify-access-controls"|"verify-ownership"|"deploy-contracts"|"test-deployment"|"post-deploy-test"|"run-tests"|"stress-test"|"compile"|"clean")
        load_env
        run_script "$1"
        ;;
    "list-scripts")
        show_scripts
        ;;
    "shell")
        load_env
        /bin/bash
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo
        echo "Available commands:"
        echo "  menu                 - Interactive menu (default)"
        echo "  setup                - Environment setup"
        echo "  start-node           - Start Hardhat node"
        echo "  list-scripts         - List available scripts"
        echo "  shell                - Interactive shell"
        echo "  <script-name>        - Run specific script"
        echo
        show_scripts
        exit 1
        ;;
esac