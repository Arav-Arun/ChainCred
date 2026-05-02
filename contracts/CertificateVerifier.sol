// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChainCred Certificate Verifier
 * @author Arav Arun
 * @notice A decentralized system to issue and verify tamper-proof digital credentials
 */

contract CertificateVerifier
{
    // Keep track of who issued which certificate (hash -> wallet address)
    mapping(string => address) public issuers;

    // Keep track of revoked certificates (hash is true if revoked)
    mapping(string => bool) public revoked;

    /*
    Emitted when a new certificate is created on the blockchain,
    This is how we are saving gas fees by avoiding saving heavy strings on the blockchain active memory, instead we emit an event log 
    */
    event CertificateStored(
        string hash,
        address indexed issuer, //Used in populating the issued certificates list
        string studentName,
        string courseName,
        string issuedDate,
        string issuedBy
    );

    // Emitted when an issuer decides to revoke a certificate
    event CertificateRevoked(string hash, address revokedBy);

    /**
     * @notice Issue a new certificate and permanently store its details on Ethereum
     */

    // Using calldata instead of memory for the strings as its slightly cheaper on gas when passing read only arguments to external functions
    function storeCertificate(
        string calldata hash,
        string calldata studentName,
        string calldata courseName,
        string calldata issuedDate,
        string calldata issuedBy
    ) external {
        // Prevent duplicate certificate hashes
        require(issuers[hash] == address(0), "Certificate hash already exists");
        
        // Record the wallet address of the issuer
        issuers[hash] = msg.sender;
        
        // Broadcasts the event to the Blockchain logs,  officially storing the certificate details in history
        emit CertificateStored(hash, msg.sender, studentName, courseName, issuedDate, issuedBy);
    }

    /**
     * @notice Check if a certificate is authentic and hasn't been revoked
     */
    function verifyCertificate(string calldata hash) external view returns (bool) {
        // Must have an issuer AND must not be revoked
        return issuers[hash] != address(0) && !revoked[hash];
    }

    /**
     * @notice Revoke an existing certificate
     * @dev Only the wallet that originally issued the certificate can revoke it
     */
    function revokeCertificate(string calldata hash) external {
        require(issuers[hash] == msg.sender, "Only the original issuer can revoke this certificate");
        require(!revoked[hash], "Certificate is already revoked");
        
        revoked[hash] = true;
        emit CertificateRevoked(hash, msg.sender);
    }
}
