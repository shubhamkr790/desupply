// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ReputationRegistry is Ownable {
    struct ReputationRecord {
        int256 score;
        bool blacklisted;
        uint256 totalTransactions;
        uint256 successfulTransactions;
        uint256 defaultedTransactions;
        uint256 lastUpdated;
    }

    mapping(address => ReputationRecord) public reputations;
    mapping(address => bool) public authorizedUpdaters;

    event ReputationUpdated(address indexed user, int256 newScore, int256 change);
    event UserBlacklisted(address indexed user);
    event UserWhitelisted(address indexed user);
    event UpdaterAuthorized(address indexed updater);
    event UpdaterRevoked(address indexed updater);

    constructor() Ownable(msg.sender) {
        authorizedUpdaters[msg.sender] = true;
    }

    modifier onlyAuthorized() {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    function authorizeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = true;
        emit UpdaterAuthorized(updater);
    }

    function revokeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
        emit UpdaterRevoked(updater);
    }

    function updateReputation(address user, int256 points) external onlyAuthorized {
        require(user != address(0), "Invalid user address");
        require(!reputations[user].blacklisted, "User is blacklisted");

        ReputationRecord storage record = reputations[user];
        
        // Initialize if new user
        if (record.lastUpdated == 0) {
            record.score = 100; // Starting score
        }

        int256 oldScore = record.score;
        record.score += points;
        
        // Ensure score doesn't go below 0
        if (record.score < 0) {
            record.score = 0;
        }
        
        // Update transaction counts
        record.totalTransactions++;
        if (points > 0) {
            record.successfulTransactions++;
        } else if (points < -10) {
            record.defaultedTransactions++;
        }
        
        record.lastUpdated = block.timestamp;

        // Auto-blacklist if score drops too low
        if (record.score <= 10) {
            record.blacklisted = true;
            emit UserBlacklisted(user);
        }

        emit ReputationUpdated(user, record.score, points);
    }

    function blacklistUser(address user) external onlyOwner {
        require(user != address(0), "Invalid user address");
        reputations[user].blacklisted = true;
        emit UserBlacklisted(user);
    }

    function whitelistUser(address user) external onlyOwner {
        require(user != address(0), "Invalid user address");
        reputations[user].blacklisted = false;
        emit UserWhitelisted(user);
    }

    function getReputation(address user) external view returns (
        int256 score,
        bool blacklisted,
        uint256 totalTransactions,
        uint256 successfulTransactions,
        uint256 defaultedTransactions
    ) {
        ReputationRecord memory record = reputations[user];
        
        // Return default score for new users
        if (record.lastUpdated == 0) {
            return (100, false, 0, 0, 0);
        }
        
        return (
            record.score,
            record.blacklisted,
            record.totalTransactions,
            record.successfulTransactions,
            record.defaultedTransactions
        );
    }

    function isUserTrusted(address user) external view returns (bool) {
        ReputationRecord memory record = reputations[user];
        
        // New users get benefit of doubt
        if (record.lastUpdated == 0) {
            return true;
        }
        
        return !record.blacklisted && record.score >= 50;
    }
}
