// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SagaRegistry
/// @notice Canonical registry of Saga participants and season locks
contract SagaRegistry {
    struct Participant {
        bool registered;
        uint256 sagaId;
        uint256 seasonId;
        bool locked;
    }

    mapping(address => Participant) private participants;

    event Registered(address indexed user);
    event SeasonLocked(address indexed user, uint256 sagaId, uint256 seasonId);

    modifier onlyRegistered(address user) {
        require(participants[user].registered, "SagaRegistry: not registered");
        _;
    }

    /// @notice Register once into the Saga system
    function register() external {
        require(!participants[msg.sender].registered, "SagaRegistry: already registered");

        participants[msg.sender] = Participant({
            registered: true,
            sagaId: 0,
            seasonId: 0,
            locked: false
        });

        emit Registered(msg.sender);
    }

    /// @notice Lock a user into a saga + season (irreversible)
    function lockSeason(
        address user,
        uint256 sagaId,
        uint256 seasonId
    ) external onlyRegistered(user) {
        Participant storage p = participants[user];
        require(!p.locked, "SagaRegistry: already locked");

        p.sagaId = sagaId;
        p.seasonId = seasonId;
        p.locked = true;

        emit SeasonLocked(user, sagaId, seasonId);
    }

    /// @notice Read participant state
    function getState(address user)
        external
        view
        returns (
            bool registered,
            uint256 sagaId,
            uint256 seasonId,
            bool locked
        )
    {
        Participant memory p = participants[user];
        return (p.registered, p.sagaId, p.seasonId, p.locked);
    }

    function isLocked(address user) external view returns (bool) {
        return participants[user].locked;
    }
}
