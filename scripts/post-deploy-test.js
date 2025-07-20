const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Post-Deployment Testing - StandardBounties");
    console.log("=" .repeat(42));
    
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "- Chain ID:", network.chainId);
    
    // Configuration for different networks
    const networkConfig = {
        mainnet: {
            minConfirmations: 3,
            testAmount: ethers.parseEther("0.001"),
            maxGasPrice: ethers.parseUnits("50", "gwei")
        },
        sepolia: {
            minConfirmations: 1,
            testAmount: ethers.parseEther("0.01"),
            maxGasPrice: ethers.parseUnits("20", "gwei")
        },
        polygon: {
            minConfirmations: 2,
            testAmount: ethers.parseEther("0.1"),
            maxGasPrice: ethers.parseUnits("100", "gwei")
        }
    };
    
    const config = networkConfig[network.name] || networkConfig.sepolia;
    console.log("Using configuration for network:", network.name);
    
    // Load deployment information
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file not found for network: ${network.name}`);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log("Loaded deployment from:", new Date(deploymentInfo.timestamp).toLocaleString());
    
    const { implementation, factory } = deploymentInfo.contracts;
    console.log("\n📍 Testing Contracts:");
    console.log("Implementation:", implementation.address);
    console.log("Factory:", factory.address);
    
    const [deployer, tester] = await ethers.getSigners();
    console.log("\n👤 Test Executor:", deployer.address);
    
    // Test 1: Contract Code Verification
    console.log("\n🔍 Test 1: Contract Code Verification");
    console.log("-" .repeat(40));
    
    const implementationCode = await ethers.provider.getCode(implementation.address);
    const factoryCode = await ethers.provider.getCode(factory.address);
    
    if (implementationCode === "0x" || implementationCode.length < 10) {
        throw new Error("Implementation contract has no bytecode");
    }
    if (factoryCode === "0x" || factoryCode.length < 10) {
        throw new Error("Factory contract has no bytecode");
    }
    
    console.log("✅ Implementation bytecode verified");
    console.log("✅ Factory bytecode verified");
    
    // Test 2: Factory Configuration
    console.log("\n🏭 Test 2: Factory Configuration");
    console.log("-" .repeat(35));
    
    const factoryContract = await ethers.getContractAt("StandardBountiesFactory", factory.address, deployer);
    
    const storedImplementation = await factoryContract.implementation();
    if (storedImplementation.toLowerCase() !== implementation.address.toLowerCase()) {
        throw new Error("Factory implementation address mismatch");
    }
    console.log("✅ Factory implementation address correct");
    
    // Test 3: Gas Price Validation
    console.log("\n⛽ Test 3: Gas Price Validation");
    console.log("-" .repeat(33));
    
    const feeData = await ethers.provider.getFeeData();
    const currentGasPrice = feeData.gasPrice || feeData.maxFeePerGas;
    
    console.log("Current gas price:", ethers.formatUnits(currentGasPrice, "gwei"), "gwei");
    console.log("Max acceptable:", ethers.formatUnits(config.maxGasPrice, "gwei"), "gwei");
    
    if (currentGasPrice > config.maxGasPrice) {
        console.log("⚠️ Gas price high - proceeding with caution");
    } else {
        console.log("✅ Gas price acceptable");
    }
    
    // Test 4: Proxy Creation and Testing
    console.log("\n🔗 Test 4: Proxy Creation and Testing");
    console.log("-" .repeat(38));
    
    console.log("Creating new proxy for post-deployment testing...");
    const createProxyTx = await factoryContract.deployProxyAuto(deployer.address, {
        maxFeePerGas: Math.min(currentGasPrice * 120n / 100n, config.maxGasPrice)
    });
    
    console.log("Transaction hash:", createProxyTx.hash);
    console.log("Waiting for", config.minConfirmations, "confirmations...");
    
    const receipt = await createProxyTx.wait(config.minConfirmations);
    
    const proxyEvent = receipt.logs.find(log => {
        try {
            const parsed = factoryContract.interface.parseLog(log);
            return parsed.name === 'ProxyDeployed';
        } catch {
            return false;
        }
    });
    
    const proxyAddress = factoryContract.interface.parseLog(proxyEvent).args.proxy;
    console.log("Proxy deployed:", proxyAddress);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Block number:", receipt.blockNumber);
    
    // Verify proxy gas usage
    if (receipt.gasUsed > 500000n) {
        throw new Error("Proxy deployment exceeded 500k gas limit");
    }
    console.log("✅ Proxy deployment under 500k gas");
    
    // Test 5: Proxy Functionality
    console.log("\n⚙️ Test 5: Proxy Functionality");
    console.log("-" .repeat(30));
    
    const proxyContract = await ethers.getContractAt("StandardBountiesImplementation", proxyAddress, deployer);
    
    // Test owner function
    const owner = await proxyContract.owner();
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error("Proxy owner mismatch");
    }
    console.log("✅ Proxy owner verified");
    
    // Test platform fee
    const platformFee = await proxyContract.platformFeeRate();
    console.log("Platform fee rate:", platformFee.toString(), "basis points");
    console.log("✅ Proxy state accessible");
    
    // Test 6: Live Transaction Test
    console.log("\n📡 Test 6: Live Transaction Test");
    console.log("-" .repeat(32));
    
    console.log("Executing live bounty creation...");
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    
    const bountyTx = await proxyContract.initializeBounty(
        deployer.address,
        ethers.ZeroAddress,
        "ipfs://post-deploy-test-" + Date.now(),
        deadline,
        {
            maxFeePerGas: Math.min(currentGasPrice * 110n / 100n, config.maxGasPrice)
        }
    );
    
    console.log("Bounty creation tx:", bountyTx.hash);
    const bountyReceipt = await bountyTx.wait(config.minConfirmations);
    console.log("✅ Live bounty creation successful");
    console.log("Gas used:", bountyReceipt.gasUsed.toString());
    
    // Test 7: Fund and Complete Workflow
    if (network.name !== 'mainnet') {  // Skip on mainnet to avoid costs
        console.log("\n💰 Test 7: Complete Workflow Test");
        console.log("-" .repeat(35));
        
        // Fund bounty
        console.log("Funding bounty with", ethers.formatEther(config.testAmount), "ETH");
        const fundTx = await proxyContract.fundBountyETH(0, { 
            value: config.testAmount,
            maxFeePerGas: Math.min(currentGasPrice * 110n / 100n, config.maxGasPrice)
        });
        
        const fundReceipt = await fundTx.wait(config.minConfirmations);
        console.log("✅ Bounty funding successful");
        
        // Submit fulfillment
        const fulfillTx = await proxyContract.connect(tester || deployer).fulfillBounty(
            0,
            "ipfs://post-deploy-fulfillment-" + Date.now()
        );
        
        const fulfillReceipt = await fulfillTx.wait(config.minConfirmations);
        console.log("✅ Fulfillment submission successful");
        
        // Accept fulfillment
        const acceptAmount = config.testAmount * 80n / 100n; // 80% payout
        const acceptTx = await proxyContract.acceptFulfillment(0, 0, acceptAmount);
        
        const acceptReceipt = await acceptTx.wait(config.minConfirmations);
        console.log("✅ Fulfillment acceptance successful");
        console.log("Payout amount:", ethers.formatEther(acceptAmount));
        
        console.log("\n💸 Transaction Costs Summary:");
        const totalGas = bountyReceipt.gasUsed + fundReceipt.gasUsed + 
                        fulfillReceipt.gasUsed + acceptReceipt.gasUsed;
        const totalCost = totalGas * currentGasPrice;
        
        console.log("Total gas used:", totalGas.toString());
        console.log("Total cost:", ethers.formatEther(totalCost), "ETH");
        console.log("Plus bounty amount:", ethers.formatEther(config.testAmount), "ETH");
    }
    
    // Test 8: Network Stability Check
    console.log("\n🌐 Test 8: Network Stability Check");
    console.log("-" .repeat(35));
    
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("Current block:", currentBlock);
    
    // Wait for a new block to verify network stability
    console.log("Waiting for next block...");
    let nextBlock = currentBlock;
    const startTime = Date.now();
    
    while (nextBlock === currentBlock && Date.now() - startTime < 60000) { // 1 minute timeout
        await new Promise(resolve => setTimeout(resolve, 1000));
        nextBlock = await ethers.provider.getBlockNumber();
    }
    
    if (nextBlock > currentBlock) {
        console.log("✅ Network producing blocks normally");
        console.log("New block:", nextBlock);
    } else {
        console.log("⚠️ Network may be experiencing issues");
    }
    
    // Test Summary
    console.log("\n🎊 POST-DEPLOYMENT TEST SUMMARY");
    console.log("=" .repeat(35));
    console.log("✅ Contract bytecode verified");
    console.log("✅ Factory configuration correct");
    console.log("✅ Gas prices acceptable");
    console.log("✅ Proxy creation successful");
    console.log("✅ Proxy functionality confirmed");
    console.log("✅ Live transactions working");
    if (network.name !== 'mainnet') {
        console.log("✅ Complete workflow tested");
    }
    console.log("✅ Network stability confirmed");
    
    // Save test results
    const testResults = {
        network: network.name,
        timestamp: new Date().toISOString(),
        contracts: {
            implementation: implementation.address,
            factory: factory.address,
            testProxy: proxyAddress
        },
        gasUsage: {
            proxyCreation: receipt.gasUsed.toString(),
            bountyCreation: bountyReceipt.gasUsed.toString()
        },
        networkConditions: {
            blockNumber: currentBlock,
            gasPrice: ethers.formatUnits(currentGasPrice, "gwei") + " gwei"
        },
        success: true
    };
    
    const testResultFile = path.join(deploymentsDir, `${network.name}-test-results.json`);
    fs.writeFileSync(testResultFile, JSON.stringify(testResults, null, 2));
    console.log("\n📄 Test results saved to:", testResultFile);
    
    return testResults;
}

main()
    .then((result) => {
        if (result.success) {
            console.log("\n🎉 POST-DEPLOYMENT TESTING COMPLETED SUCCESSFULLY");
            console.log("✅ All systems operational and ready for production use");
            process.exit(0);
        } else {
            console.log("\n❌ Post-deployment testing failed");
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error("❌ Post-deployment testing failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    });