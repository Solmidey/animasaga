🌒 AnimaSaga

An onchain saga engine for Elyndra.
Where alignment is permanent, choice is costly, and stories remember.

What Is AnimaSaga?

AnimaSaga is the canonical web and onchain layer for the world of Elyndra.

It is where:

- Faction allegiance is chosen — and cannot be taken lightly

- Votes are cast onchain, immutably

- Seasons fracture reality

- Echoes amplify only when conditions are met

- History cannot be rewritten, only extended

Discord is where voices gather.
AnimaSaga is where the world records truth.

The Discord bot Axiom acts as a herald — ancient, restrained, and wise — but AnimaSaga is the ledger.

# Core Principles (Non-Negotiable)

This project obeys these rules.

They are law.

In practice, this means:

- ❌ No frontend talks directly to databases

- ❌ No trust in client-side logic

- ❌ No secrets exposed to browsers

- ❌ No mutable “soft” permissions

- ✅ Every action is gated

- ✅ All votes and alignments are onchain

- ✅ Middleware controls all writes

- ✅ Rate-limited, sanitized, and auditable

- ✅ Errors reveal nothing; logs reveal everything (privately)

If a feature violates these rules, it does not ship.

The World: Elyndra

Elyndra is not a setting.
It is a system of consequence.

Time moves in Seasons.
Seasons end visibly.
Season One ends in a crack — permanent and recorded.

No Season is ever erased.
No vote is ever forgotten.

# Factions of Elyndra

Every user may align with one faction per season.

Changing allegiance:

- Is intentionally slow

- Requires cooldowns or future seasons

- Cannot be spammed

- Cannot be undone casually

## The Bearers

There are four Bearer roles:

- 🔥 Bearer of Flame — Action, ignition, irreversible choices

- 🌫 Bearer of Veil — Obfuscation, secrecy, hidden paths

- 📣 Bearer of Echo — Amplification with conditions

- 👑 Bearer of Crown — Governance, finality, closure

Echo amplification is never free.
It requires:

- Proven alignment

- Time-based eligibility

- Onchain conditions

- Season-specific limits

No faction is cosmetic.
All are mechanically enforced.

# Early Believers

Early Believers are not “early users.”

They are genesis witnesses.

Privileges:

- Permanent onchain marking

- Unique voting weight only when conditions are met

- No hidden multipliers

- No offchain favoritism

Early Belief is visible forever — but never overpowering.

Architecture Overview
High-Level Flow
```
User Wallet
   ↓
AnimaSaga Web App (Read-Only UI)
   ↓
Axiom API (Middleware / Gatekeeper)
   ↓
Smart Contracts (Base Mainnet)
```

## Why This Matters

- The frontend cannot lie

- The backend cannot overreach

- The contracts cannot forget

# Onchain Design (Base Ecosystem)

All core state lives on Base Mainnet.

Contracts (Current & Planned)

- SagaRegistry.sol
Canonical registry of seasons, factions, and permissions

- SagaCommit.sol
One-way commitment of votes, alignments, and irreversible actions

- (Future) SagaEcho.sol
Conditional amplification logic

- (Future) SagaCrown.sol
Governance finality and season closure

Contracts are:

- Minimal

- Explicit

- Non-magical

- Auditable

Upgrade paths are intentional and limited.

# Axiom (Discord Bot)

Axiom is not a god.
It is a witness.

Responsibilities:

- Present choices

- Enforce cooldowns

- Never expose history

- Never reveal others’ alignments

- Speak sparingly

- Sound ancient

**Axiom never stores truth — it merely points to it.**

Truth lives onchain.

# Wallets & Identity

- Wallet connection is mandatory

- No email-first identity

- No offchain vote authority

- No anonymous amplification

Identity = wallet + history.

# Security Posture

This project assumes:

- Users are smart

- Attackers are smarter

- Frontends are hostile

- Clients lie

Therefore:

- All sensitive logic is server-side or onchain

- Rate limiting is enforced everywhere

- Inputs are sanitized

- Logs never leak secrets

- Errors never educate attackers

# What This Is Not

- ❌ A casual community poll

- ❌ A Web2 site with a wallet button

- ❌ A fast-and-loose MVP

- ❌ A growth hack

AnimaSaga is slow by design.

# Status

- ✅ Base Mainnet deployment complete

- ✅ Discord bot operational

- 🚧 Smart contracts iterating

- 🚧 Axiom API design locking

- 🚧 AnimaSaga web MVP in progress

# Philosophy

**“History does not care who shouted loudest — only who committed.”**

AnimaSaga is not about hype.
It is about recorded intent.

If you are here, you are early.
If you choose, you will be remembered.

License

MIT — with narrative consequences.
