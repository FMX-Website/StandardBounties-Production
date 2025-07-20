const { ethers } = require("hardhat");

async function main() {
  console.log("FINAL GAS PERFORMANCE VALIDATION");
  console.log("================================");
  
  const [deployer] = await ethers.getSigners();
  
  // Deploy implementation
  const Implementation = await ethers.getContractFactory("StandardBountiesImplementation");
  const implementation = await Implementation.deploy();
  await implementation.waitForDeployment();
  
  // Test proxy deployment gas
  const Proxy = await ethers.getContractFactory("StandardBountiesProxy");
  const deploymentTx = await Proxy.getDeployTransaction(await implementation.getAddress());
  const gas = await ethers.provider.estimateGas(deploymentTx);
  
  console.log("\nPROXY DEPLOYMENT RESULTS:");
  console.log("Target gas limit:    500,000");
  console.log("Actual gas used:     " + gas.toString());
  console.log("Under target:        " + (gas <= 500000n ? "✓ YES" : "✗ NO"));
  console.log("Utilization:         " + ((Number(gas) / 500000) * 100).toFixed(1) + "%");
  console.log("Remaining budget:    " + (500000n - gas).toString());
  
  if (gas <= 500000n) {
    console.log("\n🎉 SUCCESS: PRIMARY OBJECTIVE ACHIEVED");
    console.log("StandardBounties proxy deployment under 500k gas!");
  } else {
    console.log("\n❌ Target not met");
  }
  
  return gas <= 500000n;
}

main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });