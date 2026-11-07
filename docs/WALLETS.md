# Wallet support: transport, not a blanket compatibility claim

## What changed

The old implementation read only `window.phantom.solana`, `window.solana`, or `window.solflare` and implicitly selected the first one. It did not discover other wallets, provide an explicit chooser, or implement a mobile-app transport. An installed mobile wallet is not a desktop extension. That limitation was real.

Signal now has an accessible explicit chooser with:
- devnet-compatible **Wallet Standard** discovery and registration/unregistration updates;
- separately chosen injected Phantom and Solflare providers where actually detected;
- lazy **official Solflare SDK 1.4.2**, configured `network: 'devnet'`, providing its own extension/web/mobile connection UI when no injected Solflare provider is detected;
- **Mobile Wallet Standard 0.7.0** registration for local Android Chrome association on a secure origin, limited to `solana:devnet`, without a remote relay and with an in-memory authorization cache;
- a clearly labeled official Solflare **browse** link. This is navigation into its in-app browser, NOT a connect request/session. It carries only the current HTTPS app root, not transaction bytes, query strings or pending preview state.

No wallet connects automatically. Choosing a provider never triggers a different one after rejection/block. Connection must return a valid public address before any connected state appears. Signal requests no sign-in/signMessage operation. Signing is still a separate explicit action following a successful fresh simulation and confirmation.

## Browser / OS matrix

| Platform | Implemented path | What is not promised |
|---|---|---|
| Desktop Chrome / Firefox / Edge / Safari | Installed devnet-compatible Wallet Standard providers; detected Phantom/Solflare; official Solflare SDK | Every wallet/extension supports every desktop browser |
| Android Chrome, HTTPS | Local Mobile Wallet Adapter for installed compatible apps; detected providers; Solflare SDK | Every wallet exposes sign-only support, or every device grants local-network/app association permissions |
| Android Firefox / Brave / Opera / Samsung Internet | Detected providers or Solflare’s own connection flow where supported | MWA in these browsers; it is not advertised/registered by Signal |
| iOS Safari / Chrome / Firefox | Official Solflare flow where available; compatible wallet Safari extension; chosen wallet’s in-app browser | MWA in any iOS browser; desktop extension injection in ordinary mobile browsers; universal app-switch-and-return signing |
| Wallet in-app browser | Its detected Wallet Standard/injected provider | That opening a browse link means already connected or preserves the original browser’s transaction state |

Browser identification is best-effort and may not identify privacy-modified user agents. The official library additionally determines local association support. Actual device/browser/wallet versions, provider popups/storage permissions, app installation and capabilities still matter. No mobile end-to-end test has been claimed.

Some wallets expose only `solana:signAndSendTransaction`. Signal deliberately does **not** substitute this for sign-only. Connection/inspection can work while signing fails closed with an explicit capability error. The app needs the returned signed message for unchanged-message checks before its fixed devnet broadcast.

Wallet Standard requests explicitly name `solana:devnet`; account and transaction-version support are checked. Legacy injection does not prove the wallet-selected network. Solflare SDK is initialized for devnet. Every simulation/broadcast path still verifies devnet identity, and there is no mainnet RPC selector.

## Security and privacy boundaries

Phantom blocked a request on this domain; the specific cause remains unknown. These new general wallet options are user-requested interoperability, **not** a route around that block. Close blocked requests. Never override warnings, disable protections, or switch wallets/domains to evade them. No automatic retries/fallbacks occur.

The Solflare SDK loads a third-party connection frame only after explicit selection. Its connection service can receive normal page/provider metadata; its preferred-adapter setting may be saved by that SDK. Signal restricts its SDK frame-message channel to the official connection-frame origin and actual frame window. This is defense in depth, not an independent audit or Phantom clearance. No wallet keys/seed phrases are requested by Signal. MWA authorization stays in memory; no remote relay is configured. Nothing is signed/broadcast merely by connecting or opening a browse link.

Existing signing constraints remain: direct SOL only, one wallet signer/payer/source, ≤0.01 devnet SOL, successful preview bound to the exact bytes and known fee, age ≤60 seconds, original-blockhash validation, an exact-original-message simulation immediately before approval, unchanged returned message, preflight enabled and a confirmed-message/fee/SOL-delta comparison. No recipient is prefilled.

Dependency audit after adding official SDKs: five moderate direct/inherited advisories through legacy web3.js/Solflare SDK → jayson / stream-json / uuid; no high or critical advisories. The uuid advisory concerns buffer APIs in v3/v5/v6; this is not a guarantee of overall dependency safety.

## Official sources consulted

- Solflare SDK: https://docs.solflare.com/solflare/technical/integrate-solflare/solflare-wallet-sdk
- Solflare SDK source/interface: https://github.com/solflare-wallet/solflare-sdk
- Solflare browse (navigation only): https://docs.solflare.com/solflare/technical/deeplinks/other-methods/browse
- Solflare native connect protocol (not implemented by hand): https://docs.solflare.com/solflare/technical/deeplinks/provider-methods/connect
- MWA browser matrix: https://docs.solanamobile.com/get-started/web/apps
- Mobile Wallet Standard installation: https://docs.solanamobile.com/get-started/web/installation
- iOS limitations: https://docs.solanamobile.com/recipes/mobile-wallet-adapter/wallet-signing-on-ios
- Wallet Standard: https://github.com/wallet-standard/wallet-standard

## Parent/browser QA checklist — no signing requests required

At `/`, test viewports 1440×1000, 1024×768, 768×1024, 390×844 and 360×800:
1. First view offers **Try a transaction** and **Inspect yours**, not a wall of bytes or a mandatory wallet.
2. **Try a transaction** builds and simulates a real fresh unsigned devnet sample. Check amount, actual slot/status and no fabricated success on outage. Public sample signing stays disabled.
3. **Inspect yours** opens an empty input. Paste an actual supported transaction, decode, inspect the planned flow. Invalid edited input disables network actions.
4. Expand example picker, byte evidence, instruction frames and optional AI independently. Risk flags remain visible. Check long addresses, maximum-u64 approval and unknown instructions for overflow.
5. Play/pause/replay one-step and multi-step previews. Movement is a planned flow, not execution. Approval/unknown effects do not animate fund-transfer particles. Motion ends; reduced-motion disables animation and smooth scrolling.
6. Open **Connect wallet**. Do NOT approve any real connection in automated QA. Verify accessible modal, focus containment, Escape/close, detected choices, Solflare SDK option, iOS/Android guidance and the browse-link disclaimer.
7. At `/docs#wallets`, inspect the readable platform matrix and official links. About/docs header connection errors must remain visible.
8. Actual Android Chrome app association and actual iOS/Solflare app transitions require the owner’s device and explicit approval of the specific connection. Do not sign or override wallet security prompts. Real signed receipt verification remains separate and unverified.
