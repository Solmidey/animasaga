# AnimaSaga Architecture Overview

AnimaSaga is a write-scarce, read-heavy system.

Onchain is used for commitment and irreversibility.
Offchain is used for interpretation and narration.

## Components

- Smart Contracts (Base)
  - SagaRegistry
  - SagaCommit
- Axiom API (middleware only)
- Frontend (AnimaSaga)
- Wallets (identity, not logic)

The frontend is never trusted.
All authority flows from verified execution.
