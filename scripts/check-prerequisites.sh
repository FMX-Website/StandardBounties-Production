#!/bin/bash

# StandardBounties Prerequisites Checker and Installer
# Validates and installs all required dependencies for Docker deployment

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global variables
ERRORS=0
WARNINGS=0
AUTO_INSTALL=${AUTO_INSTALL:-false}
SYSTEM_OS=""
SYSTEM_ARCH=""
PACKAGE_MANAGER=""

# Show header
show_header() {
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║              StandardBounties Prerequisites                 ║
║           System Compatibility & Dependency Check           ║
║                                                              ║
║    Validating system requirements for Docker deployment     ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; ((WARNINGS++)); }
log_error() { echo -e "${RED}❌ $1${NC}"; ((ERRORS++)); }
log_step() { echo -e "${PURPLE}🔍 $1${NC}"; }

# Detect operating system and architecture
detect_system() {
    log_step "Detecting system information..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        SYSTEM_OS="linux"
        if command -v lsb_release >/dev/null 2>&1; then
            DISTRO=$(lsb_release -si)
            VERSION=$(lsb_release -sr)
            log_info "Linux Distribution: $DISTRO $VERSION"
        elif [ -f /etc/os-release ]; then
            . /etc/os-release
            DISTRO=$NAME
            VERSION=$VERSION_ID
            log_info "Linux Distribution: $DISTRO $VERSION"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        SYSTEM_OS="macos"
        VERSION=$(sw_vers -productVersion)
        log_info "macOS Version: $VERSION"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        SYSTEM_OS="windows"
        log_info "Windows System Detected"
    else
        log_error "Unsupported operating system: $OSTYPE"
        return 1
    fi
    
    # Detect architecture
    SYSTEM_ARCH=$(uname -m)
    case $SYSTEM_ARCH in
        x86_64|amd64) SYSTEM_ARCH="amd64" ;;
        arm64|aarch64) SYSTEM_ARCH="arm64" ;;
        armv7l) SYSTEM_ARCH="arm" ;;
        *) log_warning "Architecture $SYSTEM_ARCH may not be fully supported" ;;
    esac
    
    log_success "System: $SYSTEM_OS ($SYSTEM_ARCH)"
    
    # Detect package manager
    detect_package_manager
}

# Detect package manager
detect_package_manager() {
    if command -v apt-get >/dev/null 2>&1; then
        PACKAGE_MANAGER="apt"
    elif command -v yum >/dev/null 2>&1; then
        PACKAGE_MANAGER="yum"
    elif command -v dnf >/dev/null 2>&1; then
        PACKAGE_MANAGER="dnf"
    elif command -v pacman >/dev/null 2>&1; then
        PACKAGE_MANAGER="pacman"
    elif command -v brew >/dev/null 2>&1; then
        PACKAGE_MANAGER="brew"
    elif command -v zypper >/dev/null 2>&1; then
        PACKAGE_MANAGER="zypper"
    else
        log_warning "No supported package manager found"
        PACKAGE_MANAGER="manual"
    fi
    
    if [ "$PACKAGE_MANAGER" != "manual" ]; then
        log_success "Package Manager: $PACKAGE_MANAGER"
    fi
}

# Check if user has sudo privileges
check_sudo() {
    log_step "Checking administrative privileges..."
    
    if [[ $EUID -eq 0 ]]; then
        log_success "Running as root"
        return 0
    fi
    
    if sudo -n true 2>/dev/null; then
        log_success "Sudo access available"
        return 0
    fi
    
    if sudo -v 2>/dev/null; then
        log_success "Sudo access granted"
        return 0
    fi
    
    log_warning "No sudo privileges detected - some installations may require manual intervention"
    return 1
}

