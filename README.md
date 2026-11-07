<p align="center"><img src="public/signal.svg" width="72" alt="Signal logo" /></p>
<h1 align="center">Signal · Read Before You Sign</h1>
<p align="center">A transaction is a story. Read yours before you sign.</p>

Signal is a working, devnet-only Solana transaction inspection workspace: import actual serialized bytes, follow an animated instruction storyboard, inspect evidence-grounded flags, ask a local AI model to explain the evidence, simulate, then optionally sign a tightly constrained test transfer and compare its confirmed receipt.

Built during the MLH Solana hackathon coding window in November 2026. Intended AI-track entry; eligibility and submission are **not** claimed verified. No paid inference APIs, custodial keys, database or mainnet endpoint.

## Wallet security warning — cause unresolved

A user reported Phantom’s “This dApp could be malicious” / blocked-request warning on the production domain. **Do not override it.** The exact cause is unconfirmed. Manual wallet connection and constrained devnet signing are enabled by owner request, not because Phantom cleared the site; no wallet/domain switching or security bypass is offered. Successful unsigned RPC simulation is not Phantom clearance or proof of safety. Connecting requests only a public address, never a signature. No wallet request runs automatically; blocked/rejected requests are shown without retry or alternate-provider fallback. Signing requires its own fresh successful simulation and explicit confirmation. The signing/receipt code is tested with in-memory mocks, not a verified real-wallet flow. See [audit findings and official review route](docs/PHANTOM-REVIEW.md).

No-wallet decoding, real unsigned devnet simulation and optional local AI remain available.

## Run locally

Requires Node 22.12+ (tested with Node 24), npm, and a modern browser.

```bash
npm ci
npm run dev
# Open the URL Vite prints. /about and /docs are real app routes.
npm test
npm run build
```

`npm run dev` proxies `/api/rpc` to the **fixed official devnet RPC**. Production uses `api/rpc.ts`, an allowlisted, size-limited, timeout-bound Vercel Function. No `.env` file or API key is needed. `npm run preview` serves static assets only; use the dev server or a Vercel deployment when testing RPC features.

## What actually works

- **Real wire input:** base64-encoded legacy and v0 transactions up to 1,232 bytes, decoded using Solana's SDK. No lookup-table guessing. Canonical serialization and instruction-account indexes are checked.
- **Instruction evidence:** System Program direct SOL transfers; classic SPL Token Transfer, TransferChecked, Approve, ApproveChecked, Revoke, SetAuthority and CloseAccount; compute budget price/limit; Memo v2. Unsupported operations fail closed as unknown effects.
- **Animated storyboard:** selectable instruction frames, directional flow, exact integer amounts, account references, risk and uncertainty panels. Permissions are explicitly not transfers. The UI respects reduced-motion preferences.
- **Honest walkthroughs:** four actual SDK-serialized unsigned fixtures: payment, two-recipient split payment, maximum-u64 delegate approval and unknown program. They are labeled illustrative, cannot be signed, and are usually unfunded. Their simulation may correctly fail with `AccountNotFound`.
- **Live no-wallet sample:** explicit action discovers a public funded system-owned devnet fee-payer from recent public block metadata, builds fresh genuine SDK transaction bytes, and shows only an actually successful unsigned simulation. It claims no authority over that account, never signs/broadcasts, replaces the displayed bytes visibly, and stays marked inspection-only. Bounded attempts and RPC errors fail honestly.
- **Devnet simulation:** verified cluster genesis, unsigned simulation with `sigVerify: false`, `replaceRecentBlockhash: true`, logs, compute usage, fee estimate and account snapshots. No broadcast during simulation.
- **Real local AI:** optional SmolLM2-360M-Instruct ONNX q4 inference using Transformers.js, inside a dedicated WASM Web Worker. Download consent is explicit; about **390 MB** model files plus about 27 MB runtime, with substantial RAM requirements. No generated text is shown before the model actually runs.
- **Manual wallet path (not real-wallet verified):** injected Phantom or Solflare; build a fresh 0.001 devnet SOL transaction, simulate, inspect full destination, explicitly confirm, approve in wallet, broadcast with preflight, wait for confirmation and compare every account's SOL delta, fee and exact message.
- **Signing constraints:** only direct SOL transfers; total amount ≤0.01 devnet SOL; one signer; connected wallet must be fee payer and source; successful simulation bound to exact transaction bytes, known fee, original valid blockhash and review age ≤60 seconds. An additional exact-original-message simulation runs immediately before any wallet prompt, without a replacement blockhash; failure blocks the request. This is not a guarantee of Phantom acceptance. Message mutation, account changes, stale reviews and missing signatures are blocked. No auto-refresh of signed bytes.
- **Evidence export:** downloadable JSON containing decoded facts, transaction bytes, flags, RPC evidence, receipt and optional actual model output.
- Responsive workspace, custom SVG identity, About page and comprehensive Field Guide.

