const { ethers } = require("hardhat");
const axios = require("axios");

async function main() {
    console.log("Gas Price Monitoring - StandardBounties");
    console.log("=" .repeat(40));
    
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "- Chain ID:", network.chainId);
    
    try {
        // Get current network gas data
        const feeData = await ethers.provider.getFeeData();
        
        console.log("\n📊 Current Network Gas Data:");
        if (feeData.gasPrice) {
            console.log("Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
        }
        if (feeData.maxFeePerGas) {
            console.log("Max Fee Per Gas:", ethers.formatUnits(feeData.maxFeePerGas, "gwei"), "gwei");
        }
        if (feeData.maxPriorityFeePerGas) {
            console.log("Max Priority Fee:", ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), "gwei");
        }
        
        // Get current block
        const block = await ethers.provider.getBlock("latest");
        console.log("\n🔗 Current Block Info:");
        console.log("Block Number:", block.number);
        console.log("Block Gas Limit:", block.gasLimit.toLocaleString());
        console.log("Block Gas Used:", block.gasUsed.toLocaleString());
        console.log("Block Utilization:", ((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2) + "%");
        
        // Calculate deployment costs
        console.log("\n💰 Estimated Deployment Costs:");
        const deploymentGas = {
            implementation: 1226782n,
            factory: 787570n,
            proxy: 253842n
        };
        
        Object.entries(deploymentGas).forEach(([contract, gas]) => {
            const cost = gas * feeData.gasPrice;
            console.log(`${contract}:`.padEnd(15), `${gas.toLocaleString()} gas`.padEnd(15), `${ethers.formatEther(cost)} ETH`);
        });
        
        const totalGas = Object.values(deploymentGas).reduce((sum, gas) => sum + gas, 0n);
        const totalCost = totalGas * feeData.gasPrice;
        console.log("TOTAL:".padEnd(15), `${totalGas.toLocaleString()} gas`.padEnd(15), `${ethers.formatEther(totalCost)} ETH`);
        
        // Gas price recommendations
        console.log("\n⚡ Gas Price Recommendations:");
        const baseGas = feeData.gasPrice;
        const slowGas = baseGas * 80n / 100n;
        const fastGas = baseGas * 120n / 100n;
        
        console.log("Slow (80%):   ", ethers.formatUnits(slowGas, "gwei"), "gwei");
        console.log("Standard:     ", ethers.formatUnits(baseGas, "gwei"), "gwei");
        console.log("Fast (120%):  ", ethers.formatUnits(fastGas, "gwei"), "gwei");
        
        // Network status assessment
        const utilizationPercent = (Number(block.gasUsed) / Number(block.gasLimit)) * 100;
        console.log("\n🚦 Network Status:");
        if (utilizationPercent < 50) {
            console.log("Status: ✅ Low congestion - Good time to deploy");
        } else if (utilizationPercent < 80) {
            console.log("Status: ⚠️ Moderate congestion - Consider waiting");
        } else {
            console.log("Status: 🔴 High congestion - Wait for better conditions");
        }
        
        return {
            gasPrice: feeData.gasPrice.toString(),
            blockUtilization: utilizationPercent,
            totalDeploymentCost: ethers.formatEther(totalCost),
            recommendation: utilizationPercent < 50 ? "DEPLOY" : utilizationPercent < 80 ? "WAIT" : "DELAY"
        };
        
    } catch (error) {
        console.error("❌ Failed to fetch gas data:", error.message);
        return null;
    }
}

main()
    .then((result) => {
        if (result) {
            console.log("\n✅ Gas price check completed");
            process.exit(0);
        } else {
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error("Gas price check failed:", error);
        process.exit(1);
    });