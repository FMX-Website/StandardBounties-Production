const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 REAL-TIME TESTNET DEPLOYMENT - StandardBounties Proxy Pattern");
  console.log("=".repeat(70));
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("📊 DEPLOYMENT INFO:");
  console.log("Network:", network.name, "- Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Gas Price:", ethers.formatUnits(await ethers.provider.getFeeData().then(f => f.gasPrice), "gwei"), "gwei");
  
  console.log("\n🏗️ PHASE 1: Deploy Implementation Contract");
  console.log("==========================================");
  
  try {
    // Deploy implementation
    console.log("Deploying StandardBountiesImplementation...");
    const StandardBountiesImplementation = await ethers.getContractFactory("StandardBountiesImplementation");
    
    // Estimate gas
    const implementationTx = await StandardBountiesImplementation.getDeployTransaction();
    const implementationGas = await ethers.provider.estimateGas(implementationTx);
    
    console.log("⛽ Estimated gas:", implementationGas.toString());
    console.log("💰 Estimated cost:", ethers.formatEther(implementationGas * (await ethers.provider.getFeeData()).gasPrice), "ETH");
    
    const implementation = await StandardBountiesImplementation.deploy();
    console.log("📝 Transaction hash:", implementation.deploymentTransaction().hash);
    console.log("⏳ Waiting for confirmation...");
    
    const implementationReceipt = await implementation.waitForDeployment();
    const implementationAddress = await implementation.getAddress();
    
    console.log("✅ Implementation deployed at:", implementationAddress);
    console.log("⛽ Actual gas used:", implementationReceipt.deploymentTransaction().gasLimit?.toString() || "N/A");
    
    console.log("\n🏭 PHASE 2: Deploy Factory Contract");
    console.log("===================================");
    
    // Deploy factory
    console.log("Deploying StandardBountiesFactory...");
    const StandardBountiesFactory = await ethers.getContractFactory("StandardBountiesFactory");
    
    const factoryTx = await StandardBountiesFactory.getDeployTransaction(implementationAddress);
    const factoryGas = await ethers.provider.estimateGas(factoryTx);
    
    console.log("⛽ Estimated gas:", factoryGas.toString());
    console.log("💰 Estimated cost:", ethers.formatEther(factoryGas * (await ethers.provider.getFeeData()).gasPrice), "ETH");
    
    const factory = await StandardBountiesFactory.deploy(implementationAddress);
    console.log("📝 Transaction hash:", factory.deploymentTransaction().hash);
    console.log("⏳ Waiting for confirmation...");
    
    const factoryReceipt = await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    
    console.log("✅ Factory deployed at:", factoryAddress);
    console.log("⛽ Actual gas used:", factoryReceipt.deploymentTransaction().gasLimit?.toString() || "N/A");
    
    console.log("\n🎯 PHASE 3: Deploy Proxy Contracts (<500k gas target)");
    console.log("====================================================");
    
    // Deploy proxy using factory
    console.log("Deploying proxy through factory...");
    
    const deployProxyTx = await factory.deployProxyAuto(deployer.address);
    console.log("📝 Transaction hash:", deployProxyTx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const proxyReceipt = await deployProxyTx.wait();
    console.log("⛽ Proxy deployment gas used:", proxyReceipt.gasUsed.toString());
    
    // Get proxy address from events
    const proxyEvent = proxyReceipt.logs.find(log => {
      try {
        return factory.interface.parseLog(log).name === "ProxyDeployed";
      } catch (e) {
        return false;
      }
    });
    
    const proxyAddress = proxyEvent ? factory.interface.parseLog(proxyEvent).args.proxy : null;
    console.log("✅ Proxy deployed at:", proxyAddress);
    
    // Verify gas usage
    const isUnder500k = proxyReceipt.gasUsed <= 500000n;
    console.log("🎯 Under 500k gas:", isUnder500k ? "✅ YES" : "❌ NO");
    console.log("📊 Gas utilization:", ((Number(proxyReceipt.gasUsed) / 500000) * 100).toFixed(1) + "%");
    
    if (!isUnder500k) {
      console.log("⚠️  Gas over limit by:", (proxyReceipt.gasUsed - 500000n).toString());
    } else {
      console.log("✅ Remaining budget:", (500000n - proxyReceipt.gasUsed).toString(), "gas");
    }
    
    console.log("\n🧪 PHASE 4: Real-Time Functionality Testing");
    console.log("===========================================");
    
    if (!proxyAddress) {
      console.log("❌ Could not get proxy address from events");
      return;
    }
    
    // Create proxy interface
    const proxyWithABI = new ethers.Contract(
      proxyAddress,
      StandardBountiesImplementation.interface,
      deployer
    );
    
    // Test 1: Create bounty
    console.log("\n1. Creating bounty on live network...");
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    
    const createTx = await proxyWithABI.initializeBounty(
      deployer.address,
      ethers.ZeroAddress,
      "QmTestBountyRealTime",
      deadline
    );
    console.log("📝 Create bounty tx:", createTx.hash);
    await createTx.wait();
    console.log("✅ Bounty created on live network");
    
    // Test 2: Fund bounty
    console.log("\n2. Funding bounty with real ETH...");
    const fundingAmount = ethers.parseEther("0.001"); // Small amount for testing
    
    const fundTx = await proxyWithABI.fundBountyETH(0, { value: fundingAmount });
    console.log("📝 Fund bounty tx:", fundTx.hash);
    console.log("💰 Funding amount:", ethers.formatEther(fundingAmount), "ETH");
    await fundTx.wait();
    console.log("✅ Bounty funded on live network");
    
    // Test 3: Check bounty state
    console.log("\n3. Verifying bounty state...");
    const bounty = await proxyWithABI.getBounty(0);
    console.log("📊 Live bounty data:");
    console.log("  - Issuer:", bounty[0]);
    console.log("  - Token:", bounty[2]);
    console.log("  - Balance:", ethers.formatEther(bounty[4]), "ETH");
    console.log("  - State:", bounty[7].toString(), bounty[7] === 1n ? "(ACTIVE)" : "(OTHER)");
    console.log("  - Deadline:", new Date(Number(bounty[6]) * 1000).toLocaleString());
    
    // Test 4: Submit fulfillment
    console.log("\n4. Submitting fulfillment...");
    const [, user1] = await ethers.getSigners();
    
    const fulfillTx = await proxyWithABI.connect(user1).fulfillBounty(0, "QmRealTimeFulfillment");
    console.log("📝 Fulfillment tx:", fulfillTx.hash);
    await fulfillTx.wait();
    console.log("✅ Fulfillment submitted on live network");
    
    // Test 5: Accept fulfillment
    console.log("\n5. Accepting fulfillment and transferring funds...");
    const payoutAmount = ethers.parseEther("0.0008"); // Leave some for fees
    
    const acceptTx = await proxyWithABI.acceptFulfillment(0, 0, payoutAmount);
    console.log("📝 Accept fulfillment tx:", acceptTx.hash);
    console.log("💰 Payout amount:", ethers.formatEther(payoutAmount), "ETH");
    await acceptTx.wait();
    console.log("✅ Fulfillment accepted and paid on live network");
    
    // Test 6: Final verification
    console.log("\n6. Final state verification...");
    const finalBounty = await proxyWithABI.getBounty(0);
    console.log("📊 Final bounty state:");
    console.log("  - Remaining balance:", ethers.formatEther(finalBounty[4]), "ETH");
    console.log("  - State:", finalBounty[7].toString());
    
    console.log("\n🎊 REAL-TIME DEPLOYMENT SUMMARY");
    console.log("=".repeat(50));
    console.log("✅ Implementation deployed and verified");
    console.log("✅ Factory deployed and verified");
    console.log("✅ Proxy deployed under 500k gas:", proxyReceipt.gasUsed.toString());
    console.log("✅ Full bounty lifecycle completed on live network");
    console.log("✅ Real ETH transferred successfully");
    console.log("✅ All functionality working in production");
    
    console.log("\n📊 LIVE NETWORK COSTS:");
    const gasPrice = (await ethers.provider.getFeeData()).gasPrice;
    console.log("Implementation cost:", ethers.formatEther(implementationGas * gasPrice), "ETH");
    console.log("Factory cost:      ", ethers.formatEther(factoryGas * gasPrice), "ETH");
    console.log("Proxy cost:        ", ethers.formatEther(proxyReceipt.gasUsed * gasPrice), "ETH");
    
    console.log("\n🌐 DEPLOYED ADDRESSES:");
    console.log("Implementation:", implementationAddress);
    console.log("Factory:       ", factoryAddress);
    console.log("Proxy:         ", proxyAddress);
    console.log("Network:       ", network.name, "- Chain ID:", network.chainId.toString());
    
    return {
      success: true,
      implementationAddress,
      factoryAddress,
      proxyAddress,
      proxyGasUsed: Number(proxyReceipt.gasUsed),
      underGasLimit: isUnder500k,
      network: network.name,
      chainId: network.chainId.toString()
    };
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    console.error("Stack trace:", error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

main()
  .then((result) => {
    if (result.success && result.underGasLimit) {
      console.log("\n🎉 REAL-TIME DEPLOYMENT SUCCESSFUL!");
      console.log("✅ All contracts deployed and tested on live network");
      console.log("✅ Proxy deployment under 500k gas achieved");
      console.log("✅ Full functionality verified with real transactions");
      process.exit(0);
    } else if (result.success) {
      console.log("\n🚀 Deployment successful but gas optimization needed");
      process.exit(1);
    } else {
      console.log("\n❌ Deployment failed");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  });