# Check system requirements
check_system_requirements() {
    log_step "Checking system requirements..."
    
    # Check available disk space (minimum 5GB)
    if command -v df >/dev/null 2>&1; then
        AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
        AVAILABLE_GB=$((AVAILABLE_SPACE / 1024 / 1024))
        
        if [ $AVAILABLE_GB -lt 5 ]; then
            log_error "Insufficient disk space: ${AVAILABLE_GB}GB available, 5GB minimum required"
        else
            log_success "Disk space: ${AVAILABLE_GB}GB available"
        fi
    fi
    
    # Check available memory (minimum 2GB)
    if command -v free >/dev/null 2>&1; then
        AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7/1024}')
        if [ $AVAILABLE_MEM -lt 2 ]; then
            log_warning "Low memory: ${AVAILABLE_MEM}GB available, 2GB recommended"
        else
            log_success "Memory: ${AVAILABLE_MEM}GB available"
        fi
    elif [[ "$SYSTEM_OS" == "macos" ]]; then
        TOTAL_MEM=$(sysctl -n hw.memsize)
        TOTAL_GB=$((TOTAL_MEM / 1024 / 1024 / 1024))
        if [ $TOTAL_GB -lt 4 ]; then
            log_warning "Low memory: ${TOTAL_GB}GB total, 4GB recommended"
        else
            log_success "Memory: ${TOTAL_GB}GB total"
        fi
    fi
    
    # Check internet connectivity
    if ping -c 1 google.com >/dev/null 2>&1 || ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        log_success "Internet connectivity verified"
    else
        log_error "No internet connection detected - required for downloading dependencies"
    fi
}

# Version comparison function
version_ge() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Check Docker installation
check_docker() {
    log_step "Checking Docker installation..."
    
    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        
        if version_ge "$DOCKER_VERSION" "20.10.0"; then
            log_success "Docker version $DOCKER_VERSION (compatible)"
            
            # Check if Docker daemon is running
            if docker info >/dev/null 2>&1; then
                log_success "Docker daemon is running"
            else
                log_warning "Docker daemon is not running - will need to start it"
            fi
            
            # Check Docker permissions
            if docker ps >/dev/null 2>&1; then
                log_success "Docker permissions configured correctly"
            else
                log_warning "Docker requires sudo - consider adding user to docker group"
            fi
            
        else
            log_error "Docker version $DOCKER_VERSION is too old (minimum: 20.10.0)"
            offer_docker_install
        fi
    else
        log_error "Docker is not installed"
        offer_docker_install
    fi
}

# Check Docker Compose installation
check_docker_compose() {
    log_step "Checking Docker Compose installation..."
    
    # Check for docker compose (newer plugin version)
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || docker compose version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        
        if version_ge "$COMPOSE_VERSION" "2.0.0"; then
            log_success "Docker Compose version $COMPOSE_VERSION (plugin)"
        else
            log_warning "Docker Compose version $COMPOSE_VERSION may be incompatible"
        fi
        
    # Check for legacy docker-compose
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_VERSION=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        
        if version_ge "$COMPOSE_VERSION" "1.28.0"; then
            log_success "Docker Compose version $COMPOSE_VERSION (legacy)"
        else
            log_error "Docker Compose version $COMPOSE_VERSION is too old (minimum: 1.28.0)"
            offer_docker_compose_install
        fi
    else
        log_error "Docker Compose is not installed"
        offer_docker_compose_install
    fi
}

# Check Git installation
check_git() {
    log_step "Checking Git installation..."
    
    if command -v git >/dev/null 2>&1; then
        GIT_VERSION=$(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        
        if version_ge "$GIT_VERSION" "2.20.0"; then
            log_success "Git version $GIT_VERSION (compatible)"
        else
            log_warning "Git version $GIT_VERSION is old (recommended: 2.20.0+)"
        fi
    else
        log_error "Git is not installed"
        offer_git_install
    fi
}

# Check curl installation
check_curl() {
    log_step "Checking curl installation..."
    
    if command -v curl >/dev/null 2>&1; then
        CURL_VERSION=$(curl --version | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        log_success "curl version $CURL_VERSION"
    else
        log_error "curl is not installed"
        offer_curl_install
    fi
}

# Check jq installation (for JSON processing)
check_jq() {
    log_step "Checking jq installation..."
    
    if command -v jq >/dev/null 2>&1; then
        JQ_VERSION=$(jq --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
        log_success "jq version $JQ_VERSION"
    else
        log_warning "jq is not installed (recommended for JSON processing)"
        offer_jq_install
    fi
}

# Check make installation
check_make() {
    log_step "Checking make installation..."
    
    if command -v make >/dev/null 2>&1; then
        MAKE_VERSION=$(make --version | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
        log_success "make version $MAKE_VERSION"
    else
        log_warning "make is not installed (may be needed for some builds)"
        offer_make_install
    fi
}

# Offer Docker installation
offer_docker_install() {
    echo
    log_info "Docker installation options:"
    echo "1. Auto-install Docker (recommended)"
    echo "2. Manual installation instructions"
    echo "3. Skip (continue anyway)"
    
    if [ "$AUTO_INSTALL" = "true" ]; then
        install_docker
        return
    fi
    
    read -p "Choose option [1-3]: " choice
    case $choice in
        1) install_docker ;;
        2) show_docker_manual_install ;;
        3) log_warning "Skipping Docker installation" ;;
        *) log_error "Invalid choice" ;;
    esac
}

