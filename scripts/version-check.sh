#!/bin/bash

# StandardBounties Version Compatibility Checker
# Validates specific version requirements for all dependencies

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Version requirements
REQUIRED_VERSIONS=(
    "docker:20.10.0"
    "docker-compose:1.28.0"
    "git:2.20.0"
    "curl:7.50.0"
    "node:18.0.0"
    "npm:8.0.0"
)

# Optional dependencies
OPTIONAL_VERSIONS=(
    "jq:1.6"
    "make:4.0"
    "python3:3.8.0"
)

# Container versions (what we expect inside Docker)
CONTAINER_VERSIONS=(
    "node:20.19.4"
    "npm:10.8.2"
    "hardhat:2.19.0"
    "solidity:0.8.20"
)

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${PURPLE}🔍 $1${NC}"; }

# Version comparison function
version_compare() {
    local version1=$1
    local operator=$2
    local version2=$3
    
    # Remove any non-numeric prefixes (like 'v')
    version1=$(echo "$version1" | sed 's/^[^0-9]*//')
    version2=$(echo "$version2" | sed 's/^[^0-9]*//')
    
    # Use sort -V for version comparison
    case $operator in
        ">=")
            [ "$(printf '%s\n' "$version2" "$version1" | sort -V | head -n1)" = "$version2" ]
            ;;
        ">")
            [ "$(printf '%s\n' "$version2" "$version1" | sort -V | head -n1)" = "$version2" ] && [ "$version1" != "$version2" ]
            ;;
        "<=")
            [ "$(printf '%s\n' "$version1" "$version2" | sort -V | head -n1)" = "$version1" ]
            ;;
        "<")
            [ "$(printf '%s\n' "$version1" "$version2" | sort -V | head -n1)" = "$version1" ] && [ "$version1" != "$version2" ]
            ;;
        "="|"==")
            [ "$version1" = "$version2" ]
            ;;
        *)
            return 1
            ;;
    esac
}

# Get version of a command
get_command_version() {
    local command=$1
    local version=""
    
    case $command in
        docker)
            if command -v docker >/dev/null 2>&1; then
                version=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            fi
            ;;
        docker-compose)
            # Check for docker compose plugin first
            if docker compose version >/dev/null 2>&1; then
                version=$(docker compose version --short 2>/dev/null || docker compose version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            elif command -v docker-compose >/dev/null 2>&1; then
                version=$(docker-compose --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            fi
            ;;
        git)
            if command -v git >/dev/null 2>&1; then
                version=$(git --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            fi
            ;;
        curl)
            if command -v curl >/dev/null 2>&1; then
                version=$(curl --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            fi
            ;;
        node)
            if command -v node >/dev/null 2>&1; then
                version=$(node --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            fi
            ;;
        npm)
            if command -v npm >/dev/null 2>&1; then
                version=$(npm --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            fi
            ;;
        jq)
            if command -v jq >/dev/null 2>&1; then
                version=$(jq --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            fi
            ;;
        make)
            if command -v make >/dev/null 2>&1; then
                version=$(make --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            fi
            ;;
        python3)
            if command -v python3 >/dev/null 2>&1; then
                version=$(python3 --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            fi
            ;;
        hardhat)
            if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
                version=$(npm list hardhat 2>/dev/null | grep hardhat | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            fi
            ;;
        solidity)
            # This would be checked inside the Docker container
            version="0.8.20"  # Our target version
            ;;
    esac
    
    echo "$version"
}

