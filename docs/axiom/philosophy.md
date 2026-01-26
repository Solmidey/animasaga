# AXIOM
Oracle of Elyndra — Specification v1.0
1. Purpose

Axiom is the interpretive oracle of the AnimaSaga protocol.

It does not control the chain.
It does not override smart contracts.
It does not possess unilateral power.

Axiom exists to observe, verify, and attest offchain intent in a way that can be anchored to immutable onchain state.

“I do not decide what Elyndra becomes.
I only remember what it was.”

2. Design Philosophy

Axiom is built on the following principles:

Finality lives onchain

Meaning lives offchain

Interpretation must be auditable

Power must be delayed

Silence is a valid response to abuse

Axiom follows the doctrine of minimum authority.

3. Explicit Capabilities (What Axiom CAN Do)

Axiom MAY:

Verify wallet ownership via cryptographic signatures

Read public onchain state from:

SagaRegistry

ElyndraCommitment

IliosAttestation

Accept signed offchain intent (e.g. Echo signals)

Rate-limit, delay, or ignore requests

Maintain an offchain ledger of signals and behavior

Compute eligibility for rare attestations

Submit transactions to contracts it is authorized to call

Anchor hashes or Merkle roots of offchain data onchain

4. Explicit Prohibitions (What Axiom CANNOT Do)

Axiom CANNOT:

Change faction choices

Unlock or extend seasons

Modify commitments

Assign Crown during an active season

Reveal hidden mechanics prematurely

Expose internal scoring or weighting logic

Grant Ilios without onchain eligibility checks

Override smart contract enforcement

If a rule is not enforced by the chain, Axiom treats it as interpretive only, never authoritative.

5. Trust Model

Axiom is trusted to interpret, not to decide.

Trust assumptions:

Axiom’s behavior is observable via:

Onchain transactions it submits

Hashes it anchors

Consistency over time

Axiom can be replaced without invalidating history

Historical attestations remain verifiable even if Axiom disappears

6. Authentication Model

Axiom authenticates users only via wallets.

Method

Challenge–response message signing (SIWE-style)

Short-lived, HTTP-only session tokens

No persistent identifiers beyond wallet address

Guarantees

No passwords

No email

No browser-stored secrets

No identity beyond cryptographic proof

7. Offchain Signal Handling (Echo)

Echo signals represent intent to amplify attention, not authority.

Rules:

Only Echo-aligned wallets may submit Echo signals

One signal per episode per wallet

Signals do not modify outcomes

Signals influence visibility, narration, and recap emphasis

Axiom may:

Delay processing

Aggregate silently

Discard abusive or malformed signals without notice

8. Rate Limiting & Abuse Handling

Axiom employs silent enforcement:

Hard per-wallet limits

IP + wallet correlation

Shadow rejection for suspicious activity

Axiom never explains abuse rejections to the user.

This prevents adversarial learning.

9. Ilios Attestation Logic

Ilios is a soulbound historical witness, not a reward.

Axiom evaluates eligibility based on:

Early participation

Consistent behavior

Absence of abuse attempts

Alignment with season constraints

If and only if all conditions are met:

Axiom submits a grant() transaction to IliosAttestation

Ilios:

Is non-transferable

Cannot be renounced or revoked

Does not confer immediate power

10. Crown Emergence

Crown does not exist during active seasons.

After season conclusion, Axiom may:

Analyze narrative consequence

Evaluate exposure to risk

Identify wallets that unknowingly carried weight

Crown is:

Emergent

Revealed, not selected

Attested post-season only

Crown criteria are never published in advance.

11. Season Transitions

At season end:

Axiom halts signal intake

Final hashes of offchain ledgers may be anchored onchain

Attestations are issued

Narrative state advances

No retroactive actions are permitted.

12. Replacement & Continuity

If Axiom is replaced:

Smart contracts remain authoritative

Past attestations remain valid

New oracle must honor existing onchain state

Offchain logic may evolve, but history cannot

13. Summary

Axiom is not a ruler.
Axiom is not a governor.
Axiom is not a backend.

Axiom is a witness.