# Install Docker
install_docker() {
    log_step "Installing Docker..."
    
    case $SYSTEM_OS in
        linux)
            case $PACKAGE_MANAGER in
                apt)
                    sudo apt-get update
                    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
                    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
                    echo "deb [arch=$SYSTEM_ARCH signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
                    sudo apt-get update
                    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
                    ;;
                yum|dnf)
                    sudo $PACKAGE_MANAGER install -y yum-utils
                    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                    sudo $PACKAGE_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
                    ;;
                pacman)
                    sudo pacman -S --noconfirm docker docker-compose
                    ;;
                *)
                    show_docker_manual_install
                    return
                    ;;
            esac
            
            # Start and enable Docker service
            sudo systemctl start docker
            sudo systemctl enable docker
            
            # Add user to docker group
            sudo usermod -aG docker $USER
            log_success "Docker installed successfully"
            log_warning "Please log out and back in for Docker group membership to take effect"
            ;;
            
        macos)
            if command -v brew >/dev/null 2>&1; then
                brew install --cask docker
                log_success "Docker installed via Homebrew"
                log_info "Please start Docker Desktop from Applications"
            else
                show_docker_manual_install
            fi
            ;;
            
        windows)
            log_info "Please download Docker Desktop from: https://docs.docker.com/desktop/windows/install/"
            ;;
            
        *)
            show_docker_manual_install
            ;;
    esac
}

# Show manual Docker installation instructions
show_docker_manual_install() {
    echo
    log_info "Manual Docker installation instructions:"
    echo
    case $SYSTEM_OS in
        linux)
            echo "For Ubuntu/Debian:"
            echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
            echo "  sudo sh get-docker.sh"
            echo "  sudo usermod -aG docker \$USER"
            echo
            echo "For CentOS/RHEL/Fedora:"
            echo "  sudo dnf install docker-ce docker-ce-cli containerd.io"
            echo "  sudo systemctl start docker"
            echo "  sudo systemctl enable docker"
            ;;
        macos)
            echo "Download Docker Desktop from:"
            echo "  https://docs.docker.com/desktop/mac/install/"
            ;;
        windows)
            echo "Download Docker Desktop from:"
            echo "  https://docs.docker.com/desktop/windows/install/"
            ;;
    esac
    echo
}

# Offer Docker Compose installation
offer_docker_compose_install() {
    echo
    log_info "Docker Compose installation options:"
    echo "1. Auto-install Docker Compose"
    echo "2. Manual installation instructions"
    echo "3. Skip (continue anyway)"
    
    if [ "$AUTO_INSTALL" = "true" ]; then
        install_docker_compose
        return
    fi
    
    read -p "Choose option [1-3]: " choice
    case $choice in
        1) install_docker_compose ;;
        2) show_docker_compose_manual_install ;;
        3) log_warning "Skipping Docker Compose installation" ;;
        *) log_error "Invalid choice" ;;
    esac
}

