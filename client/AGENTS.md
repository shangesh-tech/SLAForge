Phase - 1

Build the complete frontend for a Web3 application called “SLAForge” using:

- Next.js latest App Router
- Tailwind CSS
- lucide-react icons
- add viusles , use any npm package.
- No backend, database, Solidity, or real blockchain integration yet
- Use realistic mock data and structure the code so API/web3 integration can be added later

SLAForge lets customers pay USDC for APIs/digital services based on measurable SLA performance. Customers fund an agreement, providers accept it and post a 5% performance bond, the service is monitored for uptime and p95 latency, and the agreement later passes or fails.

Create these routes:

/
- SLAForge landing page
- Explain: “Pay for digital services based on performance.”
- Explain customer → fund SLA → provider bond → monitoring → automatic settlement
- Featured services
- Key statistics
- CTA to browse services / become provider

/services
- Search/filter services
- Service cards showing provider, category, price, duration, uptime SLA, max p95 latency and status
- Categories: API, RPC, AI, Cloud, Data, Storage

/services/[id]
- Complete service details
- Description
- Documentation URL
- Provider information
- Available plans such as 5 minutes demo, 1 month, 2 months
- SLA requirements
- Monitoring information
- Create Agreement button
- Agreement confirmation modal showing:
  service price
  platform fee = 0.1 USDC
  provider bond = 5%
  total customer payment

/dashboard/customer
- Wallet/profile summary
- Total active agreements
- USDC committed
- Refunds received
- Agreements table/cards
- Statuses:
  Pending Provider
  Active
  Passed
  Failed
  Rejected
  Cancelled
- Filter by status

/dashboard/provider
- Provider stats
- Active customers
- Revenue
- Bond currently locked
- SLA success rate
- Incoming agreement requests
- Accept / Reject actions
- When accepting, show required 5% bond
- Listed services
- Recent settlements

/provider/services/new
- Form for creating a service:
  service name
  description
  category
  base URL / health endpoint
  documentation URL
  uptime guarantee
  maximum p95 latency
  plans with duration + USDC price
- Add/remove multiple plans
- Preview before publishing

/agreements/[id]
Create the most detailed page.

Show:
- agreement ID
- customer
- provider
- service
- service price
- provider bond
- platform fee
- SLA requirements
- start time
- end time
- countdown
- agreement status

For Active agreements show:
- live uptime percentage
- p95 latency
- total checks
- successful checks
- failed checks
- last checked time
- SLA progress
- recent monitoring checks
- uptime history chart
- latency history chart

Show API credentials section:
- User ID
- API key masked by default
- Reveal / Hide / Copy buttons

Settlement section:

PASS example:
Provider receives service payment
Provider receives bond back
Customer refund = 0

FAIL example for 10 USDC:
Customer service refund = 5 USDC
Provider payout = 5 USDC
Provider bond slashed = 0.5 USDC
Customer total received = 5.5 USDC
Platform keeps 0.1 USDC

Clearly show the money flow.

/monitoring
- Overall monitoring dashboard
- Active monitored services
- Online/offline states
- uptime
- p95 latency
- checks
- incidents
- searchable monitoring table

/profile
- Wallet address
- Customer / Provider role
- Developer / Company type
- Name
- Email
- Website
- Edit profile

Use reusable components such as:
Navbar
Sidebar
ServiceCard
PlanCard
AgreementCard
StatusBadge
MetricCard
SLAProgress
MonitoringTable
SettlementBreakdown
WalletButton
CopyButton
Countdown
EmptyState
LoadingSkeleton
ConfirmModal

Use realistic mock data throughout.

Use local React state for interactions including:
- connect/disconnect wallet mock
- selecting plans
- agreement creation
- accept/reject
- reveal API key
- copying values
- filters/search
- modal states

Create a clean folder structure with:
app/
components/
data/
lib/

Keep mock data in data/ and create lib functions for formatting wallet addresses, USDC values, percentages, dates, SLA calculations and agreement statuses.

Make every route functional, responsive and connected through navigation. Avoid placeholder pages. Populate the application with enough mock services, agreements, monitoring checks and provider data so the complete SLAForge product can be demonstrated without any backend.

Do not implement Solidity or APIs. Create only the complete frontend application and make it ready for later viem/contract/API integration.

I need very good ui and ux and so much good viusal and motion animation okay in landing page and very good ui and ux and then use same theme as the arc.io

https://www.arc.io/

same ui and ux and need to very good and then use the logo @/public/Arc-mainnet.png okay do it , better if you use the arc theme okay so better and do this all okay
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
