# StandardBounties System Requirements

Complete system requirements and compatibility guide for StandardBounties Docker deployment.

## 🖥️ Supported Operating Systems

### ✅ **Linux Distributions**
- **Ubuntu**: 18.04+ (LTS recommended)
- **Debian**: 10+ (Buster and newer)
- **CentOS**: 7+ / Rocky Linux 8+
- **Red Hat Enterprise Linux**: 7+
- **Fedora**: 33+
- **Arch Linux**: Current
- **openSUSE**: Leap 15.2+
- **Amazon Linux**: 2

### ✅ **macOS**
- **macOS**: 10.15+ (Catalina and newer)
- **macOS Big Sur**: 11.0+
- **macOS Monterey**: 12.0+
- **macOS Ventura**: 13.0+
- **macOS Sonoma**: 14.0+

### ✅ **Windows**
- **Windows 10**: Pro, Enterprise, Education (Build 19041+)
- **Windows 11**: All editions
- **Windows Server**: 2019, 2022

## 🏗️ Hardware Requirements

### **Minimum Requirements**
- **CPU**: 2 cores (x86_64/AMD64)
- **RAM**: 4GB
- **Storage**: 10GB free space
- **Network**: Broadband internet connection

### **Recommended Requirements**
- **CPU**: 4+ cores (x86_64/AMD64 or ARM64)
- **RAM**: 8GB+
- **Storage**: 20GB+ SSD
- **Network**: High-speed internet (for blockchain API calls)

### **Architecture Support**
- ✅ **x86_64/AMD64**: Full support
- ✅ **ARM64/AArch64**: Full support (Apple Silicon, etc.)
- ⚠️ **ARMv7**: Limited support
- ❌ **x86 (32-bit)**: Not supported

## 🐳 Docker Requirements

### **Docker Engine**
- **Minimum Version**: 20.10.0
- **Recommended Version**: 24.0.0+
- **Required Features**:
  - BuildKit support
  - Multi-stage builds
  - Docker Compose integration

### **Docker Compose**
- **Minimum Version**: 1.28.0 (legacy)
- **Recommended Version**: 2.20.0+ (plugin)
- **Installation Methods**:
  - Docker Compose plugin (recommended)
  - Standalone docker-compose binary

### **Container Resources**
- **Memory Limit**: 2GB minimum, 4GB recommended
- **CPU Limit**: 2 cores minimum
- **Storage**: 5GB for images and containers

## 📦 Required Dependencies

### **Essential Tools**
| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| **Docker** | 20.10.0 | Container runtime |
| **Docker Compose** | 1.28.0 | Multi-container orchestration |
| **Git** | 2.20.0+ | Version control |
| **curl** | 7.0+ | HTTP client for API calls |

### **Recommended Tools**
| Tool | Purpose | Installation |
|------|---------|-------------|
| **jq** | JSON processing | Package manager |
| **make** | Build automation | Package manager |
| **vim/nano** | Text editing | Package manager |

### **Network Requirements**
- **Internet Access**: Required for Docker image downloads
- **Ports**: 3000, 8545, 8546 (configurable)
- **Outbound HTTPS**: Access to:
  - Docker Hub (hub.docker.com)
  - GitHub (github.com)
  - Blockchain APIs (Infura, Alchemy, Etherscan)

## 🔧 Package Manager Support

### **Linux Package Managers**
- ✅ **APT** (Ubuntu, Debian): `apt-get`
- ✅ **YUM** (CentOS 7, RHEL 7): `yum`
- ✅ **DNF** (Fedora, CentOS 8+): `dnf`
- ✅ **Pacman** (Arch Linux): `pacman`
- ✅ **Zypper** (openSUSE): `zypper`

### **macOS Package Managers**
- ✅ **Homebrew**: `brew` (recommended)
- ✅ **MacPorts**: `port`
- ✅ **Manual Installation**: Direct downloads

### **Windows Package Managers**
- ✅ **Chocolatey**: `choco`
- ✅ **Scoop**: `scoop`
- ✅ **Windows Package Manager**: `winget`
- ✅ **Manual Installation**: Direct downloads

## 🔐 Permission Requirements

### **Linux/macOS**
- **Sudo Access**: Required for installation
- **Docker Group**: User should be in docker group
- **File Permissions**: Read/write access to project directory

### **Windows**
- **Administrator**: Required for Docker Desktop installation
- **Hyper-V**: Must be enabled (Windows Pro/Enterprise)
- **WSL 2**: Required for optimal performance

## 🌐 Network Configuration

### **Firewall Requirements**
- **Outbound HTTPS (443)**: Required for API calls
- **Outbound HTTP (80)**: For package downloads
- **Docker Ports**: 3000, 8545, 8546 (if external access needed)

### **Proxy Support**
- **HTTP_PROXY**: Supported via environment variables
- **HTTPS_PROXY**: Supported via environment variables
- **NO_PROXY**: Configure for local services

### **DNS Requirements**
- **Public DNS**: Access to public DNS servers
- **Corporate DNS**: May require additional configuration

## 🔍 Compatibility Matrix

### **Docker Engine Compatibility**
| OS | Docker CE | Docker Desktop | Container Runtime |
|----|-----------|----------------|-------------------|
| **Ubuntu 20.04+** | ✅ | ✅ | containerd |
| **macOS 10.15+** | ❌ | ✅ | containerd |
| **Windows 10+** | ❌ | ✅ | containerd |
| **CentOS 8+** | ✅ | ❌ | containerd |
| **Arch Linux** | ✅ | ❌ | containerd |

### **Node.js Compatibility** (Container Internal)
- **Container Base**: Node.js 20-alpine
- **Host Node.js**: Not required (containerized)
- **NPM Version**: 10.8.2+ (included in container)

## ⚡ Performance Considerations

### **CPU Architecture**
- **x86_64**: Optimal performance
- **ARM64**: Good performance (Apple Silicon optimized)
- **ARMv7**: Limited performance

### **Storage Type**
- **SSD**: Recommended for optimal I/O performance
- **HDD**: Supported but slower container operations
- **Network Storage**: Not recommended for containers

### **Memory Management**
- **Swap**: 2GB+ recommended
- **Memory Overcommit**: Should be enabled
- **Docker Memory Limit**: Configure based on available RAM

## 🛠️ Installation Prerequisites

### **Pre-Installation Checklist**
- [ ] Operating system compatibility verified
- [ ] Hardware requirements met
- [ ] Internet connectivity available
- [ ] Administrative privileges available
- [ ] Firewall configured appropriately

### **Automated Checker**
Run the prerequisites checker:
```bash
chmod +x scripts/check-prerequisites.sh
./scripts/check-prerequisites.sh
```

**With auto-installation:**
```bash
./scripts/check-prerequisites.sh --auto-install
```

## 🐛 Common Compatibility Issues

### **Docker Desktop on Windows**
- **Issue**: Hyper-V conflicts with VirtualBox
- **Solution**: Disable VirtualBox or use WSL 2 backend

### **ARM64 Macs (Apple Silicon)**
- **Issue**: Some images may not have ARM64 variants
- **Solution**: Use Rosetta 2 emulation (automatic)

### **Corporate Networks**
- **Issue**: Proxy/firewall blocking container downloads
- **Solution**: Configure proxy settings in Docker

### **Low Memory Systems**
- **Issue**: Container OOM kills
- **Solution**: Increase Docker memory limits

## 📋 Verification Commands

### **System Information**
```bash
# Check OS and architecture
uname -a

# Check available memory
free -h

# Check available disk space
df -h

# Check Docker installation
docker --version
docker compose version

# Check internet connectivity
ping -c 3 google.com
```

### **Docker Health Check**
```bash
# Test Docker daemon
docker info

# Test image pulling
docker pull hello-world
docker run hello-world

# Test Docker Compose
docker compose version
```

## 🔄 Upgrade Paths

### **Docker Engine Upgrade**
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get upgrade docker-ce

# CentOS/RHEL
sudo yum update docker-ce

# macOS
brew upgrade docker
```

### **Docker Compose Upgrade**
```bash
# Plugin version (recommended)
docker compose version

# Standalone version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 🆘 Troubleshooting

### **Common Issues**
1. **Docker permission denied**
   - Add user to docker group: `sudo usermod -aG docker $USER`
   - Log out and back in

2. **Out of disk space**
   - Clean Docker images: `docker system prune -a`
   - Increase available storage

3. **Network connectivity issues**
   - Check firewall settings
   - Verify proxy configuration
   - Test DNS resolution

4. **Container won't start**
   - Check Docker daemon status: `systemctl status docker`
   - Review Docker logs: `docker logs <container>`
   - Verify resource limits

### **Support Resources**
- **Docker Documentation**: https://docs.docker.com/
- **System Requirements Checker**: `./scripts/check-prerequisites.sh`
- **Issue Reporting**: GitHub Issues

---

**Ready to check your system compatibility? Run the prerequisites checker! 🚀**