# Install Docker Compose
install_docker_compose() {
    log_step "Installing Docker Compose..."
    
    # Try to install as Docker plugin first
    if docker --help | grep -q "compose"; then
        log_info "Docker Compose plugin should be included with Docker"
        return
    fi
    
    # Fall back to standalone installation
    COMPOSE_VERSION="2.24.7"
    case $SYSTEM_OS in
        linux)
            sudo curl -L "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            ;;
        macos)
            if command -v brew >/dev/null 2>&1; then
                brew install docker-compose
            else
                curl -L "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                chmod +x /usr/local/bin/docker-compose
            fi
            ;;
        *)
            show_docker_compose_manual_install
            return
            ;;
    esac
    
    log_success "Docker Compose installed successfully"
}

# Show manual Docker Compose installation
show_docker_compose_manual_install() {
    echo
    log_info "Manual Docker Compose installation:"
    echo "  sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "  sudo chmod +x /usr/local/bin/docker-compose"
    echo
}

# Offer Git installation
offer_git_install() {
    if [ "$AUTO_INSTALL" = "true" ]; then
        install_git
        return
    fi
    
    echo
    read -p "Install Git automatically? [y/N]: " choice
    case $choice in
        [Yy]*) install_git ;;
        *) log_warning "Skipping Git installation" ;;
    esac
}

# Install Git
install_git() {
    log_step "Installing Git..."
    
    case $PACKAGE_MANAGER in
        apt) sudo apt-get install -y git ;;
        yum|dnf) sudo $PACKAGE_MANAGER install -y git ;;
        pacman) sudo pacman -S --noconfirm git ;;
        brew) brew install git ;;
        zypper) sudo zypper install -y git ;;
        *) 
            log_error "Cannot auto-install Git with package manager: $PACKAGE_MANAGER"
            return 1
            ;;
    esac
    
    log_success "Git installed successfully"
}

# Offer curl installation
offer_curl_install() {
    if [ "$AUTO_INSTALL" = "true" ]; then
        install_curl
        return
    fi
    
    echo
    read -p "Install curl automatically? [y/N]: " choice
    case $choice in
        [Yy]*) install_curl ;;
        *) log_warning "Skipping curl installation" ;;
    esac
}

# Install curl
install_curl() {
    log_step "Installing curl..."
    
    case $PACKAGE_MANAGER in
        apt) sudo apt-get install -y curl ;;
        yum|dnf) sudo $PACKAGE_MANAGER install -y curl ;;
        pacman) sudo pacman -S --noconfirm curl ;;
        brew) brew install curl ;;
        zypper) sudo zypper install -y curl ;;
        *) 
            log_error "Cannot auto-install curl with package manager: $PACKAGE_MANAGER"
            return 1
            ;;
    esac
    
    log_success "curl installed successfully"
}

# Offer jq installation
offer_jq_install() {
    if [ "$AUTO_INSTALL" = "true" ]; then
        install_jq
        return
    fi
    
    echo
    read -p "Install jq automatically? [y/N]: " choice
    case $choice in
        [Yy]*) install_jq ;;
        *) log_warning "Skipping jq installation" ;;
    esac
}

# Install jq
install_jq() {
    log_step "Installing jq..."
    
    case $PACKAGE_MANAGER in
        apt) sudo apt-get install -y jq ;;
        yum|dnf) sudo $PACKAGE_MANAGER install -y jq ;;
        pacman) sudo pacman -S --noconfirm jq ;;
        brew) brew install jq ;;
        zypper) sudo zypper install -y jq ;;
        *) 
            log_error "Cannot auto-install jq with package manager: $PACKAGE_MANAGER"
            return 1
            ;;
    esac
    
    log_success "jq installed successfully"
}

# Offer make installation
offer_make_install() {
    if [ "$AUTO_INSTALL" = "true" ]; then
        install_make
        return
    fi
    
    echo
    read -p "Install make automatically? [y/N]: " choice
    case $choice in
        [Yy]*) install_make ;;
        *) log_warning "Skipping make installation" ;;
    esac
}

# Install make
install_make() {
    log_step "Installing make..."
    
    case $PACKAGE_MANAGER in
        apt) sudo apt-get install -y build-essential ;;
        yum|dnf) sudo $PACKAGE_MANAGER groupinstall -y "Development Tools" ;;
        pacman) sudo pacman -S --noconfirm base-devel ;;
        brew) brew install make ;;
        zypper) sudo zypper install -y make gcc ;;
        *) 
            log_error "Cannot auto-install make with package manager: $PACKAGE_MANAGER"
            return 1
            ;;
    esac
    
    log_success "make installed successfully"
}

