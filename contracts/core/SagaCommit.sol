// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SagaRegistry.sol";

/// @title SagaCommit
/// @notice Generic irreversible commitment engine
contract SagaCommit {
    SagaRegistry public immutable registry;

    struct Commitment {
        uint256 sagaId;
        uint256 seasonId;
        bytes32 commitmentHash;
        uint256 blockNumber;
    }

    mapping(address => Commitment) public commitments;

    event Committed(
        address indexed user,
        uint256 sagaId,
        uint256 seasonId,
        bytes32 commitmentHash
    );

    constructor(address registryAddress) {
        require(registryAddress != address(0), "SagaCommit: invalid registry");
        registry = SagaRegistry(registryAddress);
    }

    /// @notice Commit once per season (final)
    function _commit(
        address user,
        bytes32 commitmentHash,
        uint256 sagaId,
        uint256 seasonId
    ) internal {
        (bool registered,, , bool locked) = registry.getState(user);
        require(registered, "SagaCommit: not registered");
        require(!locked, "SagaCommit: already committed");

        registry.lockSeason(user, sagaId, seasonId);

        commitments[user] = Commitment({
            sagaId: sagaId,
            seasonId: seasonId,
            commitmentHash: commitmentHash,
            blockNumber: block.number
        });

        emit Committed(user, sagaId, seasonId, commitmentHash);
    }
}
