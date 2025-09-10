// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract InvoiceNFT is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    uint256 private _tokenIdCounter;

    // Mapping to track minted invoice hashes to prevent duplicates
    mapping(bytes32 => bool) public invoiceHashExists;
    mapping(uint256 => bytes32) public tokenToInvoiceHash;
    mapping(uint256 => address) public tokenSupplier;
    mapping(uint256 => address) public tokenBuyer;

    event InvoiceMinted(
        uint256 indexed tokenId,
        address indexed supplier,
        address indexed buyer,
        bytes32 invoiceHash,
        string tokenURI
    );

    constructor() ERC721("DeSupply Invoice NFT", "DSINV") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    function mintInvoice(
        address supplier,
        address buyer,
        bytes32 invoiceHash,
        string memory uri
    ) public onlyRole(VERIFIER_ROLE) returns (uint256) {
        require(!invoiceHashExists[invoiceHash], "Invoice already minted");
        require(supplier != address(0), "Invalid supplier address");
        require(buyer != address(0), "Invalid buyer address");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(supplier, tokenId);
        _setTokenURI(tokenId, uri);

        invoiceHashExists[invoiceHash] = true;
        tokenToInvoiceHash[tokenId] = invoiceHash;
        tokenSupplier[tokenId] = supplier;
        tokenBuyer[tokenId] = buyer;

        emit InvoiceMinted(tokenId, supplier, buyer, invoiceHash, uri);

        return tokenId;
    }

    function getInvoiceDetails(uint256 tokenId) public view returns (
        address supplier,
        address buyer,
        bytes32 invoiceHash,
        string memory uri
    ) {
        require(_exists(tokenId), "Token does not exist");
        
        supplier = tokenSupplier[tokenId];
        buyer = tokenBuyer[tokenId];
        invoiceHash = tokenToInvoiceHash[tokenId];
        uri = tokenURI(tokenId);
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId <= _tokenIdCounter;
    }

    // Override functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
