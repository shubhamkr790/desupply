const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Setting up test accounts...");
  
  const [deployer] = await hre.ethers.getSigners();
  
  // Read deployment info
  const deploymentPath = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    console.error("Deployment file not found. Run deploy script first.");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  // Get contract instances
  const mockUSDC = await hre.ethers.getContractAt("MockUSDC", deployment.contracts.MockUSDC);
  const invoiceNFT = await hre.ethers.getContractAt("InvoiceNFT", deployment.contracts.InvoiceNFT);
  
  // Create test wallets
  const supplier = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  const buyer = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  const lender = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  const oracle = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  
  console.log("\n📝 Test Accounts Created:");
  console.log("========================");
  console.log("Supplier Address:", supplier.address);
  console.log("Supplier Private Key:", supplier.privateKey);
  console.log("\nBuyer Address:", buyer.address);
  console.log("Buyer Private Key:", buyer.privateKey);
  console.log("\nLender Address:", lender.address);
  console.log("Lender Private Key:", lender.privateKey);
  console.log("\nOracle Address:", oracle.address);
  console.log("Oracle Private Key:", oracle.privateKey);
  console.log("========================\n");
  
  // Send ETH to test accounts for gas
  console.log("Sending ETH to test accounts...");
  const ethAmount = hre.ethers.parseEther("0.1");
  
  await deployer.sendTransaction({ to: supplier.address, value: ethAmount });
  console.log("- Sent 0.1 ETH to supplier");
  
  await deployer.sendTransaction({ to: buyer.address, value: ethAmount });
  console.log("- Sent 0.1 ETH to buyer");
  
  await deployer.sendTransaction({ to: lender.address, value: ethAmount });
  console.log("- Sent 0.1 ETH to lender");
  
  await deployer.sendTransaction({ to: oracle.address, value: ethAmount });
  console.log("- Sent 0.1 ETH to oracle");
  
  // Mint test USDC
  console.log("\nMinting test USDC...");
  const usdcAmount = 100000n * 10n ** 6n; // 100,000 USDC (6 decimals)
  
  await mockUSDC.mint(supplier.address, usdcAmount / 10n); // 10,000 USDC to supplier
  console.log("- Minted 10,000 USDC to supplier");
  
  await mockUSDC.mint(buyer.address, usdcAmount); // 100,000 USDC to buyer  
  console.log("- Minted 100,000 USDC to buyer");
  
  await mockUSDC.mint(lender.address, usdcAmount); // 100,000 USDC to lender
  console.log("- Minted 100,000 USDC to lender");
  
  // Grant oracle role
  console.log("\nGranting Oracle role...");
  const VERIFIER_ROLE = await invoiceNFT.VERIFIER_ROLE();
  await invoiceNFT.grantRole(VERIFIER_ROLE, oracle.address);
  console.log("- Granted VERIFIER_ROLE to oracle");
  
  // Save test accounts
  const testAccounts = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    accounts: {
      supplier: {
        address: supplier.address,
        privateKey: supplier.privateKey,
        ethBalance: "0.1 ETH",
        usdcBalance: "10,000 USDC"
      },
      buyer: {
        address: buyer.address,
        privateKey: buyer.privateKey,
        ethBalance: "0.1 ETH",
        usdcBalance: "100,000 USDC"
      },
      lender: {
        address: lender.address,
        privateKey: lender.privateKey,
        ethBalance: "0.1 ETH",
        usdcBalance: "100,000 USDC"
      },
      oracle: {
        address: oracle.address,
        privateKey: oracle.privateKey,
        ethBalance: "0.1 ETH",
        roles: ["VERIFIER_ROLE"]
      }
    }
  };
  
  const accountsPath = path.join(__dirname, "..", "deployments", "testAccounts.json");
  fs.writeFileSync(accountsPath, JSON.stringify(testAccounts, null, 2));
  
  console.log("\n✅ Test accounts setup complete!");
  console.log("Test accounts saved to:", accountsPath);
  
  console.log("\n🔐 Add these to your .env file:");
  console.log("================================");
  console.log(`SUPPLIER_PRIVATE_KEY=${supplier.privateKey}`);
  console.log(`BUYER_PRIVATE_KEY=${buyer.privateKey}`);
  console.log(`LENDER_PRIVATE_KEY=${lender.privateKey}`);
  console.log(`ORACLE_PRIVATE_KEY=${oracle.privateKey}`);
  console.log("================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
