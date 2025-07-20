const { ethers } = require("hardhat");

async function main() {
    console.log("Account Balance Check - StandardBounties");
    console.log("=" .repeat(40));
    
    const [deployer, ...otherAccounts] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log("Network:", network.name, "- Chain ID:", network.chainId);
    console.log("Checking balances for deployment accounts...\n");
    
    // Check deployer balance
    console.log("📊 Primary Deployer Account:");
    console.log("Address:", deployer.address);
    
    const deployerBalance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(deployerBalance), "ETH");
    
    // Calculate minimum required balance
    const estimatedGasUsage = {
        implementation: 1226782n,
        factory: 787570n,
        proxy: 253842n,
        testing: 500000n  // Additional gas for testing
    };
    
    const totalEstimatedGas = Object.values(estimatedGasUsage).reduce((sum, gas) => sum + gas, 0n);
    
    // Get current gas price
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits("20", "gwei");
    
    const estimatedCost = totalEstimatedGas * gasPrice;
    const recommendedBalance = estimatedCost * 150n / 100n; // 50% buffer
    
    console.log("\n💰 Cost Analysis:");
    console.log("Estimated gas needed:", totalEstimatedGas.toLocaleString());
    console.log("Current gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("Estimated cost:", ethers.formatEther(estimatedCost), "ETH");
    console.log("Recommended balance:", ethers.formatEther(recommendedBalance), "ETH");
    
    // Balance assessment
    console.log("\n✅ Balance Assessment:");
    if (deployerBalance >= recommendedBalance) {
        console.log("Status: ✅ Sufficient balance for deployment");
        console.log("Excess balance:", ethers.formatEther(deployerBalance - recommendedBalance), "ETH");
    } else if (deployerBalance >= estimatedCost) {
        console.log("Status: ⚠️ Minimal balance - deployment possible but risky");
        console.log("Additional recommended:", ethers.formatEther(recommendedBalance - deployerBalance), "ETH");
    } else {
        console.log("Status: ❌ Insufficient balance for deployment");
        console.log("Additional required:", ethers.formatEther(estimatedCost - deployerBalance), "ETH");
    }
    
    // Check other accounts
    if (otherAccounts.length > 0) {
        console.log("\n👥 Additional Accounts:");
        for (let i = 0; i < Math.min(otherAccounts.length, 5); i++) {
            const account = otherAccounts[i];
            const balance = await ethers.provider.getBalance(account.address);
            console.log(`Account ${i + 1}:`, account.address);
            console.log(`Balance:   `, ethers.formatEther(balance), "ETH");
        }
    }
    
    // Network-specific guidance
    console.log("\n🌐 Network-Specific Guidance:");
    if (network.chainId === 1n) {
        console.log("Ethereum Mainnet:");
        console.log("- Consider high gas prices during peak hours");
        console.log("- Monitor network congestion before deployment");
        console.log("- Use gas estimation tools for better pricing");
    } else if (network.chainId === 11155111n) {
        console.log("Sepolia Testnet:");
        console.log("- Use faucet to obtain test ETH if needed");
        console.log("- Test deployment here before mainnet");
        console.log("- Gas prices are generally lower");
    } else if (network.chainId === 137n) {
        console.log("Polygon Mainnet:");
        console.log("- Use MATIC for gas fees");
        console.log("- Generally lower costs than Ethereum");
        console.log("- Faster confirmation times");
    } else {
        console.log("Network:", network.name);
        console.log("- Verify native token for gas fees");
        console.log("- Check network-specific requirements");
    }
    
    return {
        sufficientBalance: deployerBalance >= estimatedCost,
        recommendedBalance: deployerBalance >= recommendedBalance,
        currentBalance: ethers.formatEther(deployerBalance),
        estimatedCost: ethers.formatEther(estimatedCost),
        shortfall: deployerBalance < estimatedCost ? ethers.formatEther(estimatedCost - deployerBalance) : "0"
    };
}

main()
    .then((result) => {
        console.log("\n" + "=" .repeat(40));
        if (result.recommendedBalance) {
            console.log("✅ Balance check passed - Ready for deployment");
            process.exit(0);
        } else if (result.sufficientBalance) {
            console.log("⚠️ Balance check passed with warnings");
            process.exit(0);
        } else {
            console.log("❌ Balance check failed - Insufficient funds");
            console.log("Add", result.shortfall, "ETH to proceed");
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error("Balance check failed:", error);
        process.exit(1);
    });