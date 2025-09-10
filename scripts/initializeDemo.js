const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function main() {
  console.log("\n🚀 Initializing DeSupply Demo Environment\n");

  // Get signers from hardhat accounts
  const [deployer, supplier, buyer, lender, ...others] = await hre.ethers.getSigners();
  
  console.log("📝 Using Hardhat Accounts:");
  console.log("  Deployer/Oracle:", deployer.address);
  console.log("  Supplier:", supplier.address);
  console.log("  Buyer:", buyer.address);
  console.log("  Lender:", lender.address);

  // Read deployment info
  const deploymentPath = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found. Run deploy script first.");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  // Get contract instances
  const MockUSDC = await hre.ethers.getContractAt("MockUSDC", deployment.contracts.MockUSDC);
  const InvoiceNFT = await hre.ethers.getContractAt("InvoiceNFT", deployment.contracts.InvoiceNFT);
  const Funding = await hre.ethers.getContractAt("Funding", deployment.contracts.Funding);
  const ReputationRegistry = await hre.ethers.getContractAt("ReputationRegistry", deployment.contracts.ReputationRegistry);

  console.log("\n✅ Contracts loaded successfully");

  // Step 1: Grant roles
  console.log("\n🔑 Setting up roles...");
  const VERIFIER_ROLE = await InvoiceNFT.VERIFIER_ROLE();
  
  // Grant verifier role to deployer (acting as oracle)
  const hasRole = await InvoiceNFT.hasRole(VERIFIER_ROLE, deployer.address);
  if (!hasRole) {
    await InvoiceNFT.grantRole(VERIFIER_ROLE, deployer.address);
    console.log("  ✓ Granted VERIFIER_ROLE to deployer/oracle");
  }

  // Authorize funding contract to update reputation
  await ReputationRegistry.authorizeUpdater(deployment.contracts.Funding);
  console.log("  ✓ Authorized Funding contract for reputation updates");

  // Step 2: Mint USDC to participants
  console.log("\n💰 Distributing test USDC...");
  const usdcAmount = hre.ethers.parseUnits("100000", 6); // 100,000 USDC
  
  // Check and mint USDC
  const supplierBalance = await MockUSDC.balanceOf(supplier.address);
  if (supplierBalance < usdcAmount / 10n) {
    await MockUSDC.mint(supplier.address, usdcAmount / 10n); // 10,000 USDC
    console.log("  ✓ Minted 10,000 USDC to supplier");
  }
  
  const buyerBalance = await MockUSDC.balanceOf(buyer.address);
  if (buyerBalance < usdcAmount) {
    await MockUSDC.mint(buyer.address, usdcAmount); // 100,000 USDC
    console.log("  ✓ Minted 100,000 USDC to buyer");
  }
  
  const lenderBalance = await MockUSDC.balanceOf(lender.address);
  if (lenderBalance < usdcAmount) {
    await MockUSDC.mint(lender.address, usdcAmount); // 100,000 USDC
    console.log("  ✓ Minted 100,000 USDC to lender");
  }

  // Step 3: Create sample invoices
  console.log("\n📄 Creating sample invoices...");
  
  const sampleInvoices = [
    {
      supplier: supplier.address,
      buyer: buyer.address,
      invoiceNumber: "INV-2025-001",
      amount: hre.ethers.parseUnits("50000", 6), // 50,000 USDC
      dueDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      gstin: "29ABCDE1234F2Z5"
    },
    {
      supplier: supplier.address,
      buyer: buyer.address,
      invoiceNumber: "INV-2025-002",
      amount: hre.ethers.parseUnits("75000", 6), // 75,000 USDC
      dueDate: Math.floor(Date.now() / 1000) + (45 * 24 * 60 * 60), // 45 days
      gstin: "29ABCDE1234F2Z5"
    },
    {
      supplier: supplier.address,
      buyer: buyer.address,
      invoiceNumber: "INV-2025-003",
      amount: hre.ethers.parseUnits("30000", 6), // 30,000 USDC
      dueDate: Math.floor(Date.now() / 1000) + (60 * 24 * 60 * 60), // 60 days
      gstin: "29ABCDE1234F2Z5"
    }
  ];

  for (const invoice of sampleInvoices) {
    try {
      // Check if invoice already exists
      const invoiceHash = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes(JSON.stringify({
          supplier: invoice.supplier,
          buyer: invoice.buyer,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount.toString()
        }))
      );

      const exists = await InvoiceNFT.invoiceHashExists(invoiceHash);
      if (!exists) {
        // Mint NFT
        const mintTx = await InvoiceNFT.mintInvoice(
          invoice.supplier,
          invoice.buyer,
          invoiceHash,
          `ipfs://demo/${invoice.invoiceNumber}`
        );
        const mintReceipt = await mintTx.wait();
        
        // Get token ID from event
        const mintEvent = mintReceipt.logs.find(log => {
          try {
            const parsed = InvoiceNFT.interface.parseLog(log);
            return parsed.name === 'InvoiceMinted';
          } catch {
            return false;
          }
        });
        
        const tokenId = mintEvent.args.tokenId;
        
        // Register for funding
        await Funding.registerInvoice(
          tokenId,
          invoice.amount,
          invoice.buyer,
          invoice.dueDate
        );
        
        console.log(`  ✓ Created invoice ${invoice.invoiceNumber} (Token ID: ${tokenId})`);
        
        // First invoice: make it ready for funding (buyer accepts)
        if (invoice.invoiceNumber === "INV-2025-001") {
          const acceptTx = await Funding.connect(buyer).acceptInvoice(tokenId);
          await acceptTx.wait();
          console.log(`    ✓ Buyer accepted invoice ${invoice.invoiceNumber}`);
        }
      } else {
        console.log(`  ⚠ Invoice ${invoice.invoiceNumber} already exists`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create invoice ${invoice.invoiceNumber}:`, error.message);
    }
  }

  // Step 4: Save test accounts info
  console.log("\n💾 Saving test account information...");
  
  const testAccounts = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    accounts: {
      deployer: {
        address: deployer.address,
        privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        role: "Deployer/Oracle"
      },
      supplier: {
        address: supplier.address,
        privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        role: "MSME Supplier",
        usdcBalance: "10,000 USDC"
      },
      buyer: {
        address: buyer.address,
        privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        role: "Corporate Buyer",
        usdcBalance: "100,000 USDC"
      },
      lender: {
        address: lender.address,
        privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        role: "Investor/Lender",
        usdcBalance: "100,000 USDC"
      }
    },
    contracts: deployment.contracts,
    sampleInvoices: sampleInvoices.map((inv, idx) => ({
      tokenId: idx + 1,
      invoiceNumber: inv.invoiceNumber,
      amount: hre.ethers.formatUnits(inv.amount, 6) + " USDC",
      supplier: inv.supplier,
      buyer: inv.buyer,
      status: idx === 0 ? "Accepted by buyer - Ready for funding" : "Pending buyer acceptance"
    }))
  };
  
  const accountsPath = path.join(__dirname, "..", "deployments", "demoAccounts.json");
  fs.writeFileSync(accountsPath, JSON.stringify(testAccounts, null, 2));
  console.log("  ✓ Test accounts saved to:", accountsPath);

  // Step 5: Display summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEMO ENVIRONMENT READY!");
  console.log("=".repeat(60));
  
  console.log("\n📊 Summary:");
  console.log("  • 3 sample invoices created");
  console.log("  • 4 test accounts with roles and USDC");
  console.log("  • Invoice #1 accepted by buyer (ready for funding)");
  console.log("  • All participants have test USDC");
  
  console.log("\n🔐 Test Accounts for MetaMask:");
  console.log("  Import these private keys into MetaMask:\n");
  console.log("  Supplier: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log("  Buyer:    0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  console.log("  Lender:   0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
  
  console.log("\n🌐 Network Configuration:");
  console.log("  Network Name: Hardhat Local");
  console.log("  RPC URL: http://127.0.0.1:8545");
  console.log("  Chain ID: 31337");
  console.log("  Currency: ETH");
  
  console.log("\n✨ Ready to use the platform!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
