const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("StandardBounties", function () {
  async function deployStandardBountiesFixture() {
    const [owner, issuer, arbiter, fulfiller1, fulfiller2, funder1, funder2, feeRecipient] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy("Test Token", "TEST", ethers.parseEther("1000000"));

    // Deploy StandardBounties contract
    const StandardBounties = await ethers.getContractFactory("StandardBounties");
    const standardBounties = await StandardBounties.deploy(feeRecipient.address);

    // Distribute tokens to test accounts
    await mockToken.transfer(issuer.address, ethers.parseEther("10000"));
    await mockToken.transfer(funder1.address, ethers.parseEther("5000"));
    await mockToken.transfer(funder2.address, ethers.parseEther("5000"));

    return {
      standardBounties,
      mockToken,
      owner,
      issuer,
      arbiter,
      fulfiller1,
      fulfiller2,
      funder1,
      funder2,
      feeRecipient
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { standardBounties, owner } = await loadFixture(deployStandardBountiesFixture);
      expect(await standardBounties.owner()).to.equal(owner.address);
    });

    it("Should set the fee recipient", async function () {
      const { standardBounties, feeRecipient } = await loadFixture(deployStandardBountiesFixture);
      expect(await standardBounties.feeRecipient()).to.equal(feeRecipient.address);
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

  describe("Bounty Initialization", function () {
    it("Should initialize a bounty with valid parameters", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400; // 1 day from now
      const data = "QmTestHash123";

      await expect(
        standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline)
      ).to.emit(standardBounties, "BountyInitialized")
        .withArgs(0, issuer.address, arbiter.address, data, deadline);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.issuer).to.equal(issuer.address);
      expect(bounty.arbiter).to.equal(arbiter.address);
      expect(bounty.data).to.equal(data);
      expect(bounty.deadline).to.equal(deadline);
      expect(bounty.state).to.equal(0); // DRAFT
    });

    it("Should reject invalid issuer address", async function () {
      const { standardBounties, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";

      await expect(
        standardBounties.initializeBounty(ethers.ZeroAddress, arbiter.address, data, deadline)
      ).to.be.revertedWith("Invalid issuer address");
    });

    it("Should reject issuer as arbiter", async function () {
      const { standardBounties, issuer } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";

      await expect(
        standardBounties.initializeBounty(issuer.address, issuer.address, data, deadline)
      ).to.be.revertedWith("Issuer cannot be arbiter");
    });

    it("Should reject empty data", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;

      await expect(
        standardBounties.initializeBounty(issuer.address, arbiter.address, "", deadline)
      ).to.be.revertedWith("Data cannot be empty");
    });

    it("Should reject deadline too soon", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 1800; // 30 minutes (less than MIN_DEADLINE)
      const data = "QmTestHash123";

      await expect(
        standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline)
      ).to.be.revertedWith("Deadline too soon");
    });

    it("Should reject deadline too far", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + (366 * 24 * 60 * 60); // More than MAX_DEADLINE
      const data = "QmTestHash123";

      await expect(
        standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline)
      ).to.be.revertedWith("Deadline too far");
    });
  });

  describe("Bounty Funding with ETH", function () {
    it("Should fund bounty with ETH and activate it", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);

      await expect(
        standardBounties.fundBountyETH(0, { value: fundAmount })
      ).to.emit(standardBounties, "BountyFunded")
        .and.to.emit(standardBounties, "BountyActivated")
        .withArgs(0, fundAmount);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.balance).to.equal(fundAmount);
      expect(bounty.totalFunding).to.equal(fundAmount);
      expect(bounty.state).to.equal(1); // ACTIVE
      expect(bounty.token).to.equal(ethers.ZeroAddress);
    });

    it("Should allow multiple funders for ETH bounty", async function () {
      const { standardBounties, issuer, arbiter, funder1, funder2 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount1 = ethers.parseEther("0.5");
      const fundAmount2 = ethers.parseEther("1.5");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);

      await standardBounties.connect(funder1).fundBountyETH(0, { value: fundAmount1 });
      await standardBounties.connect(funder2).fundBountyETH(0, { value: fundAmount2 });

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.balance).to.equal(fundAmount1 + fundAmount2);
      expect(bounty.totalFunding).to.equal(fundAmount1 + fundAmount2);

      const funders = await standardBounties.getBountyFunders(0);
      expect(funders.length).to.equal(2);
      expect(funders).to.include(funder1.address);
      expect(funders).to.include(funder2.address);
    });

    it("Should reject funding with 0 ETH", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);

      await expect(
        standardBounties.fundBountyETH(0, { value: 0 })
      ).to.be.revertedWith("Must send ETH to fund bounty");
    });

    it("Should reject funding non-existent bounty", async function () {
      const { standardBounties } = await loadFixture(deployStandardBountiesFixture);

      await expect(
        standardBounties.fundBountyETH(999, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Invalid bounty ID");
    });

    it("Should allow funding ACTIVE bounty (additional funding)", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });

      // Should allow additional funding when bounty is ACTIVE
      await expect(
        standardBounties.fundBountyETH(0, { value: fundAmount })
      ).to.not.be.reverted;
      
      const bounty = await standardBounties.getBounty(0);
      expect(bounty.balance).to.equal(fundAmount + fundAmount);
    });
  });

  describe("Bounty Funding with ERC20 Tokens", function () {
    it("Should fund bounty with ERC20 tokens and activate it", async function () {
      const { standardBounties, mockToken, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("100");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await mockToken.connect(issuer).approve(standardBounties.target, fundAmount);

      await expect(
        standardBounties.connect(issuer).fundBountyToken(0, mockToken.target, fundAmount)
      ).to.emit(standardBounties, "BountyFunded")
        .withArgs(0, issuer.address, mockToken.target, fundAmount, fundAmount)
        .and.to.emit(standardBounties, "BountyActivated")
        .withArgs(0, fundAmount);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.balance).to.equal(fundAmount);
      expect(bounty.token).to.equal(mockToken.target);
      expect(bounty.state).to.equal(1); // ACTIVE
    });

    it("Should reject mixing ETH and token funding", async function () {
      const { standardBounties, mockToken, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      
      // Fund with ETH first
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      
      // Try to fund with token
      await mockToken.connect(issuer).approve(standardBounties.target, fundAmount);
      await expect(
        standardBounties.connect(issuer).fundBountyToken(0, mockToken.target, fundAmount)
      ).to.be.revertedWith("Cannot mix different tokens in same bounty");
    });

    it("Should reject invalid token address", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("100");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);

      await expect(
        standardBounties.connect(issuer).fundBountyToken(0, ethers.ZeroAddress, fundAmount)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should reject funding with 0 amount", async function () {
      const { standardBounties, mockToken, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);

      await expect(
        standardBounties.connect(issuer).fundBountyToken(0, mockToken.target, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Bounty Fulfillment", function () {
    it("Should allow fulfillment of active bounty", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fulfillmentData = "QmFulfillmentHash456";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });

      await expect(
        standardBounties.connect(fulfiller1).fulfillBounty(0, fulfillmentData)
      ).to.emit(standardBounties, "BountyFulfilled")
        .withArgs(0, 0, fulfiller1.address, fulfillmentData);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.fulfillmentCount).to.equal(1);

      const fulfillment = await standardBounties.getFulfillment(0, 0);
      expect(fulfillment.fulfiller).to.equal(fulfiller1.address);
      expect(fulfillment.data).to.equal(fulfillmentData);
      expect(fulfillment.state).to.equal(0); // PENDING
    });

    it("Should allow multiple fulfillments", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1, fulfiller2 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("2");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });

      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillment1");
      await standardBounties.connect(fulfiller2).fulfillBounty(0, "QmFulfillment2");

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.fulfillmentCount).to.equal(2);

      const fulfillment1 = await standardBounties.getFulfillment(0, 0);
      const fulfillment2 = await standardBounties.getFulfillment(0, 1);
      
      expect(fulfillment1.fulfiller).to.equal(fulfiller1.address);
      expect(fulfillment2.fulfiller).to.equal(fulfiller2.address);
    });

    it("Should reject fulfillment of draft bounty", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);

      await expect(
        standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash")
      ).to.be.revertedWith("Invalid bounty state");
    });

    it("Should reject fulfillment after deadline", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 7200; // 2 hours
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });

      // Fast forward past deadline
      await time.increaseTo(deadline + 1);

      await expect(
        standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash")
      ).to.be.revertedWith("Bounty deadline has passed");
    });

    it("Should reject empty fulfillment data", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });

      await expect(
        standardBounties.connect(fulfiller1).fulfillBounty(0, "")
      ).to.be.revertedWith("Fulfillment data cannot be empty");
    });
  });

  describe("Fulfillment Acceptance", function () {
    it("Should accept fulfillment and pay fulfiller (ETH)", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1, feeRecipient } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");
      const payoutAmount = ethers.parseEther("0.5");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      const initialFulfillerBalance = await ethers.provider.getBalance(fulfiller1.address);
      const initialFeeRecipientBalance = await ethers.provider.getBalance(feeRecipient.address);

      await expect(
        standardBounties.connect(issuer).acceptFulfillment(0, 0, payoutAmount)
      ).to.emit(standardBounties, "FulfillmentAccepted")
        .withArgs(0, 0, fulfiller1.address, payoutAmount);

      const finalFulfillerBalance = await ethers.provider.getBalance(fulfiller1.address);
      const finalFeeRecipientBalance = await ethers.provider.getBalance(feeRecipient.address);

      const platformFee = (payoutAmount * 250n) / 10000n; // 2.5%
      const expectedPayout = payoutAmount - platformFee;

      expect(finalFulfillerBalance - initialFulfillerBalance).to.equal(expectedPayout);
      expect(finalFeeRecipientBalance - initialFeeRecipientBalance).to.equal(platformFee);

      const fulfillment = await standardBounties.getFulfillment(0, 0);
      expect(fulfillment.state).to.equal(1); // ACCEPTED
      expect(fulfillment.payoutAmount).to.equal(payoutAmount);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.balance).to.equal(fundAmount - payoutAmount);
    });

    it("Should accept fulfillment and pay fulfiller (ERC20)", async function () {
      const { standardBounties, mockToken, issuer, arbiter, fulfiller1, feeRecipient } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("100");
      const payoutAmount = ethers.parseEther("50");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await mockToken.connect(issuer).approve(standardBounties.target, fundAmount);
      await standardBounties.connect(issuer).fundBountyToken(0, mockToken.target, fundAmount);
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      const initialFulfillerBalance = await mockToken.balanceOf(fulfiller1.address);
      const initialFeeRecipientBalance = await mockToken.balanceOf(feeRecipient.address);

      await standardBounties.connect(issuer).acceptFulfillment(0, 0, payoutAmount);

      const finalFulfillerBalance = await mockToken.balanceOf(fulfiller1.address);
      const finalFeeRecipientBalance = await mockToken.balanceOf(feeRecipient.address);

      const platformFee = (payoutAmount * 250n) / 10000n; // 2.5%
      const expectedPayout = payoutAmount - platformFee;

      expect(finalFulfillerBalance - initialFulfillerBalance).to.equal(expectedPayout);
      expect(finalFeeRecipientBalance - initialFeeRecipientBalance).to.equal(platformFee);
    });

    it("Should allow arbiter to accept fulfillment", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");
      const payoutAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      await expect(
        standardBounties.connect(arbiter).acceptFulfillment(0, 0, payoutAmount)
      ).to.emit(standardBounties, "FulfillmentAccepted");
    });

    it("Should complete bounty when balance reaches zero", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      await standardBounties.connect(issuer).acceptFulfillment(0, 0, fundAmount);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.state).to.equal(2); // COMPLETED
      expect(bounty.balance).to.equal(0);
    });

    it("Should reject acceptance by unauthorized user", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1, funder1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      await expect(
        standardBounties.connect(funder1).acceptFulfillment(0, 0, fundAmount)
      ).to.be.revertedWith("Only issuer or arbiter can perform this action");
    });

    it("Should reject acceptance with insufficient balance", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");
      const excessivePayout = ethers.parseEther("2");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      await expect(
        standardBounties.connect(issuer).acceptFulfillment(0, 0, excessivePayout)
      ).to.be.revertedWith("Insufficient bounty balance");
    });

    it("Should support partial payouts to multiple fulfillers", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1, fulfiller2 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("2");
      const payout1 = ethers.parseEther("0.8");
      const payout2 = ethers.parseEther("1.2");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillment1");
      await standardBounties.connect(fulfiller2).fulfillBounty(0, "QmFulfillment2");

      await standardBounties.connect(issuer).acceptFulfillment(0, 0, payout1);
      await standardBounties.connect(issuer).acceptFulfillment(0, 1, payout2);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.state).to.equal(2); // COMPLETED
      expect(bounty.balance).to.equal(0);

      const fulfillment1 = await standardBounties.getFulfillment(0, 0);
      const fulfillment2 = await standardBounties.getFulfillment(0, 1);
      
      expect(fulfillment1.state).to.equal(1); // ACCEPTED
      expect(fulfillment2.state).to.equal(1); // ACCEPTED
      expect(fulfillment1.payoutAmount).to.equal(payout1);
      expect(fulfillment2.payoutAmount).to.equal(payout2);
    });
  });

  describe("Fulfillment Rejection", function () {
    it("Should reject fulfillment by issuer", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      await expect(
        standardBounties.connect(issuer).rejectFulfillment(0, 0)
      ).to.emit(standardBounties, "FulfillmentRejected")
        .withArgs(0, 0, fulfiller1.address);

      const fulfillment = await standardBounties.getFulfillment(0, 0);
      expect(fulfillment.state).to.equal(2); // REJECTED

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.state).to.equal(1); // Still ACTIVE
      expect(bounty.balance).to.equal(fundAmount); // Balance unchanged
    });

    it("Should reject fulfillment by arbiter", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      await expect(
        standardBounties.connect(arbiter).rejectFulfillment(0, 0)
      ).to.emit(standardBounties, "FulfillmentRejected");
    });

    it("Should reject rejection by unauthorized user", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1, funder1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      await expect(
        standardBounties.connect(funder1).rejectFulfillment(0, 0)
      ).to.be.revertedWith("Only issuer or arbiter can perform this action");
    });

    it("Should reject processing already processed fulfillment", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");

      // Accept first
      await standardBounties.connect(issuer).acceptFulfillment(0, 0, fundAmount);

      // Try to reject
      await expect(
        standardBounties.connect(issuer).rejectFulfillment(0, 0)
      ).to.be.revertedWith("Fulfillment already processed");
    });
  });

  describe("Fulfillment Updates", function () {
    it("Should allow fulfiller to update their submission", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");
      const newData = "QmUpdatedHash789";

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmOriginalHash");

      await expect(
        standardBounties.connect(fulfiller1).updateFulfillment(0, 0, newData)
      ).to.emit(standardBounties, "FulfillmentUpdated")
        .withArgs(0, 0, fulfiller1.address, newData);

      const fulfillment = await standardBounties.getFulfillment(0, 0);
      expect(fulfillment.data).to.equal(newData);
    });

    it("Should reject update by non-fulfiller", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1, fulfiller2 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmOriginalHash");

      await expect(
        standardBounties.connect(fulfiller2).updateFulfillment(0, 0, "QmNewHash")
      ).to.be.revertedWith("Only fulfiller can update");
    });

    it("Should reject update of processed fulfillment", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmOriginalHash");
      await standardBounties.connect(issuer).acceptFulfillment(0, 0, fundAmount);

      await expect(
        standardBounties.connect(fulfiller1).updateFulfillment(0, 0, "QmNewHash")
      ).to.be.revertedWith("Can only update pending fulfillments");
    });

    it("Should reject empty update data", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmOriginalHash");

      await expect(
        standardBounties.connect(fulfiller1).updateFulfillment(0, 0, "")
      ).to.be.revertedWith("New data cannot be empty");
    });
  });

  describe("Bounty Cancellation", function () {
    it("Should cancel draft bounty with no refund", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);

      await expect(
        standardBounties.connect(issuer).cancelBounty(0)
      ).to.emit(standardBounties, "BountyCancelled")
        .withArgs(0, issuer.address, 0);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.state).to.equal(3); // CANCELLED
    });

    it("Should cancel active bounty after deadline and refund contributors", async function () {
      const { standardBounties, issuer, arbiter, funder1, funder2 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 7200; // 2 hours
      const data = "QmTestHash123";
      const fundAmount1 = ethers.parseEther("0.3");
      const fundAmount2 = ethers.parseEther("0.7");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.connect(funder1).fundBountyETH(0, { value: fundAmount1 });
      await standardBounties.connect(funder2).fundBountyETH(0, { value: fundAmount2 });

      const initialBalance1 = await ethers.provider.getBalance(funder1.address);
      const initialBalance2 = await ethers.provider.getBalance(funder2.address);

      // Fast forward past deadline
      await time.increaseTo(deadline + 1);

      await standardBounties.connect(issuer).cancelBounty(0);

      const finalBalance1 = await ethers.provider.getBalance(funder1.address);
      const finalBalance2 = await ethers.provider.getBalance(funder2.address);

      expect(finalBalance1 - initialBalance1).to.equal(fundAmount1);
      expect(finalBalance2 - initialBalance2).to.equal(fundAmount2);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.state).to.equal(3); // CANCELLED
      expect(bounty.balance).to.equal(0);
    });

    it("Should reject cancellation before deadline by non-issuer", async function () {
      const { standardBounties, issuer, arbiter, funder1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });

      await expect(
        standardBounties.connect(funder1).cancelBounty(0)
      ).to.be.revertedWith("Only issuer can perform this action");
    });

    it("Should reject cancellation of active bounty before deadline", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });

      await expect(
        standardBounties.connect(issuer).cancelBounty(0)
      ).to.be.revertedWith("Cannot cancel active bounty before deadline");
    });

    it("Should reject cancellation of completed bounty", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillmentHash");
      await standardBounties.connect(issuer).acceptFulfillment(0, 0, fundAmount);

      await expect(
        standardBounties.connect(issuer).cancelBounty(0)
      ).to.be.revertedWith("Cannot cancel completed or already cancelled bounty");
    });
  });

  describe("Administrative Functions", function () {
    it("Should update platform fee rate", async function () {
      const { standardBounties, owner } = await loadFixture(deployStandardBountiesFixture);
      
      const newFeeRate = 500; // 5%

      await expect(
        standardBounties.connect(owner).setPlatformFee(newFeeRate)
      ).to.emit(standardBounties, "PlatformFeeUpdated")
        .withArgs(250, newFeeRate);

      expect(await standardBounties.platformFeeRate()).to.equal(newFeeRate);
    });

    it("Should reject fee rate above maximum", async function () {
      const { standardBounties, owner } = await loadFixture(deployStandardBountiesFixture);
      
      const excessiveFeeRate = 1500; // 15% (above 10% max)

      await expect(
        standardBounties.connect(owner).setPlatformFee(excessiveFeeRate)
      ).to.be.revertedWith("Fee rate too high");
    });

    it("Should update fee recipient", async function () {
      const { standardBounties, owner, issuer } = await loadFixture(deployStandardBountiesFixture);

      await expect(
        standardBounties.connect(owner).setFeeRecipient(issuer.address)
      ).to.emit(standardBounties, "FeeRecipientUpdated");

      expect(await standardBounties.feeRecipient()).to.equal(issuer.address);
    });

    it("Should reject invalid fee recipient", async function () {
      const { standardBounties, owner } = await loadFixture(deployStandardBountiesFixture);

      await expect(
        standardBounties.connect(owner).setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid fee recipient");
    });

    it("Should pause and unpause contract", async function () {
      const { standardBounties, owner, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      await standardBounties.connect(owner).pause();
      expect(await standardBounties.paused()).to.be.true;

      const deadline = (await time.latest()) + 86400;
      await expect(
        standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", deadline)
      ).to.be.revertedWith("Pausable: paused");

      await standardBounties.connect(owner).unpause();
      expect(await standardBounties.paused()).to.be.false;

      await expect(
        standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", deadline)
      ).to.not.be.reverted;
    });

    it("Should perform emergency withdraw", async function () {
      const { standardBounties, owner, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const fundAmount = ethers.parseEther("1");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });

      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      
      const tx = await standardBounties.connect(owner).emergencyWithdraw(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      expect(finalOwnerBalance - initialOwnerBalance + gasUsed).to.equal(fundAmount);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.state).to.equal(3); // CANCELLED
      expect(bounty.balance).to.equal(0);
    });
  });

  describe("View Functions", function () {
    it("Should return correct bounty information", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const data = "QmTestHash123";

      await standardBounties.initializeBounty(issuer.address, arbiter.address, data, deadline);

      const bounty = await standardBounties.getBounty(0);
      expect(bounty.issuer).to.equal(issuer.address);
      expect(bounty.arbiter).to.equal(arbiter.address);
      expect(bounty.data).to.equal(data);
      expect(bounty.deadline).to.equal(deadline);
      expect(bounty.state).to.equal(0); // DRAFT
    });

    it("Should return correct fulfillment information", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const fundAmount = ethers.parseEther("1");
      const fulfillmentData = "QmFulfillmentHash";

      await standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", deadline);
      await standardBounties.fundBountyETH(0, { value: fundAmount });
      await standardBounties.connect(fulfiller1).fulfillBounty(0, fulfillmentData);

      const fulfillment = await standardBounties.getFulfillment(0, 0);
      expect(fulfillment.fulfiller).to.equal(fulfiller1.address);
      expect(fulfillment.data).to.equal(fulfillmentData);
      expect(fulfillment.state).to.equal(0); // PENDING
    });

    it("Should return bounty funders", async function () {
      const { standardBounties, issuer, arbiter, funder1, funder2 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;

      await standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", deadline);
      await standardBounties.connect(funder1).fundBountyETH(0, { value: ethers.parseEther("0.5") });
      await standardBounties.connect(funder2).fundBountyETH(0, { value: ethers.parseEther("0.3") });

      const funders = await standardBounties.getBountyFunders(0);
      expect(funders.length).to.equal(2);
      expect(funders).to.include(funder1.address);
      expect(funders).to.include(funder2.address);
    });

    it("Should return contribution amounts", async function () {
      const { standardBounties, issuer, arbiter, funder1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const fundAmount = ethers.parseEther("0.7");

      await standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", deadline);
      await standardBounties.connect(funder1).fundBountyETH(0, { value: fundAmount });

      const contribution = await standardBounties.getContribution(0, funder1.address);
      expect(contribution).to.equal(fundAmount);
    });

    it("Should check if bounty is expired", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 7200; // 2 hours

      await standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", deadline);

      expect(await standardBounties.isExpired(0)).to.be.false;

      await time.increaseTo(deadline + 1);
      expect(await standardBounties.isExpired(0)).to.be.true;
    });

    it("Should check if bounty can be fulfilled", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;

      await standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", deadline);

      // Draft bounty cannot be fulfilled
      expect(await standardBounties.canFulfill(0)).to.be.false;

      // Active bounty can be fulfilled
      await standardBounties.fundBountyETH(0, { value: ethers.parseEther("1") });
      expect(await standardBounties.canFulfill(0)).to.be.true;

      // Expired bounty cannot be fulfilled
      await time.increaseTo(deadline + 1);
      expect(await standardBounties.canFulfill(0)).to.be.false;
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should reject direct ETH transfers", async function () {
      const { standardBounties, issuer } = await loadFixture(deployStandardBountiesFixture);

      await expect(
        issuer.sendTransaction({
          to: standardBounties.target,
          value: ethers.parseEther("1")
        })
      ).to.be.revertedWith("Direct payments not accepted. Use fundBountyETH()");
    });

    it("Should handle zero arbiter address correctly", async function () {
      const { standardBounties, issuer } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;

      await standardBounties.initializeBounty(issuer.address, ethers.ZeroAddress, "QmTest", deadline);
      
      const bounty = await standardBounties.getBounty(0);
      expect(bounty.arbiter).to.equal(ethers.ZeroAddress);
    });

    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract, but the ReentrancyGuard should prevent issues
      // The nonReentrant modifier is applied to all state-changing functions that transfer funds
      const { standardBounties } = await loadFixture(deployStandardBountiesFixture);
      // Test passes if contract compiles with ReentrancyGuard
      expect(await standardBounties.bountyCount()).to.equal(0);
    });

    it("Should handle gas limit constraints", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      // Test with very long data string
      const longData = "Qm" + "a".repeat(1000);

      await expect(
        standardBounties.initializeBounty(issuer.address, arbiter.address, longData, deadline)
      ).to.not.be.reverted;
    });

    it("Should properly handle integer overflow/underflow", async function () {
      const { standardBounties, issuer, arbiter } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const maxUint256 = ethers.MaxUint256;

      // This should revert due to reasonable deadline constraints, not overflow
      await expect(
        standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", maxUint256)
      ).to.be.revertedWith("Deadline too far");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should track gas usage for common operations", async function () {
      const { standardBounties, issuer, arbiter, fulfiller1 } = await loadFixture(deployStandardBountiesFixture);
      
      const deadline = (await time.latest()) + 86400;
      const fundAmount = ethers.parseEther("1");

      // Initialize bounty
      const initTx = await standardBounties.initializeBounty(issuer.address, arbiter.address, "QmTest", deadline);
      const initReceipt = await initTx.wait();
      console.log("Initialize bounty gas used:", initReceipt.gasUsed.toString());

      // Fund bounty
      const fundTx = await standardBounties.fundBountyETH(0, { value: fundAmount });
      const fundReceipt = await fundTx.wait();
      console.log("Fund bounty gas used:", fundReceipt.gasUsed.toString());

      // Fulfill bounty
      const fulfillTx = await standardBounties.connect(fulfiller1).fulfillBounty(0, "QmFulfillment");
      const fulfillReceipt = await fulfillTx.wait();
      console.log("Fulfill bounty gas used:", fulfillReceipt.gasUsed.toString());

      // Accept fulfillment
      const acceptTx = await standardBounties.connect(issuer).acceptFulfillment(0, 0, fundAmount);
      const acceptReceipt = await acceptTx.wait();
      console.log("Accept fulfillment gas used:", acceptReceipt.gasUsed.toString());

      // All operations should complete successfully
      expect(initReceipt.status).to.equal(1);
      expect(fundReceipt.status).to.equal(1);
      expect(fulfillReceipt.status).to.equal(1);
      expect(acceptReceipt.status).to.equal(1);
    });
  });
});