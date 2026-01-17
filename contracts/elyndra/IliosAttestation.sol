// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract IliosAttestation is ERC721 {
    uint256 public totalMinted;
    mapping(address => bool) public hasIlios;

    address public issuer;

    event IliosGranted(address indexed bearer);

    modifier onlyIssuer() {
        require(msg.sender == issuer, "Not authorized");
        _;
    }

    constructor(address issuerAddress)
        ERC721("Ilios Attestation", "ILIOS")
    {
        issuer = issuerAddress;
    }

    function grant(address to) external onlyIssuer {
        require(!hasIlios[to], "Already holds Ilios");

        uint256 tokenId = ++totalMinted;
        hasIlios[to] = true;

        _mint(to, tokenId);

        emit IliosGranted(to);
    }

    function _transfer(
        address,
        address,
        uint256
    ) internal pure override {
        revert("Ilios is soulbound");
    }
}

