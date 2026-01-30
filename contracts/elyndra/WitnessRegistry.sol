// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IElyndraCommitment {
  function hasChosen(address user) external view returns (bool);
  function factionOf(address user) external view returns (uint8); // 0 Flame, 1 Veil, 2 Echo
}

contract WitnessRegistry {
  IElyndraCommitment public immutable commitment;
  uint32 public immutable SAGA_ID;

  // seasonId => user => witnessed
  mapping(uint32 => mapping(address => bool)) public witnessed;

  event Witnessed(
    uint32 indexed sagaId,
    uint32 indexed seasonId,
    address indexed user,
    uint8 faction,
    bytes32 proof,
    uint256 blockNumber
  );

  constructor(address commitmentAddr, uint32 sagaId) {
    commitment = IElyndraCommitment(commitmentAddr);
    SAGA_ID = sagaId;
  }

  function witness(uint32 seasonId, bytes32 proof) external {
    require(commitment.hasChosen(msg.sender), "NOT_ALIGNED");
    require(!witnessed[seasonId][msg.sender], "ALREADY_WITNESSED");

    uint8 faction = commitment.factionOf(msg.sender);
    witnessed[seasonId][msg.sender] = true;

    emit Witnessed(SAGA_ID, seasonId, msg.sender, faction, proof, block.number);
  }
}
