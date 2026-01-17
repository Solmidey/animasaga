// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/SagaCommit.sol";

/// @title ElyndraCommitment
/// @notice Season 1 faction alignment for Elyndra
contract ElyndraCommitment is SagaCommit {
    uint256 public constant SAGA_ID = 1;
    uint256 public constant SEASON_ID = 1;

    /// @dev Set this before deployment
    uint256 public immutable SEASON_END_BLOCK;

    enum Faction {
        Flame,
        Veil,
        Echo,
        CrownPlaceholder // Crown is emergent; placeholder prevents enum reuse
    }

    mapping(address => Faction) public factionOf;
    mapping(address => bool) public hasChosen;

    event FactionChosen(address indexed user, Faction faction);

    modifier seasonActive() {
        require(block.number < SEASON_END_BLOCK, "Elyndra: season ended");
        _;
    }

    constructor(
        address registryAddress,
        uint256 seasonEndBlock
    ) SagaCommit(registryAddress) {
        require(seasonEndBlock > block.number, "Elyndra: invalid end block");
        SEASON_END_BLOCK = seasonEndBlock;
    }

    /// @notice Choose faction once for Season 1 (irreversible)
    function chooseFaction(Faction faction) external seasonActive {
        require(!hasChosen[msg.sender], "Elyndra: already chosen");
        require(
            faction == Faction.Flame ||
            faction == Faction.Veil ||
            faction == Faction.Echo,
            "Elyndra: invalid faction"
        );

        bytes32 commitmentHash = keccak256(
            abi.encodePacked(msg.sender, faction, SAGA_ID, SEASON_ID)
        );

        _commit(msg.sender, commitmentHash, SAGA_ID, SEASON_ID);

        hasChosen[msg.sender] = true;
        factionOf[msg.sender] = faction;

        emit FactionChosen(msg.sender, faction);
    }
}
