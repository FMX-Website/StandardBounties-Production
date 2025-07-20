#!/bin/bash

# StandardBounties One-Click Installer
# Complete setup script with prerequisites checking and Docker deployment

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="StandardBounties"
INSTALL_DIR="${INSTALL_DIR:-$HOME/StandardBounties-Production}"
SKIP_PREREQUISITES=${SKIP_PREREQUISITES:-false}
AUTO_INSTALL=${AUTO_INSTALL:-false}
SETUP_ENV=${SETUP_ENV:-true}

# Show installer header
show_installer_header() {
    clear
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                 StandardBounties Installer                  ║
║             Production-Ready Smart Contract Suite           ║
║                                                              ║
║    🚀 One-click setup with Docker deployment system        ║
║    🔧 Automated prerequisites checking and installation     ║
║    🌐 Real-time API integration and monitoring             ║
║    🔒 Gas-optimized deployment under 500k gas             ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo
}

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${PURPLE}🔍 $1${NC}"; }

# Show installation options
show_installation_options() {
    echo -e "${BLUE}📋 Installation Options:${NC}"
    echo
    echo "1. 🔧 Full Installation (Prerequisites + Docker Setup)"
    echo "2. 🐳 Docker Only (Skip prerequisites check)"
    echo "3. 📋 Prerequisites Check Only"
    echo "4. 🎮 Interactive Setup (Recommended)"
    echo "5. ❌ Exit"
    echo
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --install-dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            --skip-prerequisites)
                SKIP_PREREQUISITES=true
                shift
                ;;
            --auto-install)
                AUTO_INSTALL=true
                shift
                ;;
            --no-env-setup)
                SETUP_ENV=false
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help
show_help() {
    echo "StandardBounties Installer"
    echo
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  --install-dir DIR        Installation directory (default: ~/StandardBounties-Production)"
    echo "  --skip-prerequisites     Skip prerequisites checking"
    echo "  --auto-install          Automatically install missing dependencies"
    echo "  --no-env-setup          Skip environment setup"
    echo "  --help, -h              Show this help message"
    echo
    echo "Environment Variables:"
    echo "  INSTALL_DIR             Override installation directory"
    echo "  AUTO_INSTALL           Enable automatic installation (true/false)"
    echo "  SKIP_PREREQUISITES     Skip prerequisites (true/false)"
    echo
}

