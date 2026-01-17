// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SagaRegistry.sol";

contract SagaCommit {
    SagaRegistry public registry;

    struct Commitment {
        uint256 sagaId;
        uint256 season;
        bytes32 commitmentHash;
        uint256 timestamp;
    }

    mapping(address => Commitment) public commitments;

    event Committed(
        address indexed user,
        uint256 sagaId,
        uint256 season,
        bytes32 commitmentHash
    );

    constructor(address registryAddress) {
        registry = SagaRegistry(registryAddress);
    }

    function commit(bytes32 commitmentHash, uint256 sagaId, uint256 season)
        external
    {
        (bool registered,, , bool locked) = registry.getState(msg.sender);
        require(registered, "Not registered");
        require(!locked, "Already committed this season");

        registry.lockSeason(msg.sender, sagaId, season);

        commitments[msg.sender] = Commitment({
            sagaId: sagaId,
            season: season,
            commitmentHash: commitmentHash,
            timestamp: block.timestamp
        });

        emit Committed(msg.sender, sagaId, season, commitmentHash);
    }
}
