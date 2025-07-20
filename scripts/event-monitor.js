const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

class StandardBountiesEventMonitor {
    constructor(contractAddress, provider) {
        this.contractAddress = contractAddress;
        this.provider = provider;
        this.contract = null;
        this.eventHistory = [];
        this.isMonitoring = false;
        this.listeners = {};
        
        // Initialize contract
        this.initializeContract();
    }
    
    async initializeContract() {
        try {
            this.contract = await ethers.getContractAt("StandardBountiesImplementation", this.contractAddress);
            console.log("✅ Contract initialized for event monitoring");
            console.log("Contract address:", this.contractAddress);
        } catch (error) {
            console.error("❌ Failed to initialize contract:", error.message);
            throw error;
        }
    }
    
    setupEventListeners() {
        console.log("🔗 Setting up event listeners...");
        
        // BountyInitialized Event
        this.listeners.bountyInitialized = this.contract.on("BountyInitialized", (bountyId, issuer, arbiter, event) => {
            const eventData = {
                type: "BountyInitialized",
                bountyId: bountyId.toString(),
                issuer,
                arbiter,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: new Date().toISOString()
            };
            
            this.logEvent(eventData);
            this.handleBountyInitialized(eventData);
        });
        
        // BountyFunded Event
        this.listeners.bountyFunded = this.contract.on("BountyFunded", (bountyId, funder, amount, event) => {
            const eventData = {
                type: "BountyFunded",
                bountyId: bountyId.toString(),
                funder,
                amount: ethers.formatEther(amount),
                amountWei: amount.toString(),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: new Date().toISOString()
            };
            
            this.logEvent(eventData);
            this.handleBountyFunded(eventData);
        });
        
        // FulfillmentSubmitted Event
        this.listeners.fulfillmentSubmitted = this.contract.on("FulfillmentSubmitted", (bountyId, fulfillmentId, fulfiller, event) => {
            const eventData = {
                type: "FulfillmentSubmitted",
                bountyId: bountyId.toString(),
                fulfillmentId: fulfillmentId.toString(),
                fulfiller,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: new Date().toISOString()
            };
            
            this.logEvent(eventData);
            this.handleFulfillmentSubmitted(eventData);
        });
        
        // FulfillmentAccepted Event
        this.listeners.fulfillmentAccepted = this.contract.on("FulfillmentAccepted", (bountyId, fulfillmentId, amount, event) => {
            const eventData = {
                type: "FulfillmentAccepted",
                bountyId: bountyId.toString(),
                fulfillmentId: fulfillmentId.toString(),
                amount: ethers.formatEther(amount),
                amountWei: amount.toString(),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: new Date().toISOString()
            };
            
            this.logEvent(eventData);
            this.handleFulfillmentAccepted(eventData);
        });
        
        console.log("✅ Event listeners configured");
    }
    
    logEvent(eventData) {
        this.eventHistory.push(eventData);
        
        // Log to console with formatting
        console.log("\n🔔 NEW EVENT DETECTED");
        console.log("=" .repeat(30));
        console.log("Type:", eventData.type);
        console.log("Timestamp:", eventData.timestamp);
        console.log("Block:", eventData.blockNumber);
        console.log("TX Hash:", eventData.transactionHash);
        
        // Event-specific details
        switch (eventData.type) {
            case "BountyInitialized":
                console.log("Bounty ID:", eventData.bountyId);
                console.log("Issuer:", eventData.issuer);
                console.log("Arbiter:", eventData.arbiter);
                break;
                
            case "BountyFunded":
                console.log("Bounty ID:", eventData.bountyId);
                console.log("Funder:", eventData.funder);
                console.log("Amount:", eventData.amount, "ETH");
                break;
                
            case "FulfillmentSubmitted":
                console.log("Bounty ID:", eventData.bountyId);
                console.log("Fulfillment ID:", eventData.fulfillmentId);
                console.log("Fulfiller:", eventData.fulfiller);
                break;
                
            case "FulfillmentAccepted":
                console.log("Bounty ID:", eventData.bountyId);
                console.log("Fulfillment ID:", eventData.fulfillmentId);
                console.log("Payout:", eventData.amount, "ETH");
                break;
        }
        
        // Save to file
        this.saveEventHistory();
    }
    
    handleBountyInitialized(eventData) {
        console.log("🎯 Processing BountyInitialized event...");
        
        // Custom logic for bounty initialization
        if (eventData.arbiter === ethers.ZeroAddress) {
            console.log("ℹ️ No arbiter assigned to this bounty");
        } else {
            console.log("👨‍⚖️ Arbiter assigned:", eventData.arbiter);
        }
        
        // Trigger any automated processes
        this.checkBountyCreationRate();
    }
    
    handleBountyFunded(eventData) {
        console.log("💰 Processing BountyFunded event...");
        
        const amountETH = parseFloat(eventData.amount);
        
        if (amountETH >= 1.0) {
            console.log("🚨 LARGE FUNDING DETECTED: " + eventData.amount + " ETH");
        }
        
        // Check funding patterns
        this.analyzeFundingPattern(eventData);
    }
    
