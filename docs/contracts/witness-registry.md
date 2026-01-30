# WitnessRegistry.sol (Base Mainnet)

## Identity
- CONTRACT NAME: WitnessRegistry
- NETWORK: Base Mainnet
- CHAIN ID: 8453

## Addresses
- WITNESS_REGISTRY_ADDRESS: 0x...
- ELYNDRA_COMMITMENT_ADDRESS (gate): 0x2355451edBEE92138AB06231ED2b391089E9d4d1
- SAGA_ID: 1
- SEASON_ID (current): 1

## Deployment
- DEPLOY TX HASH: 0xf7b91b4530f77c284f48257a9d19ae058a11c9a0cd783842cb341da051aa7e7e
- DEPLOYMENT BLOCK: 41479056
- DEPLOYER WALLET: 0x6805d8363D65F05B701F5936928C806C7580FED8
- DEPLOY TIMESTAMP (UTC): 6m ago
|

Jan 30 2026 05:30:59 AM (+01:00 UTC)
|
Confirmed within <= 2 secs

## Verification (Explorer)
- CONTRACT VERIFIED: YES/NO
- COMPILER VERSION: 0.8.24
- OPTIMIZATION: YES/NO + runs
- LICENSE: MIT
- REMIX COMMIT: (optional)

## ABI
- ABI FILE: apps/web/lib/abi/WitnessRegistry.json
- ABI SOURCE: Remix "Compilation Details" → ABI

## Events
- Witnessed(sagaId, seasonId, user, faction, proof, blockNumber)

## Test proofs (Mainnet)
- SUCCESSFUL witness tx: 0x...
- EXPECTED REVERT tx (ALREADY_WITNESSED): 0x...
- (Optional) expected revert tx (NOT_ALIGNED): 0x...

## Notes
- One witness per wallet per season
- Gate: commitment.hasChosen(msg.sender)
- Faction: commitment.factionOf(msg.sender)
