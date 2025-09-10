// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IInvoiceNFT {
    function getInvoiceDetails(uint256 tokenId) external view returns (
        address supplier,
        address buyer,
        bytes32 invoiceHash,
        string memory uri
    );
}

interface IReputationRegistry {
    function updateReputation(address user, int256 points) external;
}

contract Funding is Ownable, ReentrancyGuard {
    IERC20 public stablecoin;
    IInvoiceNFT public invoiceNFT;
    IReputationRegistry public reputationRegistry;

    struct Invoice {
        uint256 faceValue;
        address buyer;
        uint256 dueDate;
        bool registered;
        bool buyerAccepted;
    }

    struct FundingPosition {
        address funder;
        uint256 purchasePrice;
        uint256 faceValue;
        uint256 fundedAt;
        uint256 dueDate;
        bool settled;
        bool defaulted;
    }

    mapping(uint256 => Invoice) public invoices;
    mapping(uint256 => FundingPosition) public fundingPositions;
    mapping(uint256 => bool) public invoiceFunded;

    event InvoiceRegistered(uint256 indexed tokenId, uint256 faceValue, address buyer, uint256 dueDate);
    event BuyerAccepted(uint256 indexed tokenId, address buyer);
    event InvoiceFunded(uint256 indexed tokenId, address indexed funder, uint256 purchasePrice);
    event InvoiceSettled(uint256 indexed tokenId, address indexed funder, uint256 amount);
    event InvoiceDefaulted(uint256 indexed tokenId);

    constructor(address _stablecoin, address _invoiceNFT) Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoin);
        invoiceNFT = IInvoiceNFT(_invoiceNFT);
    }

    function setReputationRegistry(address _reputationRegistry) external onlyOwner {
        reputationRegistry = IReputationRegistry(_reputationRegistry);
    }

    function registerInvoice(
        uint256 tokenId,
        uint256 faceValue,
        address buyer,
        uint256 dueDate
    ) external onlyOwner {
        require(!invoices[tokenId].registered, "Invoice already registered");
        require(faceValue > 0, "Invalid face value");
        require(buyer != address(0), "Invalid buyer address");
        require(dueDate > block.timestamp, "Due date must be in future");

        invoices[tokenId] = Invoice({
            faceValue: faceValue,
            buyer: buyer,
            dueDate: dueDate,
            registered: true,
            buyerAccepted: false
        });

        emit InvoiceRegistered(tokenId, faceValue, buyer, dueDate);
    }

    function acceptInvoice(uint256 tokenId) external {
        Invoice storage invoice = invoices[tokenId];
        require(invoice.registered, "Invoice not registered");
        require(!invoice.buyerAccepted, "Already accepted");
        require(msg.sender == invoice.buyer, "Only buyer can accept");

        invoice.buyerAccepted = true;
        emit BuyerAccepted(tokenId, msg.sender);
    }

    function fundInvoiceWhole(uint256 tokenId, uint256 purchasePrice) external nonReentrant {
        Invoice storage invoice = invoices[tokenId];
        require(invoice.registered, "Invoice not registered");
        require(invoice.buyerAccepted, "Buyer has not accepted");
        require(!invoiceFunded[tokenId], "Invoice already funded");
        require(purchasePrice > 0 && purchasePrice <= invoice.faceValue, "Invalid purchase price");

        (address supplier, , , ) = invoiceNFT.getInvoiceDetails(tokenId);
        require(supplier != address(0), "Invalid invoice NFT");

        // Transfer funds from lender to supplier
        require(
            stablecoin.transferFrom(msg.sender, supplier, purchasePrice),
            "Transfer failed"
        );

        // Record funding position
        fundingPositions[tokenId] = FundingPosition({
            funder: msg.sender,
            purchasePrice: purchasePrice,
            faceValue: invoice.faceValue,
            fundedAt: block.timestamp,
            dueDate: invoice.dueDate,
            settled: false,
            defaulted: false
        });

        invoiceFunded[tokenId] = true;

        // Update reputation for supplier
        if (address(reputationRegistry) != address(0)) {
            reputationRegistry.updateReputation(supplier, 5);
        }

        emit InvoiceFunded(tokenId, msg.sender, purchasePrice);
    }

    function buyerPay(uint256 tokenId) external nonReentrant {
        Invoice storage invoice = invoices[tokenId];
        FundingPosition storage position = fundingPositions[tokenId];
        
        require(invoice.registered, "Invoice not registered");
        require(invoiceFunded[tokenId], "Invoice not funded");
        require(!position.settled, "Already settled");
        require(!position.defaulted, "Invoice defaulted");

        // Transfer face value from buyer to funder
        require(
            stablecoin.transferFrom(msg.sender, position.funder, invoice.faceValue),
            "Transfer failed"
        );

        position.settled = true;

        // Update reputation
        if (address(reputationRegistry) != address(0)) {
            (address supplier, , , ) = invoiceNFT.getInvoiceDetails(tokenId);
            reputationRegistry.updateReputation(supplier, 10);
            reputationRegistry.updateReputation(invoice.buyer, 5);
            reputationRegistry.updateReputation(position.funder, 3);
        }

        emit InvoiceSettled(tokenId, position.funder, invoice.faceValue);
    }

    function markDefault(uint256 tokenId) external onlyOwner {
        FundingPosition storage position = fundingPositions[tokenId];
        Invoice storage invoice = invoices[tokenId];
        
        require(invoiceFunded[tokenId], "Invoice not funded");
        require(!position.settled, "Already settled");
        require(block.timestamp > invoice.dueDate, "Not past due date");

        position.defaulted = true;

        // Update reputation negatively
        if (address(reputationRegistry) != address(0)) {
            (address supplier, , , ) = invoiceNFT.getInvoiceDetails(tokenId);
            reputationRegistry.updateReputation(supplier, -20);
            reputationRegistry.updateReputation(invoice.buyer, -15);
        }

        emit InvoiceDefaulted(tokenId);
    }

    function getInvoiceStatus(uint256 tokenId) external view returns (
        bool registered,
        bool buyerAccepted,
        bool funded,
        bool settled,
        bool defaulted
    ) {
        Invoice storage invoice = invoices[tokenId];
        FundingPosition storage position = fundingPositions[tokenId];
        
        registered = invoice.registered;
        buyerAccepted = invoice.buyerAccepted;
        funded = invoiceFunded[tokenId];
        settled = position.settled;
        defaulted = position.defaulted;
    }
}
