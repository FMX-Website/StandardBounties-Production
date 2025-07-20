# StandardBounties Installation Guide

Complete installation guide with automated prerequisites checking and Docker deployment system.

## 🚀 Quick Start (One-Click Installation)

### **Option 1: Fully Automated Installation**
```bash
# Clone the repository
git clone <repository-url>
cd StandardBounties-Final

# Run automated installer
chmod +x install.sh
./install.sh --auto-install
```

### **Option 2: Interactive Installation**
```bash
# Run interactive installer (recommended for first-time users)
./install.sh
```

### **Option 3: Manual Step-by-Step**
```bash
# 1. Check prerequisites
./scripts/check-prerequisites.sh

# 2. Check version compatibility
./scripts/version-check.sh

# 3. Build Docker environment
docker-compose build

# 4. Setup environment
docker-compose run --rm standardbounties setup
```

## 📋 Prerequisites Checking System

### **Automated Prerequisites Checker**

The system includes a comprehensive prerequisites checker that validates:

- ✅ **Operating System Compatibility** (Linux, macOS, Windows)
- ✅ **Hardware Requirements** (CPU, RAM, Storage)
- ✅ **Docker Installation and Version**
- ✅ **Docker Compose Installation**
- ✅ **Required Tools** (Git, curl, jq, make)
- ✅ **Internet Connectivity**
- ✅ **Hardware Virtualization Support**
- ✅ **Docker Hub Accessibility**

### **Running Prerequisites Check**

```bash
# Basic check
./scripts/check-prerequisites.sh

# With automatic installation of missing dependencies
./scripts/check-prerequisites.sh --auto-install

# Help and options
./scripts/check-prerequisites.sh --help
```

### **Version Compatibility Checker**

```bash
# Check all dependency versions
./scripts/version-check.sh

# Generates detailed compatibility report
cat version-compatibility-report.txt
```

## 🔧 System Requirements

### **Minimum Requirements**
- **OS**: Linux (Ubuntu 18.04+), macOS (10.15+), Windows (10 Pro+)
- **CPU**: 2 cores (x86_64/AMD64)
- **RAM**: 4GB
- **Storage**: 10GB free space
- **Network**: Broadband internet

### **Recommended Requirements**
- **OS**: Latest stable versions
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 20GB+ SSD
- **Network**: High-speed internet

### **Required Software Versions**
| Software | Minimum | Recommended |
|----------|---------|-------------|
| **Docker** | 20.10.0 | 24.0.0+ |
| **Docker Compose** | 1.28.0 | 2.20.0+ |
| **Git** | 2.20.0 | 2.40.0+ |
| **curl** | 7.50.0 | Latest |

## 🐳 Docker Installation Options

### **Automatic Docker Installation**

The prerequisites checker can automatically install Docker:

**Linux (Ubuntu/Debian):**
```bash
./scripts/check-prerequisites.sh --auto-install
```

**Linux (CentOS/RHEL/Fedora):**
```bash
./scripts/check-prerequisites.sh --auto-install
```

**macOS (with Homebrew):**
```bash
./scripts/check-prerequisites.sh --auto-install
```

### **Manual Docker Installation**

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**CentOS/RHEL/Fedora:**
```bash
sudo dnf install docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**macOS:**
- Download Docker Desktop from: https://docs.docker.com/desktop/mac/install/

**Windows:**
- Download Docker Desktop from: https://docs.docker.com/desktop/windows/install/

## 📦 Installation Methods

### **Method 1: One-Click Installer**

```bash
# Download and run installer
curl -fsSL https://raw.githubusercontent.com/.../install.sh -o install.sh
chmod +x install.sh
./install.sh
```

**Installer Options:**
```bash
# Full automated installation
./install.sh --auto-install

# Custom installation directory
./install.sh --install-dir /custom/path

# Skip prerequisites check
./install.sh --skip-prerequisites

# No environment setup
./install.sh --no-env-setup
```

### **Method 2: Interactive Setup**

The interactive installer provides a menu-driven experience:

```
StandardBounties Installer
==========================

Installation Options:
1. 🔧 Full Installation (Prerequisites + Docker Setup)
2. 🐳 Docker Only (Skip prerequisites check)
3. 📋 Prerequisites Check Only
4. 🎮 Interactive Setup (Recommended)
5. ❌ Exit
```

### **Method 3: Manual Installation**

```bash
# 1. Clone repository
git clone <repository-url>
cd StandardBounties-Final

# 2. Check system compatibility
./scripts/check-prerequisites.sh
./scripts/version-check.sh

# 3. Build Docker environment
docker-compose build

# 4. Setup environment variables
docker-compose run --rm standardbounties setup