# Check Docker container versions
check_container_versions() {
    log_step "Checking Docker container versions..."
    
    # Check if Docker is available
    if ! command -v docker >/dev/null 2>&1; then
        log_warning "Docker not available, skipping container version checks"
        return
    fi
    
    # Check if our image exists
    if ! docker images | grep -q "standardbounties"; then
        log_warning "StandardBounties Docker image not found, attempting to check base image..."
        
        # Try to get Node.js version from base image
        if docker run --rm node:20-alpine node --version >/dev/null 2>&1; then
            local node_version=$(docker run --rm node:20-alpine node --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
            if version_compare "$node_version" ">=" "20.0.0"; then
                log_success "Base Node.js image version: $node_version"
            else
                log_error "Base Node.js image version too old: $node_version"
            fi
        fi
        return
    fi
    
    # Check Node.js version in our container
    local container_node_version
    if container_node_version=$(docker run --rm standardbounties node --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'); then
        if version_compare "$container_node_version" ">=" "20.0.0"; then
            log_success "Container Node.js version: $container_node_version"
        else
            log_error "Container Node.js version too old: $container_node_version"
        fi
    fi
    
    # Check NPM version in our container
    local container_npm_version
    if container_npm_version=$(docker run --rm standardbounties npm --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'); then
        if version_compare "$container_npm_version" ">=" "10.0.0"; then
            log_success "Container NPM version: $container_npm_version"
        else
            log_warning "Container NPM version: $container_npm_version (may work)"
        fi
    fi
}

# Check host system versions
check_host_versions() {
    log_step "Checking host system versions..."
    
    local errors=0
    local warnings=0
    
    # Check required dependencies
    for requirement in "${REQUIRED_VERSIONS[@]}"; do
        IFS=':' read -r command min_version <<< "$requirement"
        local current_version=$(get_command_version "$command")
        
        if [ -z "$current_version" ]; then
            log_error "$command is not installed"
            ((errors++))
        elif version_compare "$current_version" ">=" "$min_version"; then
            log_success "$command version $current_version (>= $min_version required)"
        else
            log_error "$command version $current_version is too old (>= $min_version required)"
            ((errors++))
        fi
    done
    
    # Check optional dependencies
    for requirement in "${OPTIONAL_VERSIONS[@]}"; do
        IFS=':' read -r command min_version <<< "$requirement"
        local current_version=$(get_command_version "$command")
        
        if [ -z "$current_version" ]; then
            log_warning "$command is not installed (optional)"
            ((warnings++))
        elif version_compare "$current_version" ">=" "$min_version"; then
            log_success "$command version $current_version (optional)"
        else
            log_warning "$command version $current_version is old (>= $min_version recommended)"
            ((warnings++))
        fi
    done
    
    return $errors
}

# Check package versions in package.json
check_package_versions() {
    log_step "Checking package.json dependencies..."
    
    if [ ! -f "package.json" ]; then
        log_warning "package.json not found, skipping package version checks"
        return
    fi
    
    # Check if jq is available for JSON parsing
    if ! command -v jq >/dev/null 2>&1; then
        log_warning "jq not available, cannot parse package.json"
        return
    fi
    
    # Key dependencies to check
    local key_packages=(
        "hardhat"
        "@openzeppelin/contracts"
        "@nomicfoundation/hardhat-ethers"
        "ethers"
        "chai"
        "mocha"
    )
    
    for package in "${key_packages[@]}"; do
        local version=$(jq -r ".dependencies.\"$package\" // .devDependencies.\"$package\" // \"null\"" package.json 2>/dev/null)
        
        if [ "$version" = "null" ]; then
            log_warning "Package $package not found in package.json"
        else
            # Remove version operators (^, ~, etc.)
            local clean_version=$(echo "$version" | sed 's/^[^0-9]*//')
            log_success "Package $package version: $version"
        fi
    done
}

# Check Node.js and NPM compatibility
check_nodejs_compatibility() {
    log_step "Checking Node.js ecosystem compatibility..."
    
    local node_version=$(get_command_version "node")
    local npm_version=$(get_command_version "npm")
    
    if [ -n "$node_version" ]; then
        # Check Node.js LTS compatibility
        local major_version=$(echo "$node_version" | cut -d. -f1)
        
        case $major_version in
            18|20|21)
                log_success "Node.js $node_version is an LTS or current version"
                ;;
            16)
                log_warning "Node.js $node_version is end-of-life (upgrade recommended)"
                ;;
            *)
                if [ "$major_version" -lt 18 ]; then
                    log_error "Node.js $node_version is too old (18+ required)"
                else
                    log_success "Node.js $node_version is a current version"
                fi
                ;;
        esac
        
        # Check for known compatibility issues
        if version_compare "$node_version" ">=" "21.0.0"; then
            log_warning "Node.js $node_version may have compatibility issues with some packages"
        fi
        
    fi
    
    # Check NPM compatibility with Node.js
    if [ -n "$node_version" ] && [ -n "$npm_version" ]; then
        # NPM 10.x works with Node.js 18+
        local npm_major=$(echo "$npm_version" | cut -d. -f1)
        local node_major=$(echo "$node_version" | cut -d. -f1)
        
        if [ "$node_major" -ge 18 ] && [ "$npm_major" -ge 9 ]; then
            log_success "Node.js $node_version and NPM $npm_version are compatible"
        else
            log_warning "Node.js $node_version and NPM $npm_version compatibility needs verification"
        fi
    fi
}

