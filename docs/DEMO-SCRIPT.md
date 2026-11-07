# 90-second demo — Signal

Record the actual live app: https://signal-solana.vercel.app. This is a script, not a video or a claim of a recorded demo. Do not request a wallet signature, broadcast, or bypass a security warning for this walkthrough.

## Before recording

- Use a desktop browser. Load the optional local model once with explicit consent (~390 MB plus runtime) so downloading does not consume the recording. Confirm a real explanation can generate; never substitute canned text for failed inference.
- Run the guided unsigned preview once to establish RPC availability. A public RPC outage is an error, not an executed/successful payment. If unavailable, use labeled offline fixtures and say simulation is unavailable.
- Keep the sample picker and AI disclosure easy to reach. Do not display keys, private wallet data or other browser tabs.

## Timeline and narration

**00–12 · Landing / Try a transaction**  
“A signature should not be a guess. Signal helps you understand what a Solana transaction requests before you approve it. You can explore without connecting a wallet.”

**12–29 · Actual live unsigned preview / Evidence**  
“This sample is built with the Solana SDK and simulated against real devnet state. Here are its exact amount, accounts and simulation slot. No signature was verified and nothing was broadcast. A preview is not a completed payment.”

**29–43 · Split fixture / manual Play**  
“One signature can contain several instructions. The storyboard walks through each planned move. These walkthroughs are genuine serialized fixtures, clearly labeled—not past chain events.”

**43–56 · Delegate-permission fixture**  
“This one grants a delegate spending permission. It is not an immediate transfer. Signal shows the exact raw allowance and keeps the risk flag visible instead of declaring it safe.”

**56–77 · Local AI disclosure / generate actual explanation**  
“The optional explainer is a real small language model running locally in a browser worker. It translates structured evidence into plain language. It can be wrong, so deterministic evidence—not AI—controls the signing gate.”

**77–90 · Unknown fixture / close**  
“Unknown instructions stay unknown. Manual devnet signing has separate confirmation and exact-message safeguards, but a real signed receipt is not verified in this demo. Signal gives you clarity, not a safety guarantee. The decision remains yours.”

If generation takes longer, honestly retain the loading state or make a clearly disclosed waiting cut. Never paste invented model output or imply a failed simulation succeeded. Show optional signing/receipt implementation only as implementation, not as a demonstrated transaction. Video length/form requirements must be checked on the actual submission form.