# 5. Test installation
docker-compose run --rm standardbounties api-health-check
```

## 🔍 System Compatibility Detection

### **Operating System Detection**

The system automatically detects:
- **Linux Distributions**: Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, SUSE
- **macOS Versions**: 10.15+ (Catalina through latest)
- **Windows Versions**: 10 Pro/Enterprise/Education, 11, Server 2019/2022

### **Architecture Support**
- ✅ **x86_64/AMD64**: Full support
- ✅ **ARM64/AArch64**: Full support (Apple Silicon)
- ⚠️ **ARMv7**: Limited support
- ❌ **x86 (32-bit)**: Not supported

### **Package Manager Detection**

Automatically detects and uses appropriate package managers:
- **Linux**: apt, yum, dnf, pacman, zypper
- **macOS**: brew, port
- **Windows**: choco, scoop, winget

## 🛠️ Dependency Management

### **Automatic Installation**

The system can automatically install missing dependencies:

```bash
# Enable automatic installation
export AUTO_INSTALL=true
./scripts/check-prerequisites.sh
```

### **Manual Installation Commands**

**Docker:**
```bash
# Ubuntu/Debian
sudo apt-get install docker-ce docker-ce-cli containerd.io

# CentOS/RHEL
sudo dnf install docker-ce docker-ce-cli containerd.io

# macOS
brew install --cask docker
```

**Docker Compose:**
```bash
# Latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Git:**
```bash
# Ubuntu/Debian
sudo apt-get install git

# CentOS/RHEL
sudo dnf install git

# macOS
brew install git
```

## 🔧 Environment Configuration

### **API Keys Setup**

The installation process will prompt for required API keys:

1. **Infura API Key** - Ethereum RPC access
2. **Etherscan API Key** - Contract verification
3. **Alchemy API Key** - Enhanced RPC features
4. **Forta Keys** - Security monitoring

### **Interactive Setup**
```bash
docker-compose run --rm standardbounties setup
```

### **Manual Configuration**
```bash
# Copy example environment
cp .env.example .env

# Edit with your API keys
nano .env
```

## 🧪 Installation Verification

### **Basic Verification**
```bash
# Test Docker environment
docker-compose run --rm standardbounties list-scripts

# Test compilation
docker-compose run --rm standardbounties compile

# Test API connectivity
docker-compose run --rm standardbounties api-health-check
```

### **Comprehensive Testing**
```bash
# Run all verification tests
docker-compose run --rm standardbounties menu
# Select option 4: "Run All Tests"
```

## 🔄 Troubleshooting Installation

### **Common Issues**

**1. Docker Permission Denied**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

**2. Out of Disk Space**
```bash
# Clean Docker images
docker system prune -a
```

**3. Network Connectivity Issues**
```bash
# Test connectivity
ping google.com
curl -I https://hub.docker.com
```

**4. Version Compatibility Issues**
```bash
# Check versions
./scripts/version-check.sh

# Upgrade Docker
sudo apt-get update && sudo apt-get upgrade docker-ce
```

### **Debug Mode**

Enable detailed logging:
```bash
# Debug prerequisites check
bash -x ./scripts/check-prerequisites.sh

# Debug Docker build
docker-compose build --progress=plain
```

### **Clean Installation**

If installation fails, clean and retry:
```bash
# Remove Docker containers and images
docker-compose down -v
docker system prune -a

# Clean installation directory
rm -rf ~/.standardbounties-*

# Retry installation
./install.sh
```

## 📊 Installation Report

After successful installation, you'll receive a comprehensive report:

```
🎉 INSTALLATION COMPLETE!
=========================

✅ StandardBounties successfully installed

📁 Installation Directory: /path/to/installation
🐳 Docker Environment: Ready
🔧 Scripts Available: All operational

🚀 Quick Start Commands:
1. cd '/path/to/installation'
2. docker-compose run --rm standardbounties menu
3. docker-compose run --rm standardbounties api-health-check
4. docker-compose run --rm standardbounties deploy-contracts

Ready for production deployment! 🚀
```

## 🎯 Post-Installation Steps

### **1. Environment Verification**
```bash
# Check all systems
docker-compose run --rm standardbounties api-health-check
```

### **2. Test Deployment**
```bash
# Deploy to testnet
docker-compose run --rm standardbounties deploy-contracts
```

### **3. Security Verification**
```bash
# Run security checks
docker-compose run --rm standardbounties verify-access-controls
docker-compose run --rm standardbounties verify-ownership
```

### **4. Start Monitoring**
```bash
# Start background monitoring
docker-compose --profile monitoring up -d
```

## 📚 Additional Resources

- **Docker Documentation**: [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)
- **System Requirements**: [SYSTEM_REQUIREMENTS.md](SYSTEM_REQUIREMENTS.md)
- **API Documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Troubleshooting**: See individual script documentation

## 🆘 Support

If you encounter issues:

1. **Check Prerequisites**: `./scripts/check-prerequisites.sh`
2. **Verify Versions**: `./scripts/version-check.sh`
3. **Review Logs**: `docker-compose logs`
4. **Clean Installation**: Follow clean installation steps above

---

**Ready to install StandardBounties? Choose your installation method above! 🚀**