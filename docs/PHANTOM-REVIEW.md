# Phantom warning: unresolved, no bypass

On 7 November 2026, a user supplied a Phantom screenshot for https://signal-solana.vercel.app showing “This dApp could be malicious. Do not proceed unless you are certain it is safe” and “For your safety, Phantom has blocked this request”. The user was told to close it and not override the warning. No further wallet request, signature or broadcast was made by the implementation agent.

## What is established

- Phantom’s official [domain and transaction warnings](https://docs.phantom.com/developer-powertools/domain-and-transaction-warnings) document this exact wording under **transaction simulation warning**. The documented new-domain wording is different. This does not establish what triggered this particular screenshot or whether it occurred during connect versus signing.
- The first-party app uses injected-provider `connect` and `signTransaction`, not `signMessage`, auto-signing or `signAndSendTransaction`. No seed/private-key field or app-side key custody exists.
- Wallet payment construction uses `@solana/web3.js`: version-0 message, one required signer, one System Program Transfer of 1,000,000 lamports (0.001 devnet SOL). The payer/source is the connected public key; destination and exact instruction/account references are displayed. The original built message is never replaced before signing.
- The broadcast destination is fixed to official Solana devnet, guarded by its genesis hash. Preflight is enabled. Returned wallet message bytes must match the reviewed message; account changes and stale reviews block broadcast. Illustrative offline fixtures and the live unsigned public sample are inspection-only.
- Actual production-proxy unsigned devnet simulation was successful at slot 519713285, err null, 150 compute units, 5,000-lamport estimated fee. This did **not** use the user’s captured transaction, a signature or a broadcast, and does **not** clear Phantom’s own checks.
- The official [simulation-warning recipe](https://docs.phantom.com/recipes/transactions/resolve-transaction-simulation-warnings) also demonstrates a web3.js v0 transfer. Therefore v0 format alone is not an established cause. Successful app-side simulation is explicitly not a guarantee that Phantom’s independent warning clears.
- Dependency audit found four moderate transitive web3.js → jayson / stream-json / uuid advisories; no high or critical advisories. This is neither an independent audit nor evidence for/against Phantom’s cause.

## Unknowns / no safety claim

The triggering action, actual wallet-request bytes, Phantom version, wallet-selected network and Phantom’s internal simulation/reputation result were not captured. The legacy injected-provider interface does not prove Phantom’s selected network merely because Signal’s RPC is devnet. A network mismatch, account funding/state, transaction simulation or reputation signal is possible, **not diagnosed**. Do not label the warning a false positive or merely a new-domain problem.

## Corrective changes in this patch

The owner explicitly requested restoring manual wallet connection and normal constrained devnet signing. Both features are available; this does not resolve or clear Phantom’s warning. Separate release switches guard connection and signing. No request is automatic, and external blocks/rejections propagate without retry or alternate-provider/domain fallback. No actual wallet connection, signature or broadcast has been performed by the implementation agent. The independent no-wallet path remains usable.

The signing module now requires another successful unsigned simulation of the **exact original message**, without replacement blockhash, immediately before requesting approval; failure, expiration or changed review stops before the wallet. Previously the preview used a replacement blockhash and separately checked original-blockhash validity. This improves evidence freshness but is not a proven fix for Phantom’s warning. No wallet-payment destination is prefilled: the user must explicitly supply a devnet address they control. Phantom provider presence is checked with its documented `isPhantom` flag; no alternate provider is tried after a blocked/rejected request.

These changes are not Phantom approval and must not be represented as clearing the warning. Feature availability is not permission to bypass a wallet warning or approval of any particular transfer.

## Official review route — not submitted

Phantom’s documentation links its domain/transaction review team at:

https://docs.google.com/forms/d/1JgIxdmolgh_80xMfQKBKx9-QPC7LRdN6LHpFFW8BlKM/viewform

No form, email or review request has been sent. The owner must approve/submit any external report. Provide actual triggering transaction bytes only after obtaining them safely, without repeating a blocked signing request. Never provide seed phrases, private keys, login data or credentials.

## Subsequent owner report — 7 November 2026

The owner reports a Phantom connection completed on their device without a warning or block. No transaction was confirmed. This does not establish why the earlier request was blocked, blanket clearance for other devices/requests, or a verified transaction-signing flow. No reinstall, bypass or external review submission was performed.