# Check Docker versions specifically
check_docker_versions() {
    log_step "Checking Docker ecosystem versions..."
    
    local docker_version=$(get_command_version "docker")
    local compose_version=$(get_command_version "docker-compose")
    
    if [ -n "$docker_version" ]; then
        local major_version=$(echo "$docker_version" | cut -d. -f1)
        local minor_version=$(echo "$docker_version" | cut -d. -f2)
        
        # Check for Docker API compatibility
        if version_compare "$docker_version" ">=" "24.0.0"; then
            log_success "Docker $docker_version supports latest features"
        elif version_compare "$docker_version" ">=" "20.10.0"; then
            log_success "Docker $docker_version is compatible"
        else
            log_error "Docker $docker_version is too old for optimal performance"
        fi
        
        # Check for known issues
        if [ "$docker_version" = "20.10.8" ]; then
            log_warning "Docker 20.10.8 has known networking issues (upgrade recommended)"
        fi
    fi
    
    # Check Docker Compose plugin vs standalone
    if docker compose version >/dev/null 2>&1; then
        local plugin_version=$(docker compose version --short 2>/dev/null || docker compose version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        log_success "Docker Compose plugin version: $plugin_version"
        
        if version_compare "$plugin_version" ">=" "2.20.0"; then
            log_success "Docker Compose plugin supports latest features"
        fi
    elif [ -n "$compose_version" ]; then
        log_warning "Using standalone docker-compose $compose_version (plugin recommended)"
    fi
}

# Generate version compatibility report
generate_version_report() {
    echo
    log_step "Generating version compatibility report..."
    
    local report_file="version-compatibility-report.txt"
    
    {
        echo "StandardBounties Version Compatibility Report"
        echo "============================================="
        echo "Generated: $(date)"
        echo "Host System: $(uname -a)"
        echo
        echo "Required Dependencies:"
        echo "====================="
        
        for requirement in "${REQUIRED_VERSIONS[@]}"; do
            IFS=':' read -r command min_version <<< "$requirement"
            local current_version=$(get_command_version "$command")
            
            if [ -n "$current_version" ]; then
                if version_compare "$current_version" ">=" "$min_version"; then
                    echo "✅ $command: $current_version (>= $min_version)"
                else
                    echo "❌ $command: $current_version (< $min_version)"
                fi
            else
                echo "❌ $command: Not installed"
            fi
        done
        
        echo
        echo "Optional Dependencies:"
        echo "====================="
        
        for requirement in "${OPTIONAL_VERSIONS[@]}"; do
            IFS=':' read -r command min_version <<< "$requirement"
            local current_version=$(get_command_version "$command")
            
            if [ -n "$current_version" ]; then
                if version_compare "$current_version" ">=" "$min_version"; then
                    echo "✅ $command: $current_version (optional)"
                else
                    echo "⚠️  $command: $current_version (old version)"
                fi
            else
                echo "⚠️  $command: Not installed (optional)"
            fi
        done
        
        echo
        echo "Container Environment:"
        echo "====================="
        echo "Base Image: node:20-alpine"
        echo "Target Node.js: 20.19.4+"
        echo "Target NPM: 10.8.2+"
        echo "Target Solidity: 0.8.20"
        echo "Target Hardhat: 2.19.0+"
        
    } > "$report_file"
    
    log_success "Version compatibility report saved to: $report_file"
}

# Show version recommendations
show_version_recommendations() {
    echo
    log_step "Version Recommendations"
    echo
    echo -e "${BLUE}🎯 Recommended Versions:${NC}"
    echo "• Docker: 24.0.0+ (latest stable)"
    echo "• Docker Compose: 2.20.0+ (plugin version)"
    echo "• Git: 2.40.0+ (latest features)"
    echo "• Node.js: 20.x LTS (for host development)"
    echo "• NPM: 10.x (bundled with Node.js 20)"
    echo
    echo -e "${BLUE}🔧 Container Versions:${NC}"
    echo "• Node.js: 20.19.4 (Alpine Linux)"
    echo "• NPM: 10.8.2 (latest)"
    echo "• Solidity: 0.8.20 (contract target)"
    echo "• Hardhat: 2.19.0+ (development framework)"
    echo
    echo -e "${BLUE}💡 Upgrade Commands:${NC}"
    echo
    echo "Docker (Ubuntu/Debian):"
    echo "  sudo apt-get update && sudo apt-get upgrade docker-ce"
    echo
    echo "Docker Compose Plugin:"
    echo "  # Installed automatically with Docker 24.0+"
    echo
    echo "Node.js (via Node Version Manager):"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  nvm install 20 && nvm use 20"
    echo
    echo "Git (Ubuntu/Debian):"
    echo "  sudo add-apt-repository ppa:git-core/ppa && sudo apt-get update && sudo apt-get upgrade git"
}

# Main function
main() {
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║            StandardBounties Version Checker                 ║
║         Dependency Version Compatibility Validation         ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo
    
    local total_errors=0
    
    # Run all version checks
    check_host_versions
    total_errors=$?
    
    check_nodejs_compatibility
    check_docker_versions
    check_package_versions
    check_container_versions
    
    # Generate report
    generate_version_report
    
    # Show recommendations
    show_version_recommendations
    
    # Final summary
    echo
    if [ $total_errors -eq 0 ]; then
        log_success "All version requirements met - system ready for deployment!"
    else
        log_error "$total_errors version requirements not met - please upgrade before deployment"
    fi
    
    return $total_errors
}

# Run main function
main "$@"