# Check if running in correct directory
check_source_directory() {
    log_step "Verifying source directory..."
    
    if [ ! -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        log_error "docker-compose.yml not found in current directory"
        log_info "Please run this installer from the StandardBounties project root"
        exit 1
    fi
    
    if [ ! -f "$SCRIPT_DIR/Dockerfile" ]; then
        log_error "Dockerfile not found in current directory"
        exit 1
    fi
    
    if [ ! -d "$SCRIPT_DIR/contracts" ]; then
        log_error "contracts directory not found"
        exit 1
    fi
    
    log_success "Source directory verified"
}

# Run prerequisites checker
run_prerequisites_check() {
    log_step "Running prerequisites check..."
    
    local prereq_script="$SCRIPT_DIR/scripts/check-prerequisites.sh"
    
    if [ ! -f "$prereq_script" ]; then
        log_error "Prerequisites checker not found: $prereq_script"
        exit 1
    fi
    
    chmod +x "$prereq_script"
    
    local prereq_args=""
    if [ "$AUTO_INSTALL" = "true" ]; then
        prereq_args="--auto-install"
    fi
    
    if ! "$prereq_script" $prereq_args; then
        log_error "Prerequisites check failed"
        echo
        log_info "Please resolve the issues above and run the installer again"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Setup installation directory
setup_installation_directory() {
    log_step "Setting up installation directory: $INSTALL_DIR"
    
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "Installation directory already exists"
        echo
        read -p "Continue with existing directory? [y/N]: " choice
        case $choice in
            [Yy]*) ;;
            *) 
                log_info "Installation cancelled"
                exit 0
                ;;
        esac
    else
        mkdir -p "$INSTALL_DIR"
    fi
    
    # Copy all project files to installation directory
    log_step "Copying project files..."
    
    cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/" 2>/dev/null || {
        log_error "Failed to copy project files"
        exit 1
    }
    
    # Set permissions
    chmod +x "$INSTALL_DIR"/scripts/*.sh 2>/dev/null || true
    chmod +x "$INSTALL_DIR"/docker/*.sh 2>/dev/null || true
    
    log_success "Installation directory setup complete"
}

# Build Docker environment
build_docker_environment() {
    log_step "Building Docker environment..."
    
    cd "$INSTALL_DIR"
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found in installation directory"
        exit 1
    fi
    
    # Build Docker images
    log_info "Building Docker images (this may take a few minutes)..."
    if ! docker-compose build; then
        log_error "Docker build failed"
        exit 1
    fi
    
    log_success "Docker environment built successfully"
}

# Test Docker environment
test_docker_environment() {
    log_step "Testing Docker environment..."
    
    cd "$INSTALL_DIR"
    
    # Test basic Docker functionality
    log_info "Testing Docker container startup..."
    if ! docker-compose run --rm standardbounties list-scripts >/dev/null 2>&1; then
        log_error "Docker environment test failed"
        exit 1
    fi
    
    # Test compilation
    log_info "Testing contract compilation..."
    if ! docker-compose run --rm standardbounties compile >/dev/null 2>&1; then
        log_error "Contract compilation test failed"
        exit 1
    fi
    
    log_success "Docker environment tests passed"
}

# Setup environment configuration
setup_environment() {
    if [ "$SETUP_ENV" != "true" ]; then
        log_info "Skipping environment setup (--no-env-setup specified)"
        return
    fi
    
    log_step "Setting up environment configuration..."
    
    cd "$INSTALL_DIR"
    
    echo
    log_info "Environment setup options:"
    echo "1. 🔧 Interactive setup (recommended)"
    echo "2. 📄 Copy example configuration"
    echo "3. ⏭️  Skip for now"
    echo
    
    read -p "Choose option [1-3]: " env_choice
    
    case $env_choice in
        1)
            log_info "Starting interactive environment setup..."
            docker-compose run --rm standardbounties setup
            ;;
        2)
            if [ -f ".env.example" ]; then
                cp ".env.example" ".env"
                log_success "Example configuration copied to .env"
                log_warning "Please edit .env file with your API keys"
            else
                log_error ".env.example not found"
            fi
            ;;
        3)
            log_info "Environment setup skipped"
            ;;
        *)
            log_warning "Invalid choice, skipping environment setup"
            ;;
    esac
}

# Create desktop shortcuts (Linux/macOS)
create_shortcuts() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        create_linux_shortcuts
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        create_macos_shortcuts
    fi
}

# Create Linux desktop shortcuts
create_linux_shortcuts() {
    log_step "Creating desktop shortcuts..."
    
    local desktop_dir="$HOME/Desktop"
    local applications_dir="$HOME/.local/share/applications"
    
    if [ -d "$desktop_dir" ]; then
        cat > "$desktop_dir/StandardBounties.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=StandardBounties
Comment=StandardBounties Smart Contract Management
Exec=gnome-terminal -- bash -c "cd '$INSTALL_DIR' && docker-compose run --rm standardbounties menu; read -p 'Press Enter to close...'"
Icon=applications-development
Terminal=false
Categories=Development;
EOF
        chmod +x "$desktop_dir/StandardBounties.desktop"
        log_success "Desktop shortcut created"
    fi
    
    mkdir -p "$applications_dir"
    cat > "$applications_dir/standardbounties.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=StandardBounties
Comment=StandardBounties Smart Contract Management
Exec=gnome-terminal -- bash -c "cd '$INSTALL_DIR' && docker-compose run --rm standardbounties menu; read -p 'Press Enter to close...'"
Icon=applications-development
Terminal=false
Categories=Development;
EOF
    
    log_success "Application menu entry created"
}

# Create macOS shortcuts
create_macos_shortcuts() {
    log_step "Creating macOS shortcuts..."
    
    local app_dir="/Applications/StandardBounties.app"
    
    mkdir -p "$app_dir/Contents/MacOS"
    
    cat > "$app_dir/Contents/MacOS/StandardBounties" << EOF
#!/bin/bash
cd "$INSTALL_DIR"
docker-compose run --rm standardbounties menu
EOF
    
    chmod +x "$app_dir/Contents/MacOS/StandardBounties"
    
    cat > "$app_dir/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>StandardBounties</string>
    <key>CFBundleIdentifier</key>
    <string>com.standardbounties.app</string>
    <key>CFBundleName</key>
    <string>StandardBounties</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
</dict>
</plist>
EOF
    
    log_success "macOS application created"
}

# Show installation summary
show_installation_summary() {
    echo
    echo -e "${CYAN}🎉 INSTALLATION COMPLETE!${NC}"
    echo "========================="
    echo
    echo -e "${GREEN}✅ StandardBounties successfully installed${NC}"
    echo
    echo -e "${BLUE}📁 Installation Directory:${NC} $INSTALL_DIR"
    echo -e "${BLUE}🐳 Docker Environment:${NC} Ready"
    echo -e "${BLUE}🔧 Scripts Available:${NC} All operational"
    echo
    echo -e "${PURPLE}🚀 Quick Start Commands:${NC}"
    echo
    echo "1. Navigate to installation directory:"
    echo "   cd '$INSTALL_DIR'"
    echo
    echo "2. Access interactive menu:"
    echo "   docker-compose run --rm standardbounties menu"
    echo
    echo "3. Check API health:"
    echo "   docker-compose run --rm standardbounties api-health-check"
    echo
    echo "4. Deploy contracts:"
    echo "   docker-compose run --rm standardbounties deploy-contracts"
    echo
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo
    if [ ! -f "$INSTALL_DIR/.env" ]; then
        echo "1. ⚠️  Setup environment with API keys:"
        echo "   docker-compose run --rm standardbounties setup"
        echo
    fi
    echo "2. 🧪 Test all systems:"
    echo "   docker-compose run --rm standardbounties api-health-check"
    echo
    echo "3. 📖 Read documentation:"
    echo "   - DOCKER_DEPLOYMENT_GUIDE.md"
    echo "   - SYSTEM_REQUIREMENTS.md"
    echo "   - API_DOCUMENTATION.md"
    echo
    echo -e "${GREEN}Ready for production deployment! 🚀${NC}"
}

# Interactive installation mode
interactive_installation() {
    show_installer_header
    
    echo -e "${BLUE}Welcome to the StandardBounties installer!${NC}"
    echo
    echo "This installer will:"
    echo "• ✅ Check system prerequisites"
    echo "• 🐳 Setup Docker environment"
    echo "• 🔧 Configure API integration"
    echo "• 🚀 Prepare for deployment"
    echo
    
    read -p "Continue with installation? [Y/n]: " continue_choice
    case $continue_choice in
        [Nn]*) 
            log_info "Installation cancelled"
            exit 0
            ;;
    esac
    
    echo
    log_info "Starting installation process..."
    
    # Get installation preferences
    echo
    echo -e "${BLUE}📁 Installation Directory:${NC}"
    echo "Default: $INSTALL_DIR"
    read -p "Use default directory? [Y/n]: " dir_choice
    case $dir_choice in
        [Nn]*)
            read -p "Enter installation directory: " custom_dir
            INSTALL_DIR="${custom_dir/#\~/$HOME}"
            ;;
    esac
    
    echo
    echo -e "${BLUE}🔧 Dependency Management:${NC}"
    read -p "Automatically install missing dependencies? [Y/n]: " auto_choice
    case $auto_choice in
        [Nn]*) AUTO_INSTALL=false ;;
        *) AUTO_INSTALL=true ;;
    esac
    
    # Run installation steps
    check_source_directory
    
    if [ "$SKIP_PREREQUISITES" != "true" ]; then
        run_prerequisites_check
    fi
    
    setup_installation_directory
    build_docker_environment
    test_docker_environment
    setup_environment
    create_shortcuts
    show_installation_summary
}

# Menu-driven installation
menu_installation() {
    while true; do
        show_installer_header
        show_installation_options
        
        read -p "Select option [1-5]: " choice
        
        case $choice in
            1)
                log_info "Starting full installation..."
                check_source_directory
                run_prerequisites_check
                setup_installation_directory
                build_docker_environment
                test_docker_environment
                setup_environment
                create_shortcuts
                show_installation_summary
                break
                ;;
            2)
                log_info "Starting Docker-only installation..."
                SKIP_PREREQUISITES=true
                check_source_directory
                setup_installation_directory
                build_docker_environment
                test_docker_environment
                setup_environment
                show_installation_summary
                break
                ;;
            3)
                log_info "Running prerequisites check only..."
                run_prerequisites_check
                echo
                log_success "Prerequisites check complete. Run installer again for full setup."
                break
                ;;
            4)
                interactive_installation
                break
                ;;
            5)
                log_info "Installation cancelled"
                exit 0
                ;;
            *)
                log_error "Invalid option. Please select 1-5."
                sleep 2
                ;;
        esac
    done
}

# Main installation function
main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Check if running non-interactively
    if [ "$AUTO_INSTALL" = "true" ] || [ -n "$CI" ]; then
        log_info "Running automated installation..."
        check_source_directory
        
        if [ "$SKIP_PREREQUISITES" != "true" ]; then
            run_prerequisites_check
        fi
        
        setup_installation_directory
        build_docker_environment
        test_docker_environment
        
        if [ "$SETUP_ENV" = "true" ]; then
            setup_environment
        fi
        
        show_installation_summary
    else
        # Interactive mode
        menu_installation
    fi
}

# Error handling
trap 'log_error "Installation failed on line $LINENO"' ERR

# Run main function
main "$@"