## Demo guide

### No wallet / no model download

1. Open **Simple payment**. The actual decoded amount is 0.001 SOL; no execution is claimed.
2. Select **One signature, two moves** and play the multi-frame storyboard. Then select **The hidden permission**. Notice `18446744073709551615` raw token units and the spending-delegate warning. This is future permission, not money moving now.
3. Select **An unfamiliar program**. Its effects remain unresolved; the app never assigns a reassuring safety score.
4. Open **Evidence** for full program/account references; export the report if useful.
5. Choose **Try live unsigned preview** for a successful real devnet simulation without a wallet, signature or broadcast. It discovers a public funded account, builds fresh bytes, decodes those same bytes and displays the actual RPC result. It is not your wallet; signing is disabled. If public RPC/account discovery fails, no success is invented. Offline fixture simulation may still correctly fail with AccountNotFound.

### Actual on-device AI

1. Select a walkthrough and choose **Download model (~390 MB) & explain**.
2. Model weights download from Hugging Face and may be cached on the device. Inference runs in a WASM worker. Loading, generation, failure and stop states are explicit.
3. Read the generated explanation **alongside** the deterministic evidence, not instead of it. The model can omit facts or hallucinate. A narrow output check withholds invented numbers and unsupported safety language, but is not a factuality guarantee.
4. On an unsupported/low-memory device, the app reports that no explanation was generated. There is no secret paid or hosted inference fallback.

### Manual funded-devnet wallet / receipt flow

The reported Phantom warning remains unexplained. These features are available by owner request, not wallet clearance. If your wallet blocks a request, close it; do not override it or retry via another wallet/domain. No particular transfer is authorized by enabling the feature.

1. Install Phantom or Solflare, select **devnet**, connect, and obtain **free test SOL** from https://faucet.solana.com/. Never buy tokens for this demo.
2. Enter another devnet public address you control. No wallet-transfer destination is prefilled.
3. Build the 0.001 SOL payment, inspect amount and destination, simulate, then sign within 60 seconds. If expired, rebuild and review again.
4. A dedicated modal requires acknowledgment, then your wallet separately requests a signature. Nothing is signed by Signal itself.
5. After broadcast, keep the signature. A confirmation timeout is not proof of failure; use **Check confirmed receipt**, not another transfer.
6. The receipt checks exact on-chain message, actual fee versus preview fee, and all referenced accounts' balance deltas. Differences are reported, not relabeled as a match.

## AI implementation and privacy

Model: [`HuggingFaceTB/SmolLM2-360M-Instruct`](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct), from Hugging Face (Apache-2.0). Transformers.js 4.x and ONNX Runtime, `device: 'wasm'`, `dtype: 'q4'`, greedy decoding. The worker is loaded only after explicit activation. UI thread stays responsive; stopping terminates the worker.

The AI receives locally constructed facts: known instruction types, exactly formatted amounts, deterministic risk titles and simulation status. **No memo text, RPC log strings, free-form user labels, keys, or identity claims enter the prompt.** The model receives the actual structured evidence, not a canned explanation. Generated text never controls signing policy or changes transaction bytes. Decoder/risk output is explicitly deterministic, never mislabeled AI.

Transaction evidence stays on-device for inference. Hugging Face/CDNs receive model-download requests/network metadata. Simulation and broadcasting send public transaction bytes/accounts to the official Solana devnet RPC through the host. Hosting providers can keep ordinary request logs. There is no analytics integration, app-side history/database or server-side inference. Google Fonts receives normal font-download network metadata, not transaction evidence. Exported reports include public addresses, transaction bytes, logs and optional model text—review before sharing.

## Architecture

