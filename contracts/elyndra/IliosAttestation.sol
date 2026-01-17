// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title IliosAttestation
/// @notice Soulbound proof of rare historical participation
contract IliosAttestation is ERC721 {
    address public immutable issuer;
    uint256 public totalMinted;

    mapping(address => bool) public hasIlios;

    event IliosGranted(address indexed bearer, uint256 tokenId);

    modifier onlyIssuer() {
        require(msg.sender == issuer, "Ilios: not authorized");
        _;
    }

    constructor(address issuerAddress)
        ERC721("Ilios Attestation", "ILIOS")
    {
        require(issuerAddress != address(0), "Ilios: invalid issuer");
        issuer = issuerAddress;
    }

    /// @notice Grant Ilios once per address
    function grant(address to) external onlyIssuer {
        require(!hasIlios[to], "Ilios: already granted");

        uint256 tokenId = ++totalMinted;
        hasIlios[to] = true;

        _mint(to, tokenId);

        emit IliosGranted(to, tokenId);
    }

    /// @dev Soulbound enforcement
    function _transfer(
        address,
        address,
        uint256
    ) internal pure override {
        revert("Ilios: non-transferable");
    }
}
