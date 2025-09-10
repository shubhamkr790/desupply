const hre = require("hardhat");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { expect } = require("chai");

async function testBackendAPI() {
  console.log("\n📡 Testing Backend API...");
  
  try {
    // Test health endpoint
    const health = await axios.get("http://localhost:3333/health");
    expect(health.data.status).to.equal("ok");
    console.log("  ✓ Health check passed");
    
    // Test contract addresses endpoint
    const contracts = await axios.get("http://localhost:3333/api/contracts");
    expect(contracts.data).to.have.property("invoiceNFT");
    expect(contracts.data).to.have.property("funding");
    expect(contracts.data).to.have.property("mockUSDC");
    console.log("  ✓ Contract addresses endpoint working");
    
    // Test verified invoices endpoint
    const invoices = await axios.get("http://localhost:3333/api/invoices/verified");
    expect(invoices.data).to.have.property("success");
    console.log("  ✓ Invoices endpoint working");
    
    return true;
  } catch (error) {
    console.error("  ❌ Backend API test failed:", error.message);
    return false;
  }
}

async function testSmartContracts() {
  console.log("\n📜 Testing Smart Contracts...");
  
  try {
    const [deployer, supplier, buyer, lender] = await hre.ethers.getSigners();
    
    // Load deployment
    const deploymentPath = path.join(__dirname, "..", "deployments", "hardhat.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    // Get contracts
    const MockUSDC = await hre.ethers.getContractAt("MockUSDC", deployment.contracts.MockUSDC);
    const InvoiceNFT = await hre.ethers.getContractAt("InvoiceNFT", deployment.contracts.InvoiceNFT);
    const Funding = await hre.ethers.getContractAt("Funding", deployment.contracts.Funding);
    
    // Test USDC balance
    const supplierBalance = await MockUSDC.balanceOf(supplier.address);
    expect(supplierBalance).to.be.gt(0);
    console.log("  ✓ USDC balances configured");
    
    // Test invoice NFT exists
    const tokenExists = await InvoiceNFT.tokenSupplier(1);
    expect(tokenExists).to.not.equal("0x0000000000000000000000000000000000000000");
    console.log("  ✓ Invoice NFTs minted");
    
    // Test funding contract
    const invoiceStatus = await Funding.getInvoiceStatus(1);
    expect(invoiceStatus[0]).to.be.true; // registered
    console.log("  ✓ Invoices registered for funding");
    
    return true;
  } catch (error) {
    console.error("  ❌ Smart contract test failed:", error.message);
    return false;
  }
}

async function testCompleteFlow() {
  console.log("\n🔄 Testing Complete Flow...");
  
  try {
    const [deployer, supplier, buyer, lender] = await hre.ethers.getSigners();
    
    // Load contracts
    const deploymentPath = path.join(__dirname, "..", "deployments", "hardhat.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const MockUSDC = await hre.ethers.getContractAt("MockUSDC", deployment.contracts.MockUSDC);
    const Funding = await hre.ethers.getContractAt("Funding", deployment.contracts.Funding);
    
    // Find an accepted invoice
    const invoiceStatus = await Funding.getInvoiceStatus(1);
    
    if (invoiceStatus[1]) { // buyerAccepted
      console.log("  ✓ Invoice #1 is accepted by buyer");
      
      if (!invoiceStatus[2]) { // not yet funded
        // Test funding flow
        const purchasePrice = hre.ethers.parseUnits("46000", 6); // 46,000 USDC
        
        // Approve and fund
        await MockUSDC.connect(lender).approve(deployment.contracts.Funding, purchasePrice);
        await Funding.connect(lender).fundInvoiceWhole(1, purchasePrice);
        
        console.log("  ✓ Successfully funded invoice #1");
        
        // Test settlement
        const faceValue = hre.ethers.parseUnits("50000", 6);
        await MockUSDC.connect(buyer).approve(deployment.contracts.Funding, faceValue);
        await Funding.connect(buyer).buyerPay(1);
        
        console.log("  ✓ Successfully settled invoice #1");
      } else {
        console.log("  ⚠ Invoice #1 already funded");
      }
    } else {
      console.log("  ⚠ Invoice #1 not accepted by buyer");
    }
    
    return true;
  } catch (error) {
    console.error("  ❌ Complete flow test failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 DeSupply Integration Tests");
  console.log("=".repeat(60));
  
  let allPassed = true;
  
  // Wait for services to be ready
  console.log("\n⏳ Waiting for services to start...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test backend API
  const apiTest = await testBackendAPI();
  allPassed = allPassed && apiTest;
  
  // Test smart contracts
  const contractTest = await testSmartContracts();
  allPassed = allPassed && contractTest;
  
  // Test complete flow
  const flowTest = await testCompleteFlow();
  allPassed = allPassed && flowTest;
  
  // Summary
  console.log("\n" + "=".repeat(60));
  if (allPassed) {
    console.log("✅ ALL INTEGRATION TESTS PASSED!");
    console.log("\n🎉 DeSupply platform is fully operational!");
    console.log("\n📌 Next Steps:");
    console.log("  1. Open http://localhost:5173 in your browser");
    console.log("  2. Connect MetaMask with test accounts");
    console.log("  3. Try the complete invoice financing flow");
  } else {
    console.log("❌ Some tests failed. Please check the errors above.");
  }
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
