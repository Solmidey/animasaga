// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SagaRegistry.sol";

/// @title SagaCommit
/// @notice Records immutable commitments during active Episodes.
/// @dev Does NOT calculate results or tallies.
///      Chain is a witness, not a judge.
contract SagaCommit {
    SagaRegistry public registry;

    enum Alignment {
        FLAME,
        VEIL,
        ECHO,
        CROWN
    }

    mapping(bytes32 => bool) public commitmentUsed;

    event ChoiceCommitted(
        bytes32 indexed commitmentHash,
        uint256 indexed seasonId,
        uint256 indexed episodeId,
        Alignment alignment,
        uint256 blockNumber
    );

    constructor(address registryAddress) {
        require(registryAddress != address(0), "INVALID_REGISTRY");
        registry = SagaRegistry(registryAddress);
    }

    /// @notice Commit a choice during an active episode
    /// @param commitmentHash Hash of (wallet + episode + salt)
    /// @param seasonId Season identifier
    /// @param episodeId Episode identifier
    /// @param alignment Chosen alignment
    function commitChoice(
        bytes32 commitmentHash,
        uint256 seasonId,
        uint256 episodeId,
        Alignment alignment
    ) external {
        require(commitmentHash != bytes32(0), "INVALID_HASH");
        require(!commitmentUsed[commitmentHash], "COMMITMENT_REUSED");

        // Verify episode is active via registry
        require(registry.isEpisodeActive(episodeId), "EPISODE_INACTIVE");

        commitmentUsed[commitmentHash] = true;

        emit ChoiceCommitted(
            commitmentHash,
            seasonId,
            episodeId,
            alignment,
            block.number
        );
    }
}

