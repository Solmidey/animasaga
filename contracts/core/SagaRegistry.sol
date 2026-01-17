// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SagaRegistry {
    struct Participant {
        bool registered;
        uint256 activeSaga;
        uint256 activeSeason;
        bool locked;
    }

    mapping(address => Participant) private participants;

    event Registered(address indexed user);
    event SeasonLocked(address indexed user, uint256 sagaId, uint256 season);

    modifier onlyRegistered(address user) {
        require(participants[user].registered, "Not registered");
        _;
    }

    function register() external {
        require(!participants[msg.sender].registered, "Already registered");

        participants[msg.sender] = Participant({
            registered: true,
            activeSaga: 0,
            activeSeason: 0,
            locked: false
        });

        emit Registered(msg.sender);
    }

    function lockSeason(
        address user,
        uint256 sagaId,
        uint256 season
    ) external onlyRegistered(user) {
        Participant storage p = participants[user];

        require(!p.locked, "Season already locked");

        p.activeSaga = sagaId;
        p.activeSeason = season;
        p.locked = true;

        emit SeasonLocked(user, sagaId, season);
    }

    function isLocked(address user) external view returns (bool) {
        return participants[user].locked;
    }

    function getState(address user)
        external
        view
        returns (bool registered, uint256 saga, uint256 season, bool locked)
    {
        Participant memory p = participants[user];
        return (p.registered, p.activeSaga, p.activeSeason, p.locked);
    }
}
