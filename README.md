# 🛡️ FreelanceShield

**Freelance escrow with AI dispute resolution.**

🔗 **Live app:** https://freelanceshield.pages.dev

---

## The Problem

Freelance platforms like Fiverr and Upwork rely on centralized support teams to resolve disputes — slow, opaque, and often unfair. Clients fear paying upfront; freelancers fear delivering without guarantee of payment.

FreelanceShield locks the payment in escrow on-chain and, when a dispute happens, lets GenLayer's AI validators read the agreed requirements and the actual deliverable to decide a fair split — in minutes, not weeks.

---

## How It Works

1. **Connect your wallet** (MetaMask, Rabby, or any EVM wallet — no Snap required)
2. **Client posts a job** with a description, requirements, deadline, and GEN locked in escrow.
3. **Freelancer accepts** and submits the deliverable before the deadline.
4. **Client resolves it:**
   - ✅ **Approve** → payment released to the freelancer, or
   - ❌ **Dispute** → AI arbitration is triggered.
5. **AI arbitration** — validators evaluate the deliverable against the requirements and reach consensus on a fair split (freelancer / client / partial). Funds are distributed accordingly.

After completion, client and freelancer can rate each other (1–5), building on-chain reputation.

---

## Why GenLayer?

A deterministic contract can hold escrow but can't judge whether delivered work "meets the spec." GenLayer validators read both the requirements and the deliverable and reach consensus on a subjective decision — the decision field must match exactly and the payout percentage must agree within a tolerance, so the split is fair and tamper-resistant.

---

## Wallet & Network

Standard EVM wallet, normal signing popup — **no GenLayer Snap**. On connect it adds/switches to the **GenLayer Studio Network** (chain `61999`, RPC `https://studio.genlayer.com/api`).

---

## Contract API

| Method | Type | Description |
|--------|------|-------------|
| `create_job(title, description, requirements, deadline_hours)` | payable | Post a job, lock escrow |
| `accept_job(job_id)` | write | Freelancer accepts |
| `submit_deliverable(job_id, deliverable)` | write | Freelancer submits work |
| `approve_deliverable(job_id)` | write | Client approves → pay |
| `raise_dispute(job_id, reason)` | write | Client disputes |
| `resolve_dispute(job_id)` | write (AI) | AI arbitrates the split |
| `cancel_job(job_id)` | write | Cancel an open job, refund |
| `claim_expired(job_id)` | write | Reclaim escrow if deadline passed with no delivery |
| `rate_freelancer(job_id, score)` / `rate_client(job_id, score)` | write | 1–5 rating |
| `get_job(job_id)` / `get_job_count()` / `get_rating(address)` | view | Reads |

**Consensus rule:** arbitration `decision` must match exactly; `freelancer_percent` within ±10.

---

## Project Structure

```
freelance-escrow-genlayer/
├── contracts/
│   └── freelance_escrow.py  # GenLayer Intelligent Contract (Python)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx     # SaaS dashboard + sidebar UI
│   │   └── lib/
│   │       └── genlayer.ts  # Wallet connect (no Snap) + read client
│   ├── next.config.js
│   └── package.json
└── README.md
```

---

## Run Locally

```bash
npm install -g genlayer
genlayer network set studionet
genlayer account create --name deployer --password "yourpass"
genlayer account unlock --password "yourpass"
genlayer deploy --contract contracts/freelance_escrow.py

cd frontend
npm install
npm run dev
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Python — GenLayer Intelligent Contract |
| AI consensus | `gl.vm.run_nondet_unsafe` + partial field matching |
| Frontend | Next.js (static export) + TypeScript |
| SDK | genlayer-js |
| Hosting | Cloudflare Pages |

---

## License

MIT
