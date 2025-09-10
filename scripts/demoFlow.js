const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🎬 Starting DeSupply Demo Flow\n");
  
  // Get signers
  const [deployer, supplier, buyer, lender] = await hre.ethers.getSigners();
  
  console.log("📝 Account Setup:");
  console.log("  Deployer:", deployer.address);
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
  
  // Step 1: Setup - Mint USDC to participants
  console.log("\n💰 Step 1: Minting test USDC...");
  const usdcAmount = 100000n * 10n ** 6n; // 100,000 USDC
  
  await MockUSDC.mint(buyer.address, usdcAmount);
  console.log("  ✓ Minted 100,000 USDC to buyer");
  
  await MockUSDC.mint(lender.address, usdcAmount);
  console.log("  ✓ Minted 100,000 USDC to lender");
  
  // Step 2: Create and mint invoice NFT
  console.log("\n📄 Step 2: Creating invoice NFT...");
  
  const invoiceData = {
    supplier: supplier.address,
    buyer: buyer.address,
    invoiceNumber: "INV-DEMO-001",
    amount: 50000n * 10n ** 6n, // 50,000 USDC face value
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
  };
  
  const invoiceHash = hre.ethers.keccak256(
    hre.ethers.toUtf8Bytes(JSON.stringify(invoiceData))
  );
  
  const mintTx = await InvoiceNFT.mintInvoice(
    supplier.address,
    buyer.address,
    invoiceHash,
    "ipfs://demo-invoice-metadata"
  );
  
  const mintReceipt = await mintTx.wait();
  const mintEvent = mintReceipt.logs.find(log => {
    try {
      const parsed = InvoiceNFT.interface.parseLog(log);
      return parsed.name === 'InvoiceMinted';
    } catch {
      return false;
    }
  });
  
  const tokenId = mintEvent.args.tokenId;
  console.log("  ✓ Invoice NFT minted with tokenId:", tokenId.toString());
  
  // Step 3: Register invoice for funding
  console.log("\n💼 Step 3: Registering invoice for funding...");
  
  const dueTimestamp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const registerTx = await Funding.registerInvoice(
    tokenId,
    invoiceData.amount,
    buyer.address,
    dueTimestamp
  );
  await registerTx.wait();
  console.log("  ✓ Invoice registered for funding");
  
  // Step 4: Buyer accepts invoice
  console.log("\n✅ Step 4: Buyer accepting invoice...");
  
  const acceptTx = await Funding.connect(buyer).acceptInvoice(tokenId);
  await acceptTx.wait();
  console.log("  ✓ Invoice accepted by buyer");
  
  // Step 5: Lender funds the invoice
  console.log("\n💸 Step 5: Lender funding invoice...");
  
  const purchasePrice = 46000n * 10n ** 6n; // 46,000 USDC (92% of face value)
  
  // Approve USDC spending
  const approveTx = await MockUSDC.connect(lender).approve(
    deployment.contracts.Funding,
    purchasePrice
  );
  await approveTx.wait();
  console.log("  ✓ USDC spending approved");
  
  // Check supplier balance before
  const supplierBalanceBefore = await MockUSDC.balanceOf(supplier.address);
  console.log("  Supplier balance before:", hre.ethers.formatUnits(supplierBalanceBefore, 6), "USDC");
  
  // Fund the invoice
  const fundTx = await Funding.connect(lender).fundInvoiceWhole(tokenId, purchasePrice);
  await fundTx.wait();
  console.log("  ✓ Invoice funded by lender");
  
  // Check supplier balance after
  const supplierBalanceAfter = await MockUSDC.balanceOf(supplier.address);
  console.log("  Supplier balance after:", hre.ethers.formatUnits(supplierBalanceAfter, 6), "USDC");
  console.log("  ✓ Supplier received:", hre.ethers.formatUnits(purchasePrice, 6), "USDC immediately");
  
  // Step 6: Check invoice status
  console.log("\n📊 Step 6: Checking invoice status...");
  
  const status = await Funding.getInvoiceStatus(tokenId);
  console.log("  Invoice Status:");
  console.log("    - Registered:", status[0]);
  console.log("    - Buyer Accepted:", status[1]);
  console.log("    - Funded:", status[2]);
  console.log("    - Settled:", status[3]);
  console.log("    - Defaulted:", status[4]);
  
  // Step 7: Buyer pays invoice (settlement)
  console.log("\n💳 Step 7: Buyer settling invoice...");
  
  // Approve USDC for payment
  const paymentApproveTx = await MockUSDC.connect(buyer).approve(
    deployment.contracts.Funding,
    invoiceData.amount
  );
  await paymentApproveTx.wait();
  console.log("  ✓ Payment approved");
  
  // Check lender balance before
  const lenderBalanceBefore = await MockUSDC.balanceOf(lender.address);
  console.log("  Lender balance before:", hre.ethers.formatUnits(lenderBalanceBefore, 6), "USDC");
  
  // Execute payment
  const payTx = await Funding.connect(buyer).buyerPay(tokenId);
  await payTx.wait();
  console.log("  ✓ Invoice paid by buyer");
  
  // Check lender balance after
  const lenderBalanceAfter = await MockUSDC.balanceOf(lender.address);
  console.log("  Lender balance after:", hre.ethers.formatUnits(lenderBalanceAfter, 6), "USDC");
  
  const profit = lenderBalanceAfter - lenderBalanceBefore;
  console.log("  ✓ Lender received face value:", hre.ethers.formatUnits(invoiceData.amount, 6), "USDC");
  console.log("  ✓ Lender profit:", hre.ethers.formatUnits(profit, 6), "USDC");
  
  // Step 8: Check final status and reputation
  console.log("\n🏆 Step 8: Checking final status and reputation...");
  
  const finalStatus = await Funding.getInvoiceStatus(tokenId);
  console.log("  Final Invoice Status:");
  console.log("    - Settled:", finalStatus[3]);
  
  // Check reputation scores
  const supplierRep = await ReputationRegistry.getReputation(supplier.address);
  const buyerRep = await ReputationRegistry.getReputation(buyer.address);
  const lenderRep = await ReputationRegistry.getReputation(lender.address);
  
  console.log("\n  Reputation Scores:");
  console.log("    - Supplier:", supplierRep[0].toString());
  console.log("    - Buyer:", buyerRep[0].toString());
  console.log("    - Lender:", lenderRep[0].toString());
  
  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 DEMO COMPLETE!");
  console.log("=".repeat(50));
  console.log("\n📈 Summary:");
  console.log("  1. Invoice created and tokenized as NFT");
  console.log("  2. Supplier received instant funding (92% of invoice value)");
  console.log("  3. Lender earned 8% return on investment");
  console.log("  4. Settlement automated through smart contracts");
  console.log("  5. Reputation scores updated for all parties");
  console.log("\n✨ DeSupply successfully demonstrated end-to-end invoice financing!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
