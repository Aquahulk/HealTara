// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/*
  OnchainMerkleKYCPublic.sol

  - On-chain Merkle root KYC registry with public verification.
  - Only Merkle roots + minimal metadata are stored on-chain.
  - Anyone can query whether credentials for a given userWallet match the stored Merkle root.
  - Important: Do NOT upload plaintext PII on-chain. Hash/salt leaves off-chain before creating Merkle tree.
*/

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract OnchainMerkleKYCPublic is AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct Claim {
        address issuer;      // issuer address
        bytes32 dataHash;    // Merkle root of KYC attributes
        uint256 timestamp;   // creation or last update time
        bool valid;          // revocation flag
        bytes signature;     // signature by issuer over dataHash (eth signed message)
        bytes32 idHash;      // optional salted identifier hash for uniqueness (zero if unused)
    }

    // claimKey => Claim
    mapping(bytes32 => Claim) private claims;

    // user wallet => latest claimKey (0 if none)
    mapping(address => bytes32) private latestClaimByWallet;

    // user wallet => array of claimKeys (history)
    mapping(address => bytes32[]) private claimHistoryByWallet;

    // optional uniqueness: idHash => claimKey
    mapping(bytes32 => bytes32) private idHashToClaim;

    // Events
    event ClaimRegistered(bytes32 indexed claimKey, address indexed userWallet, address indexed issuer, bytes32 dataHash, uint256 timestamp, bytes32 idHash);
    event ClaimUpdated(bytes32 indexed claimKey, address indexed userWallet, address indexed issuer, bytes32 newDataHash, uint256 timestamp);
    event ClaimRevoked(bytes32 indexed claimKey, address indexed userWallet, address indexed caller, uint256 timestamp);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    constructor(address admin) {
        require(admin != address(0), "admin zero address");
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(ISSUER_ROLE, admin);
    }

    modifier onlyIssuer() {
        require(hasRole(ISSUER_ROLE, msg.sender), "Caller is not an issuer");
        _;
    }

    // -------------------------
    // Helpers
    // -------------------------

    /// @notice Compute a deterministic claim key: keccak256(userIdHash || issuer)
    /// @param userWallet address of user wallet
    /// @param issuer address of issuer
    function computeClaimKeyForWallet(address userWallet, address issuer) public pure returns (bytes32) {
        bytes32 userIdHash = keccak256(abi.encodePacked(userWallet));
        return keccak256(abi.encodePacked(userIdHash, issuer));
    }

    /// @dev Recover signer that produced `signature` on `dataHash`.
    function _recoverSigner(bytes32 dataHash, bytes memory signature) internal pure returns (address) {
        bytes32 ethSigned = ECDSA.toEthSignedMessageHash(abi.encodePacked(dataHash));
        return ECDSA.recover(ethSigned, signature);
    }

    // -------------------------
    // Registration / Update / Revoke
    // -------------------------

    /// @notice Register a new KYC claim for a wallet. Only callable by an account with ISSUER_ROLE.
    /// @param userWallet address of the user being verified
    /// @param dataHash bytes32 Merkle root of KYC attributes
    /// @param signature issuer signature over dataHash (eth signed message)
    /// @param optionalIdHash optional salted ID hash for uniqueness (zero if unused)
    function registerClaimForWallet(
        address userWallet,
        bytes32 dataHash,
        bytes calldata signature,
        bytes32 optionalIdHash
    ) external onlyIssuer {
        require(userWallet != address(0), "userWallet zero");
        require(dataHash != bytes32(0), "dataHash zero");

        // Compute claimKey deterministically
        bytes32 claimKey = computeClaimKeyForWallet(userWallet, msg.sender);

        // Verify signature originates from issuer (msg.sender)
        address signer = _recoverSigner(dataHash, signature);
        require(signer == msg.sender, "signature not from issuer");

        // If optional ID used, enforce uniqueness
        if (optionalIdHash != bytes32(0)) {
            require(idHashToClaim[optionalIdHash] == bytes32(0), "idHash already registered");
            idHashToClaim[optionalIdHash] = claimKey;
        }

        // Short-circuit: if user already has a valid claim, reject new registration
        bytes32 existingClaimKey = latestClaimByWallet[userWallet];
        if (existingClaimKey != bytes32(0)) {
            Claim storage existing = claims[existingClaimKey];
            require(!existing.valid, "user already has a valid KYC claim");
            // allow registration only if existing claim was revoked/invalid
        }

        // prevent overwriting same issuer+user
        require(claims[claimKey].issuer == address(0), "claim already exists for this issuer and user");

        // Create claim
        claims[claimKey] = Claim({
            issuer: msg.sender,
            dataHash: dataHash,
            timestamp: block.timestamp,
            valid: true,
            signature: signature,
            idHash: optionalIdHash
        });

        // Update mappings
        latestClaimByWallet[userWallet] = claimKey;
        claimHistoryByWallet[userWallet].push(claimKey);

        emit ClaimRegistered(claimKey, userWallet, msg.sender, dataHash, block.timestamp, optionalIdHash);
    }

    /// @notice Update an existing claim for a wallet (only issuer who created it can update).
    /// @param userWallet address of user
    /// @param newDataHash new Merkle root
    /// @param newSignature signature by issuer over newDataHash
    function updateClaimForWallet(
        address userWallet,
        bytes32 newDataHash,
        bytes calldata newSignature
    ) external onlyIssuer {
        require(userWallet != address(0), "userWallet zero");
        require(newDataHash != bytes32(0), "newDataHash zero");

        bytes32 claimKey = computeClaimKeyForWallet(userWallet, msg.sender);
        Claim storage c = claims[claimKey];
        require(c.issuer != address(0), "claim not found");
        require(c.issuer == msg.sender, "only issuer can update");

        // verify signature
        address signer = _recoverSigner(newDataHash, newSignature);
        require(signer == msg.sender, "new signature invalid");

        c.dataHash = newDataHash;
        c.signature = newSignature;
        c.timestamp = block.timestamp;
        c.valid = true;

        // Make sure latest points to this claimKey
        latestClaimByWallet[userWallet] = claimKey;

        emit ClaimUpdated(claimKey, userWallet, msg.sender, newDataHash, block.timestamp);
    }

    /// @notice Revoke a claim. Can be called by issuer who created it or admin.
    /// @param userWallet address of user whose claim is being revoked
    /// @param issuerAddress address of issuer who created the claim
    function revokeClaimForWallet(address userWallet, address issuerAddress) external {
        require(userWallet != address(0), "userWallet zero");
        bytes32 claimKey = computeClaimKeyForWallet(userWallet, issuerAddress);
        Claim storage c = claims[claimKey];
        require(c.issuer != address(0), "claim not found");
        require(msg.sender == c.issuer || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not authorized");

        c.valid = false;
        c.timestamp = block.timestamp;

        // If this was latest claim, clear it
        if (latestClaimByWallet[userWallet] == claimKey) {
            latestClaimByWallet[userWallet] = bytes32(0);
        }

        emit ClaimRevoked(claimKey, userWallet, msg.sender, block.timestamp);
    }

    // -------------------------
    // Public Query / Verification
    // -------------------------

    /// @notice Public function: verify if the provided merkleRoot matches the stored Merkle root for userWallet
    /// @param userWallet address to check
    /// @param merkleRoot bytes32 merkle root to compare
    /// @return matched true if stored root exists, is valid, and equals merkleRoot
    function verifyKYC(address userWallet, bytes32 merkleRoot) external view returns (bool matched) {
        bytes32 claimKey = latestClaimByWallet[userWallet];
        if (claimKey == bytes32(0)) return false;
        Claim storage c = claims[claimKey];
        if (!c.valid) return false;
        return (c.dataHash == merkleRoot);
    }

    /// @notice Get KYC details by wallet (convenience public view)
    /// @param userWallet address to query
    /// @return issuer address of issuer who created latest claim
    /// @return merkleRoot stored Merkle root (zero if none)
    /// @return verifiedAt timestamp of latest claim (0 if none)
    /// @return isValid whether latest claim is valid
    /// @return idHash optional idHash (zero if unused)
    function getKYCDetailsByWallet(address userWallet) external view returns (
        address issuer,
        bytes32 merkleRoot,
        uint256 verifiedAt,
        bool isValid,
        bytes32 idHash
    ) {
        bytes32 claimKey = latestClaimByWallet[userWallet];
        if (claimKey == bytes32(0)) {
            return (address(0), bytes32(0), 0, false, bytes32(0));
        }
        Claim storage c = claims[claimKey];
        return (c.issuer, c.dataHash, c.timestamp, c.valid, c.idHash);
    }

    /// @notice Verify a Merkle proof for a leaf against the stored merkle root for the user's latest claim.
    /// @param userWallet address of user
    /// @param leaf bytes32 leaf (hash of attribute||value||salt) produced off-chain
    /// @param proof bytes32[] merkle proof
    /// @return valid whether the proof verifies against stored Merkle root
    function verifyMerkleProofLatest(address userWallet, bytes32 leaf, bytes32[] calldata proof) external view returns (bool valid) {
        bytes32 claimKey = latestClaimByWallet[userWallet];
        if (claimKey == bytes32(0)) return false;
        Claim storage c = claims[claimKey];
        if (!c.valid) return false;
        return MerkleProof.verify(proof, c.dataHash, leaf);
    }

    /// @notice Get number of claims recorded for a wallet
    function getClaimCountByWallet(address userWallet) external view returns (uint256) {
        return claimHistoryByWallet[userWallet].length;
    }

    /// @notice Get claimKey for wallet at index (0-based)
    function getClaimAtByWallet(address userWallet, uint256 index) external view returns (bytes32) {
        require(index < claimHistoryByWallet[userWallet].length, "index out of range");
        return claimHistoryByWallet[userWallet][index];
    }

    /// @notice Get Claim details by claimKey
    function getClaimByKey(bytes32 claimKey) external view returns (
        address issuer,
        bytes32 dataHash,
        uint256 timestamp,
        bool valid,
        bytes memory signature,
        bytes32 idHash
    ) {
        Claim storage c = claims[claimKey];
        return (c.issuer, c.dataHash, c.timestamp, c.valid, c.signature, c.idHash);
    }

    /// @notice Get claimKey mapped to an idHash (if uniqueness used)
    function getClaimForIdHash(bytes32 idHash) external view returns (bytes32) {
        return idHashToClaim[idHash];
    }

    // -------------------------
    // Admin / Issuer Management
    // -------------------------

    /// @notice Add an issuer (admin only)
    function addIssuer(address issuer) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "only admin");
        grantRole(ISSUER_ROLE, issuer);
        emit IssuerAdded(issuer);
    }

    /// @notice Remove an issuer (admin only)
    function removeIssuer(address issuer) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "only admin");
        revokeRole(ISSUER_ROLE, issuer);
        emit IssuerRemoved(issuer);
    }
}
