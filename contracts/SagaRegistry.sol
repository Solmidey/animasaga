// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SagaRegistry
/// @notice Defines canonical Seasons and Episodes for AnimaSaga.
/// @dev This contract DOES NOT handle voting or outcomes.
///      It only declares what exists and what is active.
contract SagaRegistry {
    address public admin;

    struct Season {
        bool exists;
        bool active;
    }

    struct Episode {
        bool exists;
        bool active;
        bool resolved;
        uint256 seasonId;
    }

    mapping(uint256 => Season) public seasons;
    mapping(uint256 => Episode) public episodes;

    event SeasonCreated(uint256 indexed seasonId);
    event SeasonActivated(uint256 indexed seasonId);
    event SeasonClosed(uint256 indexed seasonId);

    event EpisodeCreated(uint256 indexed seasonId, uint256 indexed episodeId);
    event EpisodeResolved(uint256 indexed seasonId, uint256 indexed episodeId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "NOT_AUTHORIZED");
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "INVALID_ADMIN");
        admin = _admin;
    }

    /* ---------------- SEASONS ---------------- */

    function createSeason(uint256 seasonId) external onlyAdmin {
        require(!seasons[seasonId].exists, "SEASON_EXISTS");
        seasons[seasonId] = Season({
            exists: true,
            active: false
        });
        emit SeasonCreated(seasonId);
    }

    function activateSeason(uint256 seasonId) external onlyAdmin {
        require(seasons[seasonId].exists, "SEASON_MISSING");
        seasons[seasonId].active = true;
        emit SeasonActivated(seasonId);
    }

    function closeSeason(uint256 seasonId) external onlyAdmin {
        require(seasons[seasonId].exists, "SEASON_MISSING");
        seasons[seasonId].active = false;
        emit SeasonClosed(seasonId);
    }

    /* ---------------- EPISODES ---------------- */

    function createEpisode(
        uint256 seasonId,
        uint256 episodeId
    ) external onlyAdmin {
        require(seasons[seasonId].exists, "SEASON_MISSING");
        require(!episodes[episodeId].exists, "EPISODE_EXISTS");

        episodes[episodeId] = Episode({
            exists: true,
            active: true,
            resolved: false,
            seasonId: seasonId
        });

        emit EpisodeCreated(seasonId, episodeId);
    }

    function resolveEpisode(uint256 episodeId) external onlyAdmin {
        Episode storage ep = episodes[episodeId];
        require(ep.exists, "EPISODE_MISSING");
        require(!ep.resolved, "ALREADY_RESOLVED");

        ep.active = false;
        ep.resolved = true;

        emit EpisodeResolved(ep.seasonId, episodeId);
    }

    /* ---------------- VIEWS ---------------- */

    function isEpisodeActive(uint256 episodeId) external view returns (bool) {
        Episode memory ep = episodes[episodeId];
        return ep.exists && ep.active && !ep.resolved;
    }
}

