# SLAForge Monitor

A small Node.js + Express service that keeps SLAForge agreements honest:

1. Every 2 minutes it health-checks each service that has active agreements and stores the result in MongoDB.
2. It measures uptime and p95 latency for each agreement.
3. It settles agreements on Arc with the monitor wallet:
   - **SLA missed** (too many failures for the uptime target): settled at once; the customer is refunded and the bond is slashed.
   - **Period ended** with both targets met: settled as met; the provider is paid.

The web app (`../client`) only reads what this service writes. Both must use the same `MONGODB_URI`, `MONGODB_DB` and contract address.

## Run locally

```bash
cp .env.example .env    # then fill it in
npm install
npm run dev             # restarts on file changes
```

## HTTP endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Service info and last run |
| GET | `/health` | `200` when MongoDB answers and the last run is recent, else `503` |
| GET | `/status` | Last run result, interval, monitor wallet |
| POST | `/tick` | Run now. Needs `Authorization: Bearer <CRON_SECRET>` |

## Deploy on a VPS (Ubuntu)

```bash
# 1. Node.js 20+ and pm2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# 2. Code
git clone <your-repo> slaforge && cd slaforge/monitor
npm ci --omit=dev
cp .env.example .env && nano .env      # paste your values
chmod 600 .env

# 3. Start and keep it running after reboots
pm2 start src/index.js --name slaforge-monitor
pm2 save
pm2 startup                            # run the command it prints

# 4. Check
pm2 logs slaforge-monitor              # "SLA monitor started · runs every 2 min"
curl http://localhost:4000/health
```

Update later with `git pull && npm ci --omit=dev && pm2 restart slaforge-monitor`.

Only port 4000 needs to be reachable if you want to call `/health` from outside; the monitor itself only makes outbound connections (Arc RPC, MongoDB, service health endpoints). In MongoDB Atlas, allow your VPS IP under **Network Access**.

## Notes

- **One run at a time:** a MongoDB lock makes sure only one run happens per interval, even if you start the monitor on two machines.
- **After changing the contract:** `(cd ../protocol && forge build) && npm run abi`, then restart.
- **Run once:** `npm run tick` runs a single check-and-settle pass and exits.
- **Security:** `MONITOR_PRIVATE_KEY` can settle (and slash) agreements. Keep it only on this server, never in the web app, and keep just enough USDC on that wallet for gas.