    handleFulfillmentSubmitted(eventData) {
        console.log("📝 Processing FulfillmentSubmitted event...");
        
        // Track fulfillment submission rate
        this.trackFulfillmentRate(eventData);
        
        // Alert on rapid submissions (potential spam)
        this.checkRapidSubmissions(eventData);
    }
    
    handleFulfillmentAccepted(eventData) {
        console.log("✅ Processing FulfillmentAccepted event...");
        
        const payoutETH = parseFloat(eventData.amount);
        
        if (payoutETH >= 0.5) {
            console.log("💎 LARGE PAYOUT: " + eventData.amount + " ETH");
        }
        
        // Track successful completion rate
        this.updateCompletionStats();
    }
    
    checkBountyCreationRate() {
        const recentBounties = this.eventHistory
            .filter(e => e.type === "BountyInitialized")
            .filter(e => Date.now() - new Date(e.timestamp).getTime() < 3600000); // Last hour
        
        if (recentBounties.length > 10) {
            console.log("⚠️ HIGH BOUNTY CREATION RATE: " + recentBounties.length + " in last hour");
        }
    }
    
    analyzeFundingPattern(eventData) {
        const recentFunding = this.eventHistory
            .filter(e => e.type === "BountyFunded")
            .filter(e => e.funder === eventData.funder)
            .filter(e => Date.now() - new Date(e.timestamp).getTime() < 86400000); // Last 24 hours
        
        if (recentFunding.length > 5) {
            console.log("📈 ACTIVE FUNDER: " + eventData.funder + " funded " + recentFunding.length + " bounties today");
        }
    }
    
    trackFulfillmentRate(eventData) {
        const bountyFulfillments = this.eventHistory
            .filter(e => e.type === "FulfillmentSubmitted")
            .filter(e => e.bountyId === eventData.bountyId);
        
        if (bountyFulfillments.length > 5) {
            console.log("🔥 POPULAR BOUNTY: " + bountyFulfillments.length + " fulfillments for bounty " + eventData.bountyId);
        }
    }
    
    checkRapidSubmissions(eventData) {
        const recentSubmissions = this.eventHistory
            .filter(e => e.type === "FulfillmentSubmitted")
            .filter(e => e.fulfiller === eventData.fulfiller)
            .filter(e => Date.now() - new Date(e.timestamp).getTime() < 600000); // Last 10 minutes
        
        if (recentSubmissions.length > 3) {
            console.log("⚠️ RAPID SUBMISSIONS: " + eventData.fulfiller + " submitted " + recentSubmissions.length + " fulfillments recently");
        }
    }
    
    updateCompletionStats() {
        const totalSubmissions = this.eventHistory.filter(e => e.type === "FulfillmentSubmitted").length;
        const totalAccepted = this.eventHistory.filter(e => e.type === "FulfillmentAccepted").length;
        
        if (totalSubmissions > 0) {
            const acceptanceRate = (totalAccepted / totalSubmissions * 100).toFixed(1);
            console.log("📊 Acceptance Rate: " + acceptanceRate + "% (" + totalAccepted + "/" + totalSubmissions + ")");
        }
    }
    
