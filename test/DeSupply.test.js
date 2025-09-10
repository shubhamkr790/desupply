const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeSupply MVP Tests", function () {
  let mockUSDC, invoiceNFT, funding, reputationRegistry;
  let deployer, supplier, buyer, lender;
  const FACE_VALUE = ethers.parseUnits("50000", 6); // 50,000 USDC
  const PURCHASE_PRICE = ethers.parseUnits("46000", 6); // 46,000 USDC

  beforeEach(async function () {
    // Get signers
    [deployer, supplier, buyer, lender] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy InvoiceNFT
    const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
    invoiceNFT = await InvoiceNFT.deploy();
    await invoiceNFT.waitForDeployment();

    // Deploy Funding
    const Funding = await ethers.getContractFactory("Funding");
    funding = await Funding.deploy(
      await mockUSDC.getAddress(),
      await invoiceNFT.getAddress()
    );
    await funding.waitForDeployment();

    // Deploy ReputationRegistry
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationRegistry.deploy();
    await reputationRegistry.waitForDeployment();

    // Setup
    await funding.setReputationRegistry(await reputationRegistry.getAddress());
    await reputationRegistry.authorizeUpdater(await funding.getAddress());

    // Mint USDC to buyer and lender
    await mockUSDC.mint(buyer.address, ethers.parseUnits("100000", 6));
    await mockUSDC.mint(lender.address, ethers.parseUnits("100000", 6));
  });

  describe("Invoice NFT", function () {
    it("Should mint invoice NFT", async function () {
      const invoiceHash = ethers.keccak256(ethers.toUtf8Bytes("test-invoice"));
      
      await invoiceNFT.mintInvoice(
        supplier.address,
        buyer.address,
        invoiceHash,
        "ipfs://test"
      );

      const details = await invoiceNFT.getInvoiceDetails(1);
      expect(details[0]).to.equal(supplier.address);
      expect(details[1]).to.equal(buyer.address);
    });

    it("Should prevent duplicate invoice minting", async function () {
      const invoiceHash = ethers.keccak256(ethers.toUtf8Bytes("test-invoice"));
      
      await invoiceNFT.mintInvoice(
        supplier.address,
        buyer.address,
        invoiceHash,
        "ipfs://test"
      );

      await expect(
        invoiceNFT.mintInvoice(
          supplier.address,
          buyer.address,
          invoiceHash,
          "ipfs://test"
        )
      ).to.be.revertedWith("Invoice already minted");
    });
  });

  describe("Funding", function () {
    let tokenId;

    beforeEach(async function () {
      // Mint an invoice NFT
      const invoiceHash = ethers.keccak256(ethers.toUtf8Bytes("test-invoice"));
      const tx = await invoiceNFT.mintInvoice(
        supplier.address,
        buyer.address,
        invoiceHash,
        "ipfs://test"
      );
      const receipt = await tx.wait();
      tokenId = 1;

      // Register invoice for funding
      const dueDate = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      await funding.registerInvoice(tokenId, FACE_VALUE, buyer.address, dueDate);
    });

    it("Should allow buyer to accept invoice", async function () {
      await funding.connect(buyer).acceptInvoice(tokenId);
      
      const status = await funding.getInvoiceStatus(tokenId);
      expect(status[1]).to.be.true; // buyerAccepted
    });

    it("Should fund invoice and transfer funds to supplier", async function () {
      // Buyer accepts
      await funding.connect(buyer).acceptInvoice(tokenId);

      // Lender approves and funds
      await mockUSDC.connect(lender).approve(await funding.getAddress(), PURCHASE_PRICE);
      
      const supplierBalanceBefore = await mockUSDC.balanceOf(supplier.address);
      await funding.connect(lender).fundInvoiceWhole(tokenId, PURCHASE_PRICE);
      const supplierBalanceAfter = await mockUSDC.balanceOf(supplier.address);

      expect(supplierBalanceAfter - supplierBalanceBefore).to.equal(PURCHASE_PRICE);
    });

    it("Should settle invoice when buyer pays", async function () {
      // Setup: Accept and fund
      await funding.connect(buyer).acceptInvoice(tokenId);
      await mockUSDC.connect(lender).approve(await funding.getAddress(), PURCHASE_PRICE);
      await funding.connect(lender).fundInvoiceWhole(tokenId, PURCHASE_PRICE);

      // Buyer approves and pays
      await mockUSDC.connect(buyer).approve(await funding.getAddress(), FACE_VALUE);
      
      const lenderBalanceBefore = await mockUSDC.balanceOf(lender.address);
      await funding.connect(buyer).buyerPay(tokenId);
      const lenderBalanceAfter = await mockUSDC.balanceOf(lender.address);

      expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(FACE_VALUE);
      
      const status = await funding.getInvoiceStatus(tokenId);
      expect(status[3]).to.be.true; // settled
    });
  });

  describe("Reputation", function () {
    it("Should update reputation scores", async function () {
      await reputationRegistry.updateReputation(supplier.address, 10);
      
      const reputation = await reputationRegistry.getReputation(supplier.address);
      expect(reputation[0]).to.equal(110); // Starting 100 + 10
    });

    it("Should blacklist users with low reputation", async function () {
      // Reduce reputation to trigger blacklist
      await reputationRegistry.updateReputation(supplier.address, -95);
      
      const reputation = await reputationRegistry.getReputation(supplier.address);
      expect(reputation[1]).to.be.true; // blacklisted
    });
  });
});