```text
React workspace
  ├─ engine.ts       Solana SDK deserialization → instruction layouts → frames + flags
  ├─ ai-policy.ts    bounded factual prompts + narrow generated-output sanity checks
  ├─ ai.worker.ts    lazy ONNX local inference; no signing authority or network RPC
  ├─ features.ts     independent connection/signing release switches; both manually enabled
  ├─ live-example.ts public funded-account discovery → fresh unsigned simulation (no wallet)
  ├─ rpc.ts          fixed-origin /api/rpc → devnet identity → simulation / receipts
  └─ signing.ts      explicit consent + bound preview + unchanged message → wallet
                          ↓
Vercel /api/rpc → fixed https://api.devnet.solana.com (allowlisted RPC methods)
```

The classic SPL Token instruction layout decoder uses byte tags and exact `BigInt` u64 parsing, based on the public SPL Token instruction format. The SDK builds every walkthrough and live payment. No third-party transaction-decoding service is used. Comparison rejects balances outside JavaScript's exact integer range rather than rounding them.

## Honest limitations

- No mainnet, wallet custody, auto-signing, auto-airdrops, token signing, swaps, prices, identity verification, program audit or promise of safety.
- Lookup-table transactions are explicitly rejected. Transaction versions beyond legacy/v0 are not supported. Multisig, durable nonces and unsupported instructions cannot enter the signing path.
- Token-2022/extensions and arbitrary CPI effects are not interpreted, even when simulation returns inner instructions. Recognized does **not** mean safe.
- For plain SPL transfers/approvals, raw token units are shown; the app does not guess mint metadata or symbols. TransferChecked decimals are instruction-declared and only validated by actual successful chain simulation.
- Unsigned simulation does not verify signatures. The simulation replacement blockhash is not written into the transaction. State and fee availability can change before broadcast.
- Where supported, simulation returns atomic pre/post balances. Older RPC responses require separately read pre-balances; that delta view is explicitly approximate/non-atomic. SPL token balance receipt comparison is not implemented.
- Receipt verification is implemented for constrained direct SOL transfers, at `confirmed` commitment (not necessarily finalized). Devnet can reset. Public RPCs may fail or rate-limit.
- The AI is a small model, is slow/resource-intensive on some devices, and may generate inaccurate or incomplete explanations. The deterministic engine remains authoritative.
- Current dependency audit: four **moderate** transitive advisories in legacy `@solana/web3.js`'s `jayson`/`stream-json`/`uuid` dependency chain. Signal uses neither its Node streaming RPC nor uuid v3/v5/v6 functionality; the server route imports none of the SDK. No high or critical advisory remains in the installed dependency graph. This is not an independent security audit.

## Verification status

- `npm run build` and strict TypeScript validation.
- Automated decoder, permission-risk, numeric precision, unknown-operation, signing-policy, message-binding, RPC-error, receipt-comparison, AI-output-policy and DOM interaction tests.
- `RUN_DEVNET=1 npm test -- tests/devnet.integration.test.ts` exercises the actual no-wallet sample feature through the production relay handler against **live devnet**, including genesis verification and unsigned simulation. It uses a funded public address found in a public block for simulation only; no private key, faucet request, signature or broadcast. See `docs/devnet-smoke.json`.
- `node scripts/check-ai.mjs` downloads the actual q4 model and runs local **Node CPU** inference; this verifies real model execution, **not browser WASM**. See `docs/ai-smoke.json`.
- **Still requires verification:** the no-wallet action and security notice need browser QA; browser-worker model download and WASM execution, mobile layout, injected-wallet approval, actual devnet broadcast and confirmed receipt loop have not been established here. Actual wallet compatibility and the reported Phantom block remain unverified; do not bypass any external wallet block. DOM tests are not browser tests. No screenshot or browser-tested claim is fabricated.

## Deploying

`vercel.json` configures the Vite build, routes, security headers and fixed devnet RPC function. A normal free/Hobby deployment needs no environment variables. Do not enable paid services, add a paid RPC, or disable deployment protection merely to test it. Public repository creation and external deployment require explicit owner approval; the source can be built and tested locally beforehand.

## References

- [Official MLH event and current submission schedule](https://events.mlh.com/events/15200-solana-hackathon)
- [Solana simulateTransaction RPC](https://solana.com/docs/rpc/http/simulatetransaction)
- [Solana web3.js](https://solana-foundation.github.io/solana-web3.js/)
- [SPL Token instruction source](https://github.com/solana-program/token/blob/main/program/src/instruction.rs)
- [Transformers.js](https://huggingface.co/docs/transformers.js/en/index)
- [ONNX model](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct)

## License

MIT for Signal's source. Third-party SDKs/runtime/model retain their own licenses.
