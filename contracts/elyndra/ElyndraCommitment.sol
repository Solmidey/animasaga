// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/SagaCommit.sol";

contract ElyndraCommitment is SagaCommit {
    enum Faction {
        Flame,
        Veil,
        Echo,
        Crown
    }

    mapping(address => Faction) public factionChoice;

    event FactionChosen(address indexed user, Faction faction);

    constructor(address registryAddress)
        SagaCommit(registryAddress)
    {}

    function chooseFaction(Faction faction) external {
        bytes32 commitmentHash = keccak256(
            abi.encodePacked(msg.sender, faction, block.number)
        );

        // Saga 1, Season 1 (hardcoded intentionally)
        commit(commitmentHash, 1, 1);

        factionChoice[msg.sender] = faction;

        emit FactionChosen(msg.sender, faction);
    }
}