    saveEventHistory() {
        try {
            const logsDir = path.join(__dirname, '..', 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(logsDir, `events-${today}.json`);
            
            fs.writeFileSync(logFile, JSON.stringify(this.eventHistory, null, 2));
        } catch (error) {
            console.error("❌ Failed to save event history:", error.message);
        }
    }
    
    async getHistoricalEvents(fromBlock = 0, toBlock = 'latest') {
        console.log("📚 Fetching historical events...");
        
        try {
            const events = await Promise.all([
                this.contract.queryFilter("BountyInitialized", fromBlock, toBlock),
                this.contract.queryFilter("BountyFunded", fromBlock, toBlock),
                this.contract.queryFilter("FulfillmentSubmitted", fromBlock, toBlock),
                this.contract.queryFilter("FulfillmentAccepted", fromBlock, toBlock)
            ]);
            
            const allEvents = events.flat().sort((a, b) => a.blockNumber - b.blockNumber);
            
            console.log("📊 Historical Events Summary:");
            console.log("Total events found:", allEvents.length);
            console.log("Block range:", fromBlock, "to", toBlock);
            
            // Process historical events
            for (const event of allEvents) {
                const eventData = {
                    type: event.eventName || event.fragment.name,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash,
                    timestamp: new Date().toISOString(), // Approximate
                    args: event.args
                };
                
                console.log(`${eventData.type} - Block ${eventData.blockNumber}`);
            }
            
            return allEvents;
        } catch (error) {
            console.error("❌ Failed to fetch historical events:", error.message);
            return [];
        }
    }
    
    generateEventReport() {
        console.log("\n📊 EVENT MONITORING REPORT");
        console.log("=" .repeat(30));
        console.log("Monitoring Duration:", this.isMonitoring ? "ACTIVE" : "STOPPED");
        console.log("Total Events Captured:", this.eventHistory.length);
        console.log("Contract Address:", this.contractAddress);
        console.log("Report Generated:", new Date().toISOString());
        
        // Event type breakdown
        const eventTypes = {};
        this.eventHistory.forEach(event => {
            eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
        });
        
        console.log("\n📋 Event Type Breakdown:");
        Object.entries(eventTypes).forEach(([type, count]) => {
            console.log(`${type}: ${count}`);
        });
        
        // Recent activity (last hour)
        const recentEvents = this.eventHistory.filter(e => 
            Date.now() - new Date(e.timestamp).getTime() < 3600000
        );
        
        console.log("\n⏰ Recent Activity (Last Hour):");
        console.log("Recent events:", recentEvents.length);
        
        if (recentEvents.length > 0) {
            const recentTypes = {};
            recentEvents.forEach(event => {
                recentTypes[event.type] = (recentTypes[event.type] || 0) + 1;
            });
            
            Object.entries(recentTypes).forEach(([type, count]) => {
                console.log(`${type}: ${count}`);
            });
        }
        
        return {
            totalEvents: this.eventHistory.length,
            eventTypes,
            recentEvents: recentEvents.length,
            isMonitoring: this.isMonitoring
        };
    }
    
    startMonitoring() {
        if (this.isMonitoring) {
            console.log("⚠️ Monitoring is already active");
            return;
        }
        
        console.log("🚀 Starting event monitoring...");
        this.setupEventListeners();
        this.isMonitoring = true;
        
        console.log("✅ Event monitoring started");
        console.log("🔊 Listening for StandardBounties events...");
    }
    
    stopMonitoring() {
        if (!this.isMonitoring) {
            console.log("⚠️ Monitoring is not active");
            return;
        }
        
        console.log("🛑 Stopping event monitoring...");
        
        // Remove all listeners
        Object.values(this.listeners).forEach(listener => {
            if (listener && typeof listener.removeAllListeners === 'function') {
                listener.removeAllListeners();
            }
        });
        
        this.isMonitoring = false;
        console.log("✅ Event monitoring stopped");
        
        // Generate final report
        this.generateEventReport();
    }
}

async function main() {
    console.log("StandardBounties Event Monitor");
    console.log("=" .repeat(35));
    
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "- Chain ID:", network.chainId);
    
    // Load deployment information to get contract address
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
    
    let contractAddress;
    
    if (fs.existsSync(deploymentFile)) {
        const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        contractAddress = deploymentInfo.contracts.testProxy?.address;
        console.log("Using deployed contract:", contractAddress);
    } else {
        // For demo purposes, create a test deployment
        console.log("No deployment found, creating test deployment...");
        
        const [deployer] = await ethers.getSigners();
        
        // Deploy implementation
        const Implementation = await ethers.getContractFactory("StandardBountiesImplementation");
        const implementation = await Implementation.deploy();
        await implementation.waitForDeployment();
        
        // Deploy factory
        const Factory = await ethers.getContractFactory("StandardBountiesFactory");
        const factory = await Factory.deploy(await implementation.getAddress());
        await factory.waitForDeployment();
        
        // Create proxy
        const createProxyTx = await factory.deployProxyAuto(deployer.address);
        const receipt = await createProxyTx.wait();
        
        const proxyEvent = receipt.logs.find(log => {
            try {
                const parsed = factory.interface.parseLog(log);
                return parsed.name === 'ProxyDeployed';
            } catch {
                return false;
            }
        });
        
        contractAddress = factory.interface.parseLog(proxyEvent).args.proxy;
        console.log("Test proxy created:", contractAddress);
    }
    
    if (!contractAddress) {
        throw new Error("No contract address available for monitoring");
    }
    
    // Initialize event monitor
    const monitor = new StandardBountiesEventMonitor(contractAddress, ethers.provider);
    
    // Get historical events first
    console.log("\n📚 Fetching historical events...");
    await monitor.getHistoricalEvents();
    
    // Start real-time monitoring
    console.log("\n🔊 Starting real-time event monitoring...");
    monitor.startMonitoring();
    
    // Monitor for a specified duration or until interrupted
    const monitoringDuration = process.env.MONITOR_DURATION || 3600000; // 1 hour default
    
    console.log(`⏰ Monitoring for ${monitoringDuration / 1000} seconds...`);
    console.log("Press Ctrl+C to stop monitoring");
    
    // Set up graceful shutdown
    process.on('SIGINT', () => {
        console.log("\n🛑 Received shutdown signal...");
        monitor.stopMonitoring();
        process.exit(0);
    });
    
    // Auto-stop after duration
    setTimeout(() => {
        console.log("\n⏰ Monitoring duration completed");
        monitor.stopMonitoring();
        process.exit(0);
    }, monitoringDuration);
    
    // Keep the process alive
    await new Promise(() => {});
}

main()
    .catch((error) => {
        console.error("❌ Event monitoring failed:", error.message);
        process.exit(1);
    });