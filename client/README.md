# SLAForge — Phase 1 frontend

Performance-backed payments for APIs and digital services. This is the complete, interactive frontend MVP for the Arc Microgrants hackathon, with Arc Mainnet as the intended deployment network.

All wallets, payments, provider bonds, API credentials, measurements, and settlements are **simulated**. There are no backend routes, database connections, smart contracts, wallet providers, or blockchain transactions.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

```bash
npm run lint
npm run build
npm start
```

## Demo walkthrough

1. Browse `/services` and open a service. Each of the six categories has an illustrative provider.
2. Connect the demo wallet, select the five-minute plan, and review the confirmation. A 10 USDC plan costs the customer 10.1 USDC, including the platform fee.
3. Fund the demo agreement. It begins in **Pending Provider**.
4. Follow **Provider workspace** from the agreement. The workspace opens for that service's provider. Accept the request and post the 0.5 USDC demo bond.
5. Return to the agreement. It is **Active**, with a countdown, SLA targets, simulated measurements, check history, charts, and masked mock API credentials.
6. Choose **Simulate settlement** to demonstrate either outcome immediately. Alternatively, leave the app open for automatic settlement at expiry.
7. For a failure on a 10 USDC agreement: provider payout = 5; customer service refund = 5; provider bond slashed = 0.5; total customer receipt = 5.5; platform fee retained = 0.1 USDC.
8. Reload to verify the agreement persists. Profiles and newly published services also persist in this browser.

The provider selector lets you explore every sample provider. Customer and provider workspaces are demo perspectives, not authenticated permission boundaries.

## Routes

| Route | Experience |
| --- | --- |
| `/` | Arc-inspired landing, sticky navigation, automatic process carousel, interactive settlement map, FAQ |
| `/services` | Search, categories, price / uptime sorting, online filter |
| `/services/[id]` | Provider, endpoints, documentation URL, plans, SLA, agreement confirmation |
| `/dashboard/customer` | Wallet summary, committed USDC, refunds, agreement search and status filters |
| `/dashboard/provider` | Provider selector, incoming requests, accept / reject, listed services, settlements |
| `/provider/services/new` | Validated service form, multiple plans, preview, local publication |
| `/agreements/[id]` | Lifecycle, countdown, SLA, monitoring, API credentials, settlement, cancellation |
| `/monitoring` | Service health, latency / uptime chart, incident feed, searchable table |
| `/profile` | Wallet details, profile editing, role and account type |

Sample agreement IDs: `SLA-1042` (active), `SLA-1044` (pending), `SLA-1045` (passed), `SLA-1046` (failed), `SLA-1047` (rejected), and `SLA-1048` (cancelled).

## Structure

- `app/`: Next.js App Router pages, metadata, responsive theme, loading and not-found states.
- `components/`: Shared navigation, dialogs, cards, charts, dashboards, agreement details, and React demo store.
- `data/mock.ts`: Sample services, plans, agreements, illustrative chart history and regional check fixtures.
- `lib/types.ts`: Domain types for later API and contract integration.
- `lib/utils.ts`: USDC formatting, fee and bond calculations, SLA evaluation and settlement breakdowns.
- `tests/demo.spec.ts`: Browser tests for the product journey, persistence, forms, filters, monitoring expiry, and responsive navigation.

The local store is versioned with the key `slaforge-demo-v1`. To reset your own demo, remove that key from browser local storage and reload.

## Monitoring and settlement boundaries

- Simulated active checks advance every 30 seconds **while the app is open**. This is not a background monitoring service.
- Chart trends and regional check rows are illustrative fixtures. No request is sent to a health endpoint.
- Expiry checks run locally. A completed demo passes only if both uptime and p95 latency meet their targets and at least one check exists.
- Immediate settlement explicitly generates an illustrative passing or failing final snapshot.
- Pending requests can be rejected by the provider or cancelled by the customer. The demo releases the full service price and retains the 0.1 USDC platform fee; no bond was posted.
- The displayed wallet balance is a fixed sample balance, not a token ledger.
- Sample provider URLs use `.example` and are displayed as sample URLs, rather than linked as real integrations.

## Browser verification

```bash
npx playwright install chromium
npm run test:e2e
```

To use an existing Chrome / Chromium installation:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm run test:e2e
```

The test runner starts the dev server or reuses the local server at port 3000. Browser test traces are retained only for failures and ignored by Git.

## Future integration

Replace mutations and persistence behind `components/store.tsx` with API and viem adapters. Keep server-authoritative pricing, service / plan / SLA snapshots, provider authorization, escrow accounting, monitoring evidence, idempotent settlement, and real wallet signing in the future integration layer. The demo's browser state and frontend status checks are not security or payment authority.

## Dependencies

Next.js 16 App Router, React 19, Tailwind CSS 4, Lucide icons, Motion, and Recharts. Reduced motion is respected. Dialogs support Escape, trapped keyboard focus, and focus restoration.

The supplied `public/Arc-mainnet.png` is used in the Arc ecosystem section and footer. The visual design follows Arc's blue-to-peach atmosphere, spacious type, orbital linework, and subtle technical annotations, while presenting SLAForge's own product.

At implementation time, `npm audit` reported an existing high-severity `braces <=3.0.3` advisory in the development-only Next ESLint dependency chain. The registry's newest braces version was 3.0.3; npm proposed downgrading Next's ESLint config to v14. The project retains the matching v16 config. This is separate from runtime verification.
