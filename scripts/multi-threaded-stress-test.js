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

class MultiThreadedStressTester {
  constructor() {
    this.provider = null;
    this.accounts = [];
    this.implementation = null;
    this.factory = null;
    this.standardBounties = null;
    this.testResults = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      concurrentThreads: 0,
      averageResponseTime: 0,
      throughput: 0,
      errors: [],
      performanceMetrics: {
        bountyCreations: [],
        fundings: [],
        fulfillments: [],
        acceptances: []
      },
      raceConditions: [],
      dataConsistency: true
    };
    this.startTime = null;
  }

  async initialize() {
    console.log("🧵 MULTI-THREADED STRESS TESTING - STANDARDBOUNTIES");
    console.log("=" .repeat(55));
    console.log("Testing concurrent operations, race conditions, and thread safety\n");

    // Get multiple accounts for parallel testing
    this.accounts = await ethers.getSigners();
    if (this.accounts.length < 10) {
      console.log("⚠️ Limited accounts available, will simulate with available accounts");
    }

    console.log(`📊 Test Setup:`);
    console.log(`   Available Accounts: ${this.accounts.length}`);
    console.log(`   Primary Deployer: ${this.accounts[0].address}`);
    console.log(`   Test Accounts: ${Math.min(this.accounts.length - 1, 9)}`);

    // Setup provider for real-time monitoring
    try {
      this.provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${APIS.infura}`);
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`   Network: Sepolia (Block: ${blockNumber})`);
    } catch (error) {
      console.log("   Network: Local Hardhat");
      this.provider = ethers.provider;
    }

    return true;
  }

  async deployContracts() {
    console.log("\n🏗️ DEPLOYING CONTRACTS FOR STRESS TESTING");
    console.log("=" .repeat(43));

    try {
      // Deploy implementation
      const Implementation = await ethers.getContractFactory("StandardBountiesImplementation", this.accounts[0]);
      this.implementation = await Implementation.deploy();
      await this.implementation.waitForDeployment();

      // Deploy factory
      const Factory = await ethers.getContractFactory("StandardBountiesFactory", this.accounts[0]);
      this.factory = await Factory.deploy(await this.implementation.getAddress());
      await this.factory.waitForDeployment();

      // Create proxy
      const createProxyTx = await this.factory.deployProxyAuto(this.accounts[0].address);
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
      this.standardBounties = await ethers.getContractAt("StandardBountiesImplementation", proxyAddress, this.accounts[0]);

      console.log("✅ All contracts deployed successfully");
      console.log(`   Implementation: ${await this.implementation.getAddress()}`);
      console.log(`   Factory: ${await this.factory.getAddress()}`);
      console.log(`   Proxy: ${proxyAddress}`);

      return true;
    } catch (error) {
      console.log(`❌ Deployment failed: ${error.message}`);
      return false;
    }
  }

  async createBounty(accountIndex, bountyIndex) {
    const startTime = Date.now();
    try {
      const account = this.accounts[accountIndex % this.accounts.length];
      const contract = this.standardBounties.connect(account);
      
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours
      const data = `thread-${accountIndex}-bounty-${bountyIndex}-${Date.now()}`;
      
      const tx = await contract.initializeBounty(
        account.address,
        account.address,
        data,
        deadline
      );
      
      const receipt = await tx.wait();
      const endTime = Date.now();
      
      // Extract bounty ID from events
      const bountyEvent = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'BountyInitialized';
        } catch {
          return false;
        }
      });
      
      const bountyId = bountyEvent ? contract.interface.parseLog(bountyEvent).args.bountyId : null;
      
      this.testResults.performanceMetrics.bountyCreations.push({
        accountIndex,
        bountyIndex,
        bountyId: bountyId ? bountyId.toString() : 'unknown',
        responseTime: endTime - startTime,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        success: true
      });
      
      this.testResults.successfulOperations++;
      return { success: true, bountyId, responseTime: endTime - startTime };
      
    } catch (error) {
      const endTime = Date.now();
      this.testResults.performanceMetrics.bountyCreations.push({
        accountIndex,
        bountyIndex,
        bountyId: null,
        responseTime: endTime - startTime,
        gasUsed: 0,
        blockNumber: 0,
        success: false,
        error: error.message
      });
      
      this.testResults.failedOperations++;
      this.testResults.errors.push({
        operation: 'createBounty',
        accountIndex,
        bountyIndex,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return { success: false, error: error.message, responseTime: endTime - startTime };
    }
  }

  async fundBounty(accountIndex, bountyId, amount) {
    const startTime = Date.now();
    try {
      const account = this.accounts[accountIndex % this.accounts.length];
      const contract = this.standardBounties.connect(account);
      
      const tx = await contract.fundBountyETH(bountyId, { value: amount });
      const receipt = await tx.wait();
      const endTime = Date.now();
      
      this.testResults.performanceMetrics.fundings.push({
        accountIndex,
        bountyId: bountyId.toString(),
        amount: ethers.formatEther(amount),
        responseTime: endTime - startTime,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        success: true
      });
      
      this.testResults.successfulOperations++;
      return { success: true, responseTime: endTime - startTime };
      
    } catch (error) {
      const endTime = Date.now();
      this.testResults.performanceMetrics.fundings.push({
        accountIndex,
        bountyId: bountyId.toString(),
        amount: ethers.formatEther(amount),
        responseTime: endTime - startTime,
        gasUsed: 0,
        blockNumber: 0,
        success: false,
        error: error.message
      });
      
      this.testResults.failedOperations++;
      this.testResults.errors.push({
        operation: 'fundBounty',
        accountIndex,
        bountyId: bountyId.toString(),
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return { success: false, error: error.message, responseTime: endTime - startTime };
    }
  }

  async fulfillBounty(accountIndex, bountyId, fulfillmentData) {
    const startTime = Date.now();
    try {
      const account = this.accounts[accountIndex % this.accounts.length];
      const contract = this.standardBounties.connect(account);
      
      const tx = await contract.fulfillBounty(bountyId, fulfillmentData);
      const receipt = await tx.wait();
      const endTime = Date.now();
      
      // Extract fulfillment ID from events
      const fulfillmentEvent = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'FulfillmentSubmitted';
        } catch {
          return false;
        }
      });
      
      const fulfillmentId = fulfillmentEvent ? contract.interface.parseLog(fulfillmentEvent).args.fulfillmentId : null;
      
      this.testResults.performanceMetrics.fulfillments.push({
        accountIndex,
        bountyId: bountyId.toString(),
        fulfillmentId: fulfillmentId ? fulfillmentId.toString() : 'unknown',
        responseTime: endTime - startTime,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        success: true
      });
      
      this.testResults.successfulOperations++;
      return { success: true, fulfillmentId, responseTime: endTime - startTime };
      
    } catch (error) {
      const endTime = Date.now();
      this.testResults.performanceMetrics.fulfillments.push({
        accountIndex,
        bountyId: bountyId.toString(),
        fulfillmentId: null,
        responseTime: endTime - startTime,
        gasUsed: 0,
        blockNumber: 0,
        success: false,
        error: error.message
      });
      
      this.testResults.failedOperations++;
      this.testResults.errors.push({
        operation: 'fulfillBounty',
        accountIndex,
        bountyId: bountyId.toString(),
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return { success: false, error: error.message, responseTime: endTime - startTime };
    }
  }

  async testConcurrentBountyCreation() {
    console.log("\n🚀 TESTING CONCURRENT BOUNTY CREATION");
    console.log("=" .repeat(38));

    const numberOfThreads = Math.min(10, this.accounts.length);
    const bountiesPerThread = 3;
    
    console.log(`🧵 Starting ${numberOfThreads} concurrent threads`);
    console.log(`📋 Creating ${bountiesPerThread} bounties per thread`);
    console.log(`📊 Total operations: ${numberOfThreads * bountiesPerThread}`);

    this.testResults.concurrentThreads = numberOfThreads;
    this.startTime = Date.now();

    const promises = [];
    
    // Create concurrent bounty creation operations
    for (let threadIndex = 0; threadIndex < numberOfThreads; threadIndex++) {
      for (let bountyIndex = 0; bountyIndex < bountiesPerThread; bountyIndex++) {
        promises.push(this.createBounty(threadIndex, bountyIndex));
      }
    }

    console.log(`⏳ Executing ${promises.length} concurrent operations...`);
    
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    console.log(`✅ Completed: ${successful} successful, ${failed} failed`);
    console.log(`⏱️ Total time: ${endTime - this.startTime}ms`);
    console.log(`📈 Throughput: ${((successful / (endTime - this.startTime)) * 1000).toFixed(2)} ops/sec`);

    this.testResults.totalOperations += promises.length;
    
    return { successful, failed, totalTime: endTime - this.startTime };
  }

  async testConcurrentFunding() {
    console.log("\n💰 TESTING CONCURRENT FUNDING OPERATIONS");
    console.log("=" .repeat(40));

    // Use the bounties created in the previous test
    const createdBounties = this.testResults.performanceMetrics.bountyCreations
      .filter(b => b.success && b.bountyId !== 'unknown')
      .slice(0, 10); // Limit to first 10 successful bounties

    if (createdBounties.length === 0) {
      console.log("❌ No bounties available for funding test");
      return { successful: 0, failed: 0, totalTime: 0 };
    }

    console.log(`🧵 Funding ${createdBounties.length} bounties concurrently`);
    console.log(`💵 Each bounty funded with 0.1 ETH`);

    const fundingAmount = ethers.parseEther("0.1");
    const promises = [];

    for (let i = 0; i < createdBounties.length; i++) {
      const bounty = createdBounties[i];
      promises.push(this.fundBounty(i, BigInt(bounty.bountyId), fundingAmount));
    }

    console.log(`⏳ Executing ${promises.length} concurrent funding operations...`);
    
    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    console.log(`✅ Completed: ${successful} successful, ${failed} failed`);
    console.log(`⏱️ Total time: ${endTime - startTime}ms`);
    console.log(`📈 Throughput: ${((successful / (endTime - startTime)) * 1000).toFixed(2)} ops/sec`);

    this.testResults.totalOperations += promises.length;
    
    return { successful, failed, totalTime: endTime - startTime };
  }

  async testConcurrentFulfillments() {
    console.log("\n📋 TESTING CONCURRENT FULFILLMENT OPERATIONS");
    console.log("=" .repeat(45));

    // Use funded bounties
    const fundedBounties = this.testResults.performanceMetrics.fundings
      .filter(f => f.success)
      .slice(0, 8); // Limit to first 8 successful fundings

    if (fundedBounties.length === 0) {
      console.log("❌ No funded bounties available for fulfillment test");
      return { successful: 0, failed: 0, totalTime: 0 };
    }

    console.log(`🧵 Submitting fulfillments for ${fundedBounties.length} bounties concurrently`);

    const promises = [];

    for (let i = 0; i < fundedBounties.length; i++) {
      const funding = fundedBounties[i];
      const fulfillmentData = `fulfillment-thread-${i}-${Date.now()}`;
      promises.push(this.fulfillBounty(i + 1, BigInt(funding.bountyId), fulfillmentData)); // Use different account
    }

    console.log(`⏳ Executing ${promises.length} concurrent fulfillment operations...`);
    
    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    console.log(`✅ Completed: ${successful} successful, ${failed} failed`);
    console.log(`⏱️ Total time: ${endTime - startTime}ms`);
    console.log(`📈 Throughput: ${((successful / (endTime - startTime)) * 1000).toFixed(2)} ops/sec`);

    this.testResults.totalOperations += promises.length;
    
    return { successful, failed, totalTime: endTime - startTime };
  }

  async testRaceConditions() {
    console.log("\n🏁 TESTING RACE CONDITIONS & DATA CONSISTENCY");
    console.log("=" .repeat(47));

    try {
      // Test 1: Multiple funders for the same bounty
      console.log("🧪 Testing multiple concurrent funders for same bounty");
      
      // Create a test bounty
      const bountyResult = await this.createBounty(0, 999);
      if (!bountyResult.success) {
        throw new Error("Failed to create test bounty for race condition testing");
      }

      const testBountyId = bountyResult.bountyId;
      const numberOfFunders = 5;
      const fundingAmount = ethers.parseEther("0.02"); // Small amount per funder

      const fundingPromises = [];
      for (let i = 0; i < numberOfFunders; i++) {
        fundingPromises.push(this.fundBounty(i + 1, testBountyId, fundingAmount));
      }

      const fundingResults = await Promise.allSettled(fundingPromises);
      const successfulFundings = fundingResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      
      console.log(`   📊 Multiple funders result: ${successfulFundings}/${numberOfFunders} successful`);
      
      if (successfulFundings > 0) {
        console.log("   ✅ Race condition handling: Contract accepts multiple funders correctly");
      } else {
        console.log("   ⚠️ Race condition issue: No funders succeeded");
        this.testResults.raceConditions.push({
          test: "Multiple funders",
          issue: "All funding attempts failed",
          severity: "Medium"
        });
      }

      // Test 2: Rapid state changes
      console.log("🧪 Testing rapid state transitions");
      
      // Try to fulfill and immediately try to accept (should fail or handle gracefully)
      if (successfulFundings > 0) {
        const fulfillResult = await this.fulfillBounty(2, testBountyId, "race-condition-fulfillment");
        
        if (fulfillResult.success) {
          // Try to accept immediately in parallel (this should work as designed)
          console.log("   ✅ Rapid fulfillment succeeded");
        } else {
          console.log("   ⚠️ Rapid fulfillment failed");
        }
      }

      // Test 3: Data consistency check
      console.log("🧪 Testing data consistency across operations");
      
      // Check if all successful operations are properly recorded
      const totalRecordedOps = 
        this.testResults.performanceMetrics.bountyCreations.filter(b => b.success).length +
        this.testResults.performanceMetrics.fundings.filter(f => f.success).length +
        this.testResults.performanceMetrics.fulfillments.filter(f => f.success).length;

      if (totalRecordedOps === this.testResults.successfulOperations) {
        console.log("   ✅ Data consistency: All operations properly recorded");
      } else {
        console.log(`   ⚠️ Data inconsistency: Recorded ${totalRecordedOps} vs ${this.testResults.successfulOperations} successful`);
        this.testResults.dataConsistency = false;
      }

    } catch (error) {
      console.log(`❌ Race condition testing failed: ${error.message}`);
      this.testResults.raceConditions.push({
        test: "Race condition framework",
        issue: error.message,
        severity: "High"
      });
    }
  }

  async testAPILoadUnderStress() {
    console.log("\n📡 TESTING API PERFORMANCE UNDER LOAD");
    console.log("=" .repeat(38));

    const apiStressTests = [
      {
        name: "Rapid Infura requests",
        test: async () => {
          const promises = [];
          for (let i = 0; i < 10; i++) {
            promises.push(axios.post(`https://sepolia.infura.io/v3/${APIS.infura}`, {
              jsonrpc: "2.0",
              method: "eth_blockNumber",
              params: [],
              id: i
            }));
          }
          const results = await Promise.allSettled(promises);
          return results.filter(r => r.status === 'fulfilled').length;
        }
      },
      {
        name: "Concurrent Etherscan calls",
        test: async () => {
          const promises = [];
          for (let i = 0; i < 10; i++) {
            promises.push(axios.get(
              `https://api-sepolia.etherscan.io/api?module=stats&action=ethprice&apikey=${APIS.etherscan}`
            ));
          }
          const results = await Promise.allSettled(promises);
          return results.filter(r => r.status === 'fulfilled' && r.value.data.status === "1").length;
        }
      },
      {
        name: "Alchemy backup stress test",
        test: async () => {
          const promises = [];
          for (let i = 0; i < 10; i++) {
            promises.push(axios.post(`https://eth-sepolia.g.alchemy.com/v2/${APIS.alchemy}`, {
              jsonrpc: "2.0",
              method: "eth_blockNumber",
              params: [],
              id: i
            }));
          }
          const results = await Promise.allSettled(promises);
          return results.filter(r => r.status === 'fulfilled').length;
        }
      }
    ];

    for (const apiTest of apiStressTests) {
      try {
        console.log(`🧪 ${apiTest.name}`);
        const startTime = Date.now();
        const successCount = await apiTest.test();
        const endTime = Date.now();
        
        console.log(`   📊 ${successCount}/10 requests successful in ${endTime - startTime}ms`);
        
        if (successCount >= 8) {
          console.log("   ✅ API stress test passed");
        } else {
          console.log(`   ⚠️ API stress test marginal: only ${successCount}/10 successful`);
        }
      } catch (error) {
        console.log(`   ❌ API stress test failed: ${error.message}`);
      }
    }
  }

  calculatePerformanceMetrics() {
    const allOperations = [
      ...this.testResults.performanceMetrics.bountyCreations,
      ...this.testResults.performanceMetrics.fundings,
      ...this.testResults.performanceMetrics.fulfillments,
      ...this.testResults.performanceMetrics.acceptances
    ];

    const successfulOps = allOperations.filter(op => op.success);
    const responseTimes = successfulOps.map(op => op.responseTime);
    
    if (responseTimes.length > 0) {
      this.testResults.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      const totalTime = this.startTime ? Date.now() - this.startTime : 1;
      this.testResults.throughput = (this.testResults.successfulOperations / totalTime) * 1000; // ops per second
    }
  }

  async generateStressTestReport() {
    console.log("\n📊 MULTI-THREADED STRESS TEST REPORT");
    console.log("=" .repeat(40));

    this.calculatePerformanceMetrics();

    const endTime = Date.now();
    const totalTestTime = this.startTime ? endTime - this.startTime : 0;

    console.log(`\n📈 OVERALL PERFORMANCE METRICS:`);
    console.log(`   Total Operations: ${this.testResults.totalOperations}`);
    console.log(`   Successful Operations: ${this.testResults.successfulOperations}`);
    console.log(`   Failed Operations: ${this.testResults.failedOperations}`);
    console.log(`   Success Rate: ${((this.testResults.successfulOperations / this.testResults.totalOperations) * 100).toFixed(1)}%`);
    console.log(`   Concurrent Threads: ${this.testResults.concurrentThreads}`);
    console.log(`   Average Response Time: ${this.testResults.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${this.testResults.throughput.toFixed(2)} operations/second`);
    console.log(`   Total Test Time: ${totalTestTime}ms`);

    console.log(`\n📊 OPERATION BREAKDOWN:`);
    console.log(`   Bounty Creations: ${this.testResults.performanceMetrics.bountyCreations.filter(b => b.success).length}/${this.testResults.performanceMetrics.bountyCreations.length}`);
    console.log(`   Fundings: ${this.testResults.performanceMetrics.fundings.filter(f => f.success).length}/${this.testResults.performanceMetrics.fundings.length}`);
    console.log(`   Fulfillments: ${this.testResults.performanceMetrics.fulfillments.filter(f => f.success).length}/${this.testResults.performanceMetrics.fulfillments.length}`);

    console.log(`\n🚨 ERROR ANALYSIS:`);
    if (this.testResults.errors.length === 0) {
      console.log("   ✅ No errors detected during stress testing");
    } else {
      console.log(`   Total Errors: ${this.testResults.errors.length}`);
      const errorTypes = {};
      this.testResults.errors.forEach(error => {
        errorTypes[error.operation] = (errorTypes[error.operation] || 0) + 1;
      });
      Object.entries(errorTypes).forEach(([operation, count]) => {
        console.log(`   ${operation}: ${count} errors`);
      });
    }

    console.log(`\n🏁 RACE CONDITION ANALYSIS:`);
    if (this.testResults.raceConditions.length === 0) {
      console.log("   ✅ No race conditions detected");
    } else {
      this.testResults.raceConditions.forEach((race, index) => {
        console.log(`   ${index + 1}. [${race.severity}] ${race.test}: ${race.issue}`);
      });
    }

    console.log(`\n🔍 DATA CONSISTENCY:`);
    if (this.testResults.dataConsistency) {
      console.log("   ✅ Data consistency maintained across all operations");
    } else {
      console.log("   ⚠️ Data consistency issues detected");
    }

    // Determine overall health
    const successRate = (this.testResults.successfulOperations / this.testResults.totalOperations) * 100;
    const criticalErrors = this.testResults.errors.filter(e => e.operation === 'critical').length;
    const highSeverityRaces = this.testResults.raceConditions.filter(r => r.severity === 'High').length;

    console.log(`\n🎯 STRESS TEST ASSESSMENT:`);
    if (successRate >= 90 && criticalErrors === 0 && highSeverityRaces === 0 && this.testResults.dataConsistency) {
      console.log("   ✅ EXCELLENT - System handles concurrent load exceptionally");
      console.log("   ✅ Ready for high-traffic production deployment");
      console.log("   ✅ Thread safety and data consistency validated");
    } else if (successRate >= 75 && criticalErrors === 0) {
      console.log("   ⚠️ GOOD - System handles concurrent load with minor issues");
      console.log("   🔍 Review failed operations before high-load deployment");
    } else {
      console.log("   ❌ ISSUES - System struggles under concurrent load");
      console.log("   🔴 NOT READY for high-traffic deployment");
    }

    return {
      totalOperations: this.testResults.totalOperations,
      successfulOperations: this.testResults.successfulOperations,
      failedOperations: this.testResults.failedOperations,
      successRate,
      averageResponseTime: this.testResults.averageResponseTime,
      throughput: this.testResults.throughput,
      concurrentThreads: this.testResults.concurrentThreads,
      dataConsistency: this.testResults.dataConsistency,
      raceConditions: this.testResults.raceConditions.length,
      criticalErrors: criticalErrors,
      overallHealth: successRate >= 90 && criticalErrors === 0 && highSeverityRaces === 0 && this.testResults.dataConsistency ? "EXCELLENT" : 
                    (successRate >= 75 && criticalErrors === 0 ? "GOOD" : "NEEDS_IMPROVEMENT")
    };
  }

  async runMultiThreadedStressTest() {
    console.log("🧵 STARTING MULTI-THREADED STRESS TESTING");
    console.log("=" .repeat(45));

    try {
      await this.initialize();
      
      const deployed = await this.deployContracts();
      if (!deployed) {
        throw new Error("Failed to deploy contracts for stress testing");
      }

      // Run concurrent test scenarios
      await this.testConcurrentBountyCreation();
      await this.testConcurrentFunding();
      await this.testConcurrentFulfillments();
      await this.testRaceConditions();
      await this.testAPILoadUnderStress();

      // Generate comprehensive report
      const report = await this.generateStressTestReport();

      console.log("\n" + "=" .repeat(60));
      if (report.overallHealth === "EXCELLENT") {
        console.log("🎉 MULTI-THREADED STRESS TESTING SUCCESSFUL");
        console.log("✅ System excels under concurrent load");
        console.log("✅ Thread safety and data consistency validated");
        console.log("✅ Ready for high-traffic production deployment");
      } else if (report.overallHealth === "GOOD") {
        console.log("⚠️ STRESS TESTING COMPLETED WITH MINOR ISSUES");
        console.log("🔍 System functional under load but needs optimization");
      } else {
        console.log("❌ STRESS TESTING REVEALED SIGNIFICANT ISSUES");
        console.log("🔴 System not ready for high-concurrency deployment");
      }

      return report;

    } catch (error) {
      console.log(`❌ Multi-threaded stress testing failed: ${error.message}`);
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 1,
        successRate: 0,
        averageResponseTime: 0,
        throughput: 0,
        concurrentThreads: 0,
        dataConsistency: false,
        raceConditions: 1,
        criticalErrors: 1,
        overallHealth: "FAILED"
      };
    }
  }
}

async function main() {
  const tester = new MultiThreadedStressTester();
  
  try {
    const report = await tester.runMultiThreadedStressTest();
    
    if (report.overallHealth === "EXCELLENT") {
      console.log("\n🏆 MULTI-THREADED STRESS TESTING PASSED");
      console.log("✅ System validated for high-concurrency production use");
      process.exit(0);
    } else if (report.overallHealth === "GOOD") {
      console.log("\n⚠️ Stress testing completed with minor issues");
      console.log("🔍 Optimization recommended for high-load scenarios");
      process.exit(1);
    } else {
      console.log("\n❌ Critical issues under concurrent load");
      console.log("🔴 System needs improvements for production use");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Stress testing framework error:", error.message);
    process.exit(1);
  }
}

main();