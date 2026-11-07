# Signal: Read Before You Sign

Copy-ready draft, not a submitted entry. Adapt to the actual MLH Challenges fields; eligibility and field requirements remain unverified.

**Tagline:** Understand the transaction. Question the permission. Keep the decision.

**Intended category:** AI Track  
**Live app:** https://signal-solana.vercel.app  
**Public source:** https://github.com/demir-sama/signal-solana  
**Demo video:** Not yet recorded/uploaded; no URL claimed.

## The problem

A wallet signature can authorize a payment, a broad token allowance, or an instruction a user cannot interpret. A readable interface should separate what the bytes actually request, what simulation establishes, and what remains unknown—not replace uncertainty with a green safety score.

## What Signal does

Signal turns actual serialized Solana transactions into a readable animated storyboard. It decodes supported instructions and exact account references, distinguishes token permissions from transfers, exposes deterministic risk flags and unsupported effects, and runs real unsigned devnet simulations. The no-wallet guided demo builds fresh SDK transaction bytes against public devnet state; it never controls or spends from the public sample account. Four clearly labeled SDK-built fixtures explore payments, split transfers, delegate permissions and unknown programs.

An optional real browser-local SmolLM2-360M-Instruct model explains the structured evidence with Transformers.js and ONNX/WASM. Its generated text is advisory, labeled and excluded from signing policy. Transaction evidence is not sent to a hosted inference API. Model download is explicit, about 390 MB plus runtime files; deterministic evidence works without AI.

## Why Solana and AI both matter

Solana's actual message/instruction format and live RPC state supply the evidence: exact addresses, integer amounts, program permissions and simulation results. AI performs genuine local language generation over those facts, helping readers understand the evidence without granting the model transaction authority. No deterministic explanation is passed off as AI.

## How it is built

React 19, TypeScript, Vite, @solana/web3.js, classic SPL instruction-layout decoding, Wallet Standard discovery, official Solflare SDK, Android Chrome Mobile Wallet Adapter, a fixed-destination devnet RPC proxy, Transformers.js and ONNX Runtime. Custom SVG identity, finite storyboard motion, reduced-motion support, accessible wallet chooser and progressive technical detail keep the journey focused.

## What we verified

Automated parser, risk, precision, RPC/error, exact-message signing-policy, receipt-comparison, AI-policy, UI and responsive-source regressions; production routes/assets; fresh successful live unsigned devnet simulation. Separate desktop QA exercised the guided demo, animation, docs, corrected empty/stale-input behavior, modal accessibility and genuine local browser AI generation. The owner reports Phantom connected without a warning on their device; no transaction was confirmed.

## Honest boundaries

Devnet only; no guarantee of safety or recipient identity. No lookup-table resolution, arbitrary CPI interpretation, Token-2022 or SPL signing. Token metadata is not guessed. Simulation is unsigned and can differ from later execution. Local AI can be inaccurate and resource-intensive. Mobile transport integrations are implemented with documented platform limits, not mobile end-to-end certified. Earlier Phantom warning cause remains unknown; a successful device-specific connection is not blanket clearance.

Manual direct-SOL signing and confirmed-message/fee/balance comparison are implemented behind fresh exact-message simulation, explicit confirmation and wallet approval. **Real signing, broadcast and receipt completion remain unverified; the demo must not claim an executed payment.** No wallet request, signature, purchase or broadcast was performed for release verification.

## What is next

Owner-approved device testing for Android/iOS wallet transports and one separately authorized devnet transaction/receipt loop; broader instruction/CPI evidence and improved lightweight local-model options. Security warnings must never be overridden to complete a demo.