# Check for hardware virtualization support
check_virtualization() {
    log_step "Checking hardware virtualization support..."
    
    case $SYSTEM_OS in
        linux)
            if [ -r /proc/cpuinfo ]; then
                if grep -q -E "(vmx|svm)" /proc/cpuinfo; then
                    log_success "Hardware virtualization supported"
                else
                    log_warning "Hardware virtualization not detected (may affect performance)"
                fi
            fi
            ;;
        macos)
            if sysctl -n machdep.cpu.features | grep -q VMX; then
                log_success "Hardware virtualization supported"
            else
                log_warning "Hardware virtualization not detected"
            fi
            ;;
        *)
            log_info "Virtualization check not implemented for $SYSTEM_OS"
            ;;
    esac
}

# Check Docker Hub connectivity
check_docker_hub() {
    log_step "Checking Docker Hub connectivity..."
    
    if curl -s --max-time 10 https://hub.docker.com >/dev/null; then
        log_success "Docker Hub is accessible"
    else
        log_warning "Cannot reach Docker Hub (may affect image downloads)"
    fi
}

# Generate system report
generate_report() {
    echo
    echo -e "${CYAN}📋 SYSTEM COMPATIBILITY REPORT${NC}"
    echo "=================================="
    echo "Date: $(date)"
    echo "System: $SYSTEM_OS ($SYSTEM_ARCH)"
    [ -n "$DISTRO" ] && echo "Distribution: $DISTRO $VERSION"
    echo "Package Manager: $PACKAGE_MANAGER"
    echo
    echo "Component Status:"
    
    # Re-check all components for final status
    echo -n "Docker: "
    if command -v docker >/dev/null 2>&1 && docker --version >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Installed${NC}"
    else
        echo -e "${RED}❌ Missing${NC}"
    fi
    
    echo -n "Docker Compose: "
    if docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Installed${NC}"
    else
        echo -e "${RED}❌ Missing${NC}"
    fi
    
    echo -n "Git: "
    if command -v git >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Installed${NC}"
    else
        echo -e "${RED}❌ Missing${NC}"
    fi
    
    echo -n "curl: "
    if command -v curl >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Installed${NC}"
    else
        echo -e "${RED}❌ Missing${NC}"
    fi
    
    echo -n "jq: "
    if command -v jq >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Optional${NC}"
    fi
    
    echo
    echo "Summary:"
    if [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}✅ System ready for StandardBounties deployment${NC}"
    else
        echo -e "${RED}❌ $ERRORS critical issues found${NC}"
    fi
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS warnings (non-critical)${NC}"
    fi
}

# Show post-installation steps
show_next_steps() {
    echo
    echo -e "${CYAN}🚀 NEXT STEPS${NC}"
    echo "=============="
    echo
    echo "1. Clone or navigate to StandardBounties project:"
    echo "   git clone <repository-url>"
    echo "   cd StandardBounties-Final"
    echo
    echo "2. Build Docker environment:"
    echo "   docker-compose build"
    echo
    echo "3. Setup environment with API keys:"
    echo "   docker-compose run --rm standardbounties setup"
    echo
    echo "4. Access interactive menu:"
    echo "   docker-compose run --rm standardbounties menu"
    echo
    echo "5. Test API connectivity:"
    echo "   docker-compose run --rm standardbounties api-health-check"
    echo
    if [ $ERRORS -gt 0 ]; then
        echo -e "${RED}⚠️  IMPORTANT: Resolve the critical issues above before proceeding${NC}"
    fi
}

# Main execution
main() {
    show_header
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto-install|-a)
                AUTO_INSTALL=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --auto-install, -a    Automatically install missing dependencies"
                echo "  --help, -h           Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run all checks
    detect_system
    check_sudo
    check_system_requirements
    check_docker
    check_docker_compose
    check_git
    check_curl
    check_jq
    check_make
    check_virtualization
    check_docker_hub
    
    # Generate final report
    generate_report
    
    # Show next steps
    show_next_steps
    
    # Exit with appropriate code
    if [ $ERRORS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"