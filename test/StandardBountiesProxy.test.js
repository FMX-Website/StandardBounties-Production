const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

async function deployStandardBountiesFixture() {
  const [owner, issuer, fulfiller, arbiter, funder] = await ethers.getSigners();
  
  // Deploy implementation
  const StandardBountiesImplementation = await ethers.getContractFactory("StandardBountiesImplementation");
  const implementation = await StandardBountiesImplementation.deploy();
  await implementation.waitForDeployment();
  
  // Deploy factory
  const StandardBountiesFactory = await ethers.getContractFactory("StandardBountiesFactory");
  const factory = await StandardBountiesFactory.deploy(await implementation.getAddress());
  await factory.waitForDeployment();
  
  // Deploy proxy
  const StandardBountiesProxy = await ethers.getContractFactory("StandardBountiesProxy");
  const proxy = await StandardBountiesProxy.deploy(await implementation.getAddress());
  await proxy.waitForDeployment();
  
  // Initialize proxy
  await proxy.initialize(owner.address);
  
  // Create proxy interface with implementation ABI
  const standardBounties = new ethers.Contract(
    await proxy.getAddress(),
    StandardBountiesImplementation.interface,
    owner
  );
  
  // Deploy test ERC20 token
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("Test Token", "TEST", ethers.parseEther("1000"));
  await token.waitForDeployment();
  
  return {
    standardBounties,
    implementation,
    factory,
    proxy,
    token,
    owner,
    issuer,
    fulfiller,
    arbiter,
    funder
  };
}

describe("StandardBounties Proxy System", function () {
  describe("Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      const { standardBounties, implementation, factory, proxy } = await loadFixture(deployStandardBountiesFixture);
      
      expect(await implementation.getAddress()).to.be.properAddress;
      expect(await factory.getAddress()).to.be.properAddress;
      expect(await proxy.getAddress()).to.be.properAddress;
      expect(await standardBounties.getAddress()).to.be.properAddress;
    });
    
    it("Should set the right owner", async function () {
      const { standardBounties, owner } = await loadFixture(deployStandardBountiesFixture);
      expect(await standardBounties.owner()).to.equal(owner.address);
    });
    
    it("Should have initial bounty count of 0", async function () {
      const { standardBounties } = await loadFixture(deployStandardBountiesFixture);
      expect(await standardBounties.bountyCount()).to.equal(0);
    });
    
    it("Should have default platform fee rate", async function () {
      const { standardBounties } = await loadFixture(deployStandardBountiesFixture);
      expect(await standardBounties.platformFeeRate()).to.equal(250); // 2.5%
    });
  });
  
  describe("Gas Usage Validation", function () {
    it("Should deploy proxy under 500k gas", async function () {
      const [deployer] = await ethers.getSigners();
      
      // Deploy implementation first
      const StandardBountiesImplementation = await ethers.getContractFactory("StandardBountiesImplementation");
      const implementation = await StandardBountiesImplementation.deploy();
      await implementation.waitForDeployment();
      
      // Test proxy deployment gas
      const StandardBountiesProxy = await ethers.getContractFactory("StandardBountiesProxy");
      const deploymentTx = await StandardBountiesProxy.getDeployTransaction(await implementation.getAddress());
      const estimatedGas = await ethers.provider.estimateGas(deploymentTx);
      
      expect(estimatedGas).to.be.lessThan(500000);
      console.log(`      Proxy deployment gas: ${estimatedGas.toString()}`);
    });
    
    it("Should deploy factory under reasonable gas limit", async function () {
      const [deployer] = await ethers.getSigners();
      
      // Deploy implementation first
      const StandardBountiesImplementation = await ethers.getContractFactory("StandardBountiesImplementation");
      const implementation = await StandardBountiesImplementation.deploy();
      await implementation.waitForDeployment();
      
      // Test factory deployment gas
      const StandardBountiesFactory = await ethers.getContractFactory("StandardBountiesFactory");
      const deploymentTx = await StandardBountiesFactory.getDeployTransaction(await implementation.getAddress());
      const estimatedGas = await ethers.provider.estimateGas(deploymentTx);
      
      expect(estimatedGas).to.be.lessThan(1000000);
      console.log(`      Factory deployment gas: ${estimatedGas.toString()}`);
    });
  });
  
  describe("Bounty Lifecycle", function () {
    it("Should create bounty successfully", async function () {
      const { standardBounties, issuer } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      const tx = await standardBounties.initializeBounty(
        issuer.address,
        ethers.ZeroAddress,
        "QmTestBounty",
        deadline
      );
      
      await expect(tx).to.emit(standardBounties, "BountyInitialized");
      expect(await standardBounties.bountyCount()).to.equal(1);
    });
    
    it("Should fund bounty with ETH", async function () {
      const { standardBounties, issuer, funder } = await loadFixture(deployStandardBountiesFixture);
      
      // Create bounty
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await standardBounties.initializeBounty(
        issuer.address,
        ethers.ZeroAddress,
        "QmTestBounty",
        deadline
      );
      
      // Fund bounty
      const fundingAmount = ethers.parseEther("0.1");
      const tx = await standardBounties.connect(funder).fundBountyETH(0, { value: fundingAmount });
      
      await expect(tx).to.emit(standardBounties, "BountyFunded");
      
      const bounty = await standardBounties.getBounty(0);
      expect(bounty[4]).to.equal(fundingAmount); // balance
      expect(bounty[7]).to.equal(1); // state should be ACTIVE
    });
    
    it("Should allow fulfillment submission", async function () {
      const { standardBounties, issuer, fulfiller, funder } = await loadFixture(deployStandardBountiesFixture);
      
      // Create and fund bounty
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await standardBounties.initializeBounty(
        issuer.address,
        ethers.ZeroAddress,
        "QmTestBounty",
        deadline
      );
      
      await standardBounties.connect(funder).fundBountyETH(0, { value: ethers.parseEther("0.1") });
      
      // Submit fulfillment
      const tx = await standardBounties.connect(fulfiller).fulfillBounty(0, "QmFulfillment");
      
      await expect(tx).to.emit(standardBounties, "FulfillmentSubmitted");
    });
    
    it("Should accept fulfillment and transfer payment", async function () {
      const { standardBounties, issuer, fulfiller, funder } = await loadFixture(deployStandardBountiesFixture);
      
      // Create, fund, and fulfill bounty
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await standardBounties.initializeBounty(
        issuer.address,
        ethers.ZeroAddress,
        "QmTestBounty",
        deadline
      );
      
      const fundingAmount = ethers.parseEther("0.1");
      await standardBounties.connect(funder).fundBountyETH(0, { value: fundingAmount });
      await standardBounties.connect(fulfiller).fulfillBounty(0, "QmFulfillment");
      
      // Accept fulfillment
      const paymentAmount = ethers.parseEther("0.08");
      const fulfillerBalanceBefore = await ethers.provider.getBalance(fulfiller.address);
      
      const tx = await standardBounties.connect(issuer).acceptFulfillment(0, 0, paymentAmount);
      await expect(tx).to.emit(standardBounties, "FulfillmentAccepted");
      
      // Check fulfiller received payment (accounting for gas costs)
      const fulfillerBalanceAfter = await ethers.provider.getBalance(fulfiller.address);
      expect(fulfillerBalanceAfter).to.be.greaterThan(fulfillerBalanceBefore);
    });
  });
  
  describe("Proxy Pattern Functionality", function () {
    it("Should properly delegate calls to implementation", async function () {
      const { standardBounties, proxy, implementation } = await loadFixture(deployStandardBountiesFixture);
      
      // Verify proxy has same interface as implementation
      expect(await proxy.implementation()).to.equal(await implementation.getAddress());
      
      // Verify calls work through proxy
      const bountyCount = await standardBounties.bountyCount();
      expect(bountyCount).to.equal(0);
    });
    
    it("Should maintain independent storage per proxy", async function () {
      const [owner] = await ethers.getSigners();
      
      // Deploy implementation
      const StandardBountiesImplementation = await ethers.getContractFactory("StandardBountiesImplementation");
      const implementation = await StandardBountiesImplementation.deploy();
      await implementation.waitForDeployment();
      
      // Deploy two proxies
      const StandardBountiesProxy = await ethers.getContractFactory("StandardBountiesProxy");
      const proxy1 = await StandardBountiesProxy.deploy(await implementation.getAddress());
      const proxy2 = await StandardBountiesProxy.deploy(await implementation.getAddress());
      
      await proxy1.waitForDeployment();
      await proxy2.waitForDeployment();
      
      await proxy1.initialize(owner.address);
      await proxy2.initialize(owner.address);
      
      // Create interfaces
      const contract1 = new ethers.Contract(
        await proxy1.getAddress(),
        StandardBountiesImplementation.interface,
        owner
      );
      const contract2 = new ethers.Contract(
        await proxy2.getAddress(),
        StandardBountiesImplementation.interface,
        owner
      );
      
      // Create bounty in first proxy
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await contract1.initializeBounty(
        owner.address,
        ethers.ZeroAddress,
        "QmTestBounty1",
        deadline
      );
      
      // Verify independent storage
      expect(await contract1.bountyCount()).to.equal(1);
      expect(await contract2.bountyCount()).to.equal(0);
    });
  });
  
  describe("Factory Functions", function () {
    it("Should deploy proxy through factory", async function () {
      const { factory, owner } = await loadFixture(deployStandardBountiesFixture);
      
      const tx = await factory.deployProxyAuto(owner.address);
      const receipt = await tx.wait();
      
      // Check for ProxyDeployed event
      const proxyEvent = receipt.logs.find(log => {
        try {
          return factory.interface.parseLog(log).name === "ProxyDeployed";
        } catch (e) {
          return false;
        }
      });
      
      expect(proxyEvent).to.not.be.undefined;
    });
    
    it("Should predict proxy addresses correctly", async function () {
      const { factory, owner } = await loadFixture(deployStandardBountiesFixture);
      
      const salt = ethers.id("test-salt");
      const predictedAddress = await factory.predictProxyAddress(owner.address, salt);
      
      expect(predictedAddress).to.be.properAddress;
    });
  });
  
  describe("Error Handling", function () {
    it("Should reject invalid bounty operations", async function () {
      const { standardBounties } = await loadFixture(deployStandardBountiesFixture);
      
      // Try to fund non-existent bounty
      await expect(
        standardBounties.fundBountyETH(999, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(standardBounties, "InvalidBounty");
    });
    
    it("Should reject unauthorized access", async function () {
      const { standardBounties, issuer, fulfiller } = await loadFixture(deployStandardBountiesFixture);
      
      // Create and fund bounty
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await standardBounties.initializeBounty(
        issuer.address,
        ethers.ZeroAddress,
        "QmTestBounty",
        deadline
      );
      
      await standardBounties.fundBountyETH(0, { value: ethers.parseEther("0.1") });
      await standardBounties.connect(fulfiller).fulfillBounty(0, "QmFulfillment");
      
      // Try to accept fulfillment as unauthorized user
      await expect(
        standardBounties.connect(fulfiller).acceptFulfillment(0, 0, ethers.parseEther("0.05"))
      ).to.be.revertedWith("Unauthorized");
    });
  });
  
  describe("Administrative Functions", function () {
    it("Should allow owner to pause/unpause", async function () {
      const { standardBounties, owner } = await loadFixture(deployStandardBountiesFixture);
      
      await standardBounties.pause();
      expect(await standardBounties.paused()).to.be.true;
      
      await standardBounties.unpause();
      expect(await standardBounties.paused()).to.be.false;
    });
    
    it("Should allow owner to set platform fee", async function () {
      const { standardBounties, owner } = await loadFixture(deployStandardBountiesFixture);
      
      await standardBounties.setPlatformFee(300); // 3%
      expect(await standardBounties.platformFeeRate()).to.equal(300);
    });
    
    it("Should reject excessive platform fee", async function () {
      const { standardBounties, owner } = await loadFixture(deployStandardBountiesFixture);
      
      await expect(
        standardBounties.setPlatformFee(1500) // 15% - too high
      ).to.be.revertedWith("Fee too high");
    });
  });
  
  describe("Token Support", function () {
    it("Should support ERC20 token funding", async function () {
      const { standardBounties, token, issuer, funder } = await loadFixture(deployStandardBountiesFixture);
      
      // Create bounty
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await standardBounties.initializeBounty(
        issuer.address,
        ethers.ZeroAddress,
        "QmTestBounty",
        deadline
      );
      
      // Transfer tokens to funder and approve
      const fundingAmount = ethers.parseEther("10");
      await token.transfer(funder.address, fundingAmount);
      await token.connect(funder).approve(await standardBounties.getAddress(), fundingAmount);
      
      // Fund with tokens
      const tx = await standardBounties.connect(funder).fundBountyToken(
        0,
        await token.getAddress(),
        fundingAmount
      );
      
      await expect(tx).to.emit(standardBounties, "BountyFunded");
      
      const bounty = await standardBounties.getBounty(0);
      expect(bounty[4]).to.equal(fundingAmount); // balance
      expect(bounty[2]).to.equal(await token.getAddress()); // token address
    });
  });
  
  describe("Complete Workflow Test", function () {
    it("Should complete full bounty workflow successfully", async function () {
      const { standardBounties, token, issuer, fulfiller, funder } = await loadFixture(deployStandardBountiesFixture);
      
      // 1. Create bounty
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      const createTx = await standardBounties.initializeBounty(
        issuer.address,
        ethers.ZeroAddress,
        "QmTestBounty",
        deadline
      );
      await createTx.wait();
      
      // 2. Fund bounty
      const fundingAmount = ethers.parseEther("0.1");
      const fundTx = await standardBounties.connect(funder).fundBountyETH(0, { value: fundingAmount });
      await fundTx.wait();
      
      // 3. Submit fulfillment
      const fulfillTx = await standardBounties.connect(fulfiller).fulfillBounty(0, "QmFulfillment");
      await fulfillTx.wait();
      
      // 4. Accept fulfillment
      const paymentAmount = ethers.parseEther("0.08");
      const acceptTx = await standardBounties.connect(issuer).acceptFulfillment(0, 0, paymentAmount);
      await acceptTx.wait();
      
      // 5. Verify final state
      const bounty = await standardBounties.getBounty(0);
      const fulfillment = await standardBounties.getFulfillment(0, 0);
      
      expect(bounty[4]).to.equal(fundingAmount - paymentAmount); // remaining balance
      expect(fulfillment[2]).to.equal(1); // fulfillment accepted
      
      console.log("      Complete workflow executed successfully");
    });
  });
});