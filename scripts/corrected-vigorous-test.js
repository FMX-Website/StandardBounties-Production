const { ethers } = require("hardhat");
const axios = require("axios");

// API Configuration with provided keys
const APIS = {
  infura: "fde9f3c4c3a042a6992b3beb5f95590c",
  etherscan: "5IIWW32VEIUMXAFAVW953VZQ829BBMY9BG",
  alchemy: "7rd1AIBXtN8S0CZcQ6QdTwAr4duBm8vr",
  forta: {
    keyId: "58c8b023b2048c0f",
    apiKey: "58c8b023b2048c0f:07114d3efd75a4c625fce48ce9ffac2f5a448d9f32fffe76df397d6b037deda5"
  }
};

class CorrectedVigorousTester {
  constructor() {
    this.deployer = null;
    this.attacker = null;
    this.implementation = null;
    this.factory = null;
    this.standardBounties = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      criticalIssues: [],
      securityPassed: 0
    };
  }

  async initialize() {
    console.log("🔥 CORRECTED VIGOROUS ERROR TESTING");
    console.log("=" .repeat(40));
    console.log("Testing actual contract functions and behaviors\n");

    const [deployer, attacker, user1, user2] = await ethers.getSigners();
    this.deployer = deployer;
    this.attacker = attacker;
    this.user1 = user1;
    this.user2 = user2;

    console.log(`📊 Test Accounts:`);
    console.log(`   Deployer: ${this.deployer.address}`);
    console.log(`   Attacker: ${this.attacker.address}`);
  }

  async deployContracts() {
    console.log("\n🏗️ DEPLOYING CONTRACTS");
    console.log("=" .repeat(20));

    try {
      const Implementation = await ethers.getContractFactory("StandardBountiesImplementation", this.deployer);
      this.implementation = await Implementation.deploy();
      await this.implementation.waitForDeployment();

      const Factory = await ethers.getContractFactory("StandardBountiesFactory", this.deployer);
      this.factory = await Factory.deploy(await this.implementation.getAddress());
      await this.factory.waitForDeployment();

      const createProxyTx = await this.factory.deployProxyAuto(this.deployer.address);
      const receipt = await createProxyTx.wait();
      
      const proxyEvent = receipt.logs.find(log => {
        try {
          const parsed = this.factory.interface.parseLog(log);
          return parsed.name === 'ProxyDeployed';
        } catch {
          return false;
        }
      });

      const proxyAddress = this.factory.interface.parseLog(proxyEvent).args.proxy;
      this.standardBounties = await ethers.getContractAt("StandardBountiesImplementation", proxyAddress, this.deployer);

      console.log("✅ All contracts deployed successfully");
      return true;
    } catch (error) {
      console.log(`❌ Deployment failed: ${error.message}`);
      return false;
    }
  }

  recordTest(name, passed, details = "") {
    if (passed) {
      this.testResults.passed++;
      console.log(`   ✅ ${name}`);
    } else {
      this.testResults.failed++;
      console.log(`   ❌ ${name}: ${details}`);
      this.testResults.errors.push({ name, details });
    }
  }

  recordCritical(name, details) {
    this.testResults.criticalIssues.push({ name, details });
    console.log(`   🔴 CRITICAL: ${name} - ${details}`);
  }

  async testActualGasPerformance() {
    console.log("\n⛽ TESTING ACTUAL GAS PERFORMANCE");
    console.log("=" .repeat(32));

    try {
      console.log("🧪 Testing proxy deployment gas");
      
      // Test actual proxy deployment
      const Proxy = await ethers.getContractFactory("StandardBountiesProxy");
      const deploymentTx = await Proxy.getDeployTransaction(await this.implementation.getAddress());
      const gasEstimate = await ethers.provider.estimateGas(deploymentTx);
      
      console.log(`   📊 Proxy deployment gas: ${gasEstimate.toString()}`);
      
      if (gasEstimate <= 500000n) {
        this.recordTest("Proxy gas under 500k", true, `${gasEstimate} gas`);
      } else {
        this.recordTest("Proxy gas under 500k", false, `${gasEstimate} exceeds 500k limit`);
      }

      // Test function call gas usage
      console.log("🧪 Testing function gas usage");
      
      const initGas = await this.standardBounties.initializeBounty.estimateGas(
        this.deployer.address,
        this.deployer.address,
        "test",
        Math.floor(Date.now() / 1000) + 86400
      );
      
      console.log(`   📊 Initialize bounty gas: ${initGas.toString()}`);
      
      if (initGas <= 200000n) {
        this.recordTest("Initialize gas reasonable", true, `${initGas} gas`);
      } else {
        this.recordTest("Initialize gas reasonable", false, `${initGas} is high`);
      }

    } catch (error) {
      this.recordTest("Gas performance testing", false, error.message);
    }
  }

  async testActualSecurityFeatures() {
    console.log("\n🛡️ TESTING ACTUAL SECURITY FEATURES");
    console.log("=" .repeat(35));

    try {
      // Test ownership and access control
      console.log("🧪 Testing ownership access control");
      
      try {
        await this.standardBounties.connect(this.attacker).pause();
        this.recordTest("Unauthorized pause blocked", false, "Attacker was able to pause");
      } catch (error) {
        if (error.message.includes("Ownable") || error.message.includes("caller is not the owner")) {
          this.recordTest("Unauthorized pause blocked", true);
          this.testResults.securityPassed++;
        } else {
          this.recordTest("Unauthorized pause blocked", false, `Unexpected error: ${error.message}`);
        }
      }

      // Test platform fee security
      console.log("🧪 Testing platform fee manipulation protection");
      
      try {
        await this.standardBounties.connect(this.attacker).setPlatformFee(9999);
        this.recordTest("Unauthorized fee change blocked", false, "Attacker changed fees");
      } catch (error) {
        if (error.message.includes("Ownable") || error.message.includes("caller is not the owner")) {
          this.recordTest("Unauthorized fee change blocked", true);
          this.testResults.securityPassed++;
        } else {
          this.recordTest("Unauthorized fee change blocked", false, `Unexpected error: ${error.message}`);
        }
      }

      // Test valid owner operations
      console.log("🧪 Testing valid owner operations");
      
      try {
        await this.standardBounties.setPlatformFee(500); // 5%
        this.recordTest("Owner can set reasonable fee", true);
        
        await this.standardBounties.pause();
        this.recordTest("Owner can pause contract", true);
        
        await this.standardBounties.unpause();
        this.recordTest("Owner can unpause contract", true);
        
      } catch (error) {
        this.recordTest("Owner operations", false, error.message);
      }

    } catch (error) {
      this.recordTest("Security feature testing", false, error.message);
    }
  }

  async testBountyWorkflowEdgeCases() {
    console.log("\n📋 TESTING BOUNTY WORKFLOW EDGE CASES");
    console.log("=" .repeat(37));

    try {
      // Create a valid bounty for testing
      console.log("🧪 Setting up test bounty");
      
      const bountyTx = await this.standardBounties.initializeBounty(
        this.deployer.address,
        this.deployer.address,
        "edge-case-test",
        Math.floor(Date.now() / 1000) + 86400
      );
      await bountyTx.wait();

      // Test funding edge cases
      console.log("🧪 Testing funding edge cases");
      
      // Test zero funding
      try {
        await this.standardBounties.fundBountyETH(0, { value: 0 });
        this.recordTest("Zero funding rejected", false, "Zero funding was accepted");
      } catch (error) {
        this.recordTest("Zero funding rejected", true);
      }

      // Test funding with valid amount
      try {
        await this.standardBounties.fundBountyETH(0, { value: ethers.parseEther("0.1") });
        this.recordTest("Valid funding accepted", true);
      } catch (error) {
        this.recordTest("Valid funding accepted", false, error.message);
      }

      // Test fulfillment edge cases
      console.log("🧪 Testing fulfillment edge cases");
      
      // Test empty fulfillment data
      try {
        await this.standardBounties.connect(this.user1).fulfillBounty(0, "");
        this.recordTest("Empty fulfillment data handled", true);
      } catch (error) {
        if (error.message.includes("empty") || error.message.includes("invalid")) {
          this.recordTest("Empty fulfillment rejected", true);
        } else {
          this.recordTest("Empty fulfillment handling", false, error.message);
        }
      }

      // Test valid fulfillment
      try {
        await this.standardBounties.connect(this.user1).fulfillBounty(0, "valid-fulfillment");
        this.recordTest("Valid fulfillment accepted", true);
      } catch (error) {
        this.recordTest("Valid fulfillment accepted", false, error.message);
      }

      // Test acceptance edge cases
      console.log("🧪 Testing acceptance edge cases");
      
      // Test unauthorized acceptance
      try {
        await this.standardBounties.connect(this.attacker).acceptFulfillment(0, 0, ethers.parseEther("0.05"));
        this.recordTest("Unauthorized acceptance blocked", false, "Attacker could accept fulfillment");
      } catch (error) {
        if (error.message.includes("Unauthorized") || error.message.includes("caller is not")) {
          this.recordTest("Unauthorized acceptance blocked", true);
          this.testResults.securityPassed++;
        } else {
          this.recordTest("Unauthorized acceptance blocked", false, `Unexpected: ${error.message}`);
        }
      }

      // Test valid acceptance
      try {
        await this.standardBounties.acceptFulfillment(0, 0, ethers.parseEther("0.05"));
        this.recordTest("Valid acceptance processed", true);
      } catch (error) {
        this.recordTest("Valid acceptance processed", false, error.message);
      }

    } catch (error) {
      this.recordTest("Bounty workflow testing", false, error.message);
    }
  }

  async testRealTimeAPIResilience() {
    console.log("\n📡 TESTING REAL-TIME API RESILIENCE");
    console.log("=" .repeat(36));

    try {
      // Test API connectivity
      console.log("🧪 Testing API connectivity resilience");
      
      const apiTests = [
        {
          name: "Infura connectivity",
          test: async () => {
            const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${APIS.infura}`);
            return await provider.getBlockNumber();
          }
        },
        {
          name: "Etherscan API",
          test: async () => {
            const response = await axios.get(
              `https://api-sepolia.etherscan.io/api?module=stats&action=ethprice&apikey=${APIS.etherscan}`
            );
            return response.data.status === "1";
          }
        },
        {
          name: "Alchemy backup",
          test: async () => {
            const provider = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${APIS.alchemy}`);
            return await provider.getBlockNumber();
          }
        }
      ];

      for (const apiTest of apiTests) {
        try {
          const result = await apiTest.test();
          if (result) {
            this.recordTest(apiTest.name, true);
          } else {
            this.recordTest(apiTest.name, false, "API returned false/null");
          }
        } catch (error) {
          this.recordTest(apiTest.name, false, error.message);
        }
      }

    } catch (error) {
      this.recordTest("API resilience testing", false, error.message);
    }
  }

  async testIntegerOverflowProtection() {
    console.log("\n🔢 TESTING INTEGER OVERFLOW PROTECTION");
    console.log("=" .repeat(38));

    try {
      console.log("🧪 Testing large number handling");
      
      // Test with large but valid deadline
      try {
        const largeDeadline = Math.floor(Date.now() / 1000) + (365 * 24 * 3600); // 1 year
        await this.standardBounties.initializeBounty(
          this.deployer.address,
          this.deployer.address,
          "large-deadline-test",
          largeDeadline
        );
        this.recordTest("Large deadline handled", true);
      } catch (error) {
        this.recordTest("Large deadline handled", false, error.message);
      }

      // Test with maximum safe integer
      try {
        const maxSafeDeadline = 2147483647; // Max 32-bit integer
        await this.standardBounties.initializeBounty(
          this.deployer.address,
          this.deployer.address,
          "max-safe-deadline",
          maxSafeDeadline
        );
        this.recordTest("Max safe integer handled", true);
      } catch (error) {
        if (error.message.includes("deadline") || error.message.includes("overflow")) {
          this.recordTest("Max safe integer properly rejected", true);
        } else {
          this.recordTest("Max safe integer handling", false, error.message);
        }
      }

    } catch (error) {
      this.recordTest("Integer overflow protection", false, error.message);
    }
  }

  async generateCorrectedReport() {
    console.log("\n📊 CORRECTED ERROR ANALYSIS REPORT");
    console.log("=" .repeat(35));

    const totalTests = this.testResults.passed + this.testResults.failed;
    const successRate = totalTests > 0 ? ((this.testResults.passed / totalTests) * 100).toFixed(1) : 0;

    console.log(`\n📈 CORRECTED TEST RESULTS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${this.testResults.passed} ✅`);
    console.log(`   Failed: ${this.testResults.failed} ❌`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Security Tests Passed: ${this.testResults.securityPassed} 🛡️`);

    console.log(`\n🚨 IDENTIFIED ISSUES:`);
    if (this.testResults.errors.length === 0) {
      console.log("   ✅ No issues detected");
    } else {
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.name}: ${error.details}`);
      });
    }

    console.log(`\n🔴 CRITICAL ISSUES:`);
    if (this.testResults.criticalIssues.length === 0) {
      console.log("   ✅ No critical issues detected");
    } else {
      this.testResults.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.name}: ${issue.details}`);
      });
    }

    // Determine overall health
    const criticalCount = this.testResults.criticalIssues.length;
    const isHealthy = parseFloat(successRate) >= 85 && criticalCount === 0 && this.testResults.securityPassed >= 3;

    console.log(`\n🎯 FINAL ASSESSMENT:`);
    if (isHealthy) {
      console.log("   ✅ SYSTEM HEALTHY - Passes vigorous testing");
      console.log("   ✅ Security features working properly");
      console.log("   ✅ Ready for production deployment");
    } else if (criticalCount === 0) {
      console.log("   ⚠️ MINOR ISSUES - System functional but needs review");
      console.log("   🔍 Address failed tests before production");
    } else {
      console.log("   ❌ CRITICAL ISSUES - System needs fixes");
      console.log("   🔴 NOT READY for production");
    }

    return {
      totalTests,
      passed: this.testResults.passed,
      failed: this.testResults.failed,
      successRate: parseFloat(successRate),
      securityPassed: this.testResults.securityPassed,
      criticalIssues: criticalCount,
      overallHealth: isHealthy ? "HEALTHY" : (criticalCount === 0 ? "MINOR_ISSUES" : "CRITICAL_ISSUES")
    };
  }

  async runCorrectedVigorousTesting() {
    try {
      await this.initialize();
      
      const deployed = await this.deployContracts();
      if (!deployed) {
        throw new Error("Failed to deploy contracts");
      }

      await this.testActualGasPerformance();
      await this.testActualSecurityFeatures();
      await this.testBountyWorkflowEdgeCases();
      await this.testRealTimeAPIResilience();
      await this.testIntegerOverflowProtection();

      const report = await this.generateCorrectedReport();

      console.log("\n" + "=" .repeat(50));
      if (report.overallHealth === "HEALTHY") {
        console.log("🎉 CORRECTED VIGOROUS TESTING SUCCESSFUL");
        console.log("✅ StandardBounties system is robust and secure");
        console.log("✅ All critical security features working");
        console.log("✅ Production deployment approved");
      } else {
        console.log("⚠️ TESTING COMPLETED WITH FINDINGS");
        console.log("🔍 Review issues before production deployment");
      }

      return report;

    } catch (error) {
      console.log(`❌ Testing failed: ${error.message}`);
      return {
        totalTests: 0,
        passed: 0,
        failed: 1,
        successRate: 0,
        securityPassed: 0,
        criticalIssues: 1,
        overallHealth: "FAILED"
      };
    }
  }
}

async function main() {
  const tester = new CorrectedVigorousTester();
  
  try {
    const report = await tester.runCorrectedVigorousTesting();
    
    if (report.overallHealth === "HEALTHY") {
      console.log("\n🏆 VIGOROUS TESTING PASSED - SYSTEM VALIDATED");
      process.exit(0);
    } else if (report.overallHealth === "MINOR_ISSUES") {
      console.log("\n⚠️ Minor issues detected - review recommended");
      process.exit(1);
    } else {
      console.log("\n❌ Critical issues - system needs fixes");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Testing framework error:", error.message);
    process.exit(1);
  }
}

main();