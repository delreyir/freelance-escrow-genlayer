# ⚖️ Freelance Escrow with AI Arbitration — GenLayer

Decentralized freelance marketplace where payments are locked in escrow and disputes are resolved by AI validators through GenLayer's consensus mechanism.

## Architecture

```
Frontend (Next.js) → GenLayerJS SDK → GenLayer Network → FreelanceEscrow Contract
                                                              ↓
                                                    AI Validators (LLM consensus)
```

## How It Works

1. **Client** posts a job with GEN locked in escrow
2. **Freelancer** accepts the job
3. **Freelancer** submits the deliverable
4. **Client** either:
   - ✅ Approves → payment released to freelancer
   - ❌ Disputes → AI arbitration is triggered
5. **AI Arbitration**: Multiple AI validators independently evaluate the deliverable against requirements and reach consensus on a fair split

## Project Structure

```
freelance-escrow-genlayer/
├── contracts/
│   └── freelance_escrow.py      # GenLayer Intelligent Contract
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   └── page.tsx         # Main UI
    │   └── lib/
    │       └── genlayer.ts      # SDK config
    ├── .env.local               # Contract address
    └── package.json
```

## Setup

### 1. Install GenLayer CLI & Start Studio

```bash
pip install genlayer
genlayer init
genlayer up
```

### 2. Deploy the Contract

Load `contracts/freelance_escrow.py` in GenLayer Studio (http://localhost:8080), deploy it, and copy the contract address.

Or via CLI:
```bash
genlayer deploy contracts/freelance_escrow.py
```

### 3. Configure Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
# Optional, defaults to "studionet". Other options: localnet | testnetAsimov | testnetBradbury
NEXT_PUBLIC_GENLAYER_NETWORK=studionet
```

### 4. Run Frontend

```bash
npm run dev
```

Open http://localhost:3000, click **Connect Wallet** (MetaMask). The app will switch MetaMask to the configured GenLayer network and use the connected account to sign transactions.

## Wallet Adapter

The frontend uses two GenLayer clients:

- `readClient` — built once at module load, talks directly to GenLayer RPC for `readContract` / `getTransaction` / `waitForTransactionReceipt`. No wallet needed.
- `writeClient` — built per-action via `createWriteClient(address)` using `window.ethereum` as the EIP-1193 provider. Every `writeContract` triggers a MetaMask popup signed by the connected account.

Network and chain switching is handled by `client.connect("studionet")` so the user's wallet is added/switched to the right GenLayer chain on connect.

## Contract Methods

| Method | Type | Description |
|--------|------|-------------|
| `create_job(title, description, requirements)` | payable write | Client creates job with GEN escrow |
| `accept_job(job_id)` | write | Freelancer accepts a job |
| `submit_deliverable(job_id, deliverable)` | write | Freelancer submits work |
| `approve_deliverable(job_id)` | write | Client approves and releases payment |
| `raise_dispute(job_id, reason)` | write | Client disputes the deliverable |
| `resolve_dispute(job_id)` | write (AI) | Triggers AI arbitration with consensus |
| `get_job(job_id)` | view | Get job details |
| `get_job_count()` | view | Total number of jobs |

## AI Arbitration

When a dispute is triggered, the contract uses `gl.vm.run_nondet_unsafe` with:
- **Leader**: An AI evaluates the deliverable vs requirements and outputs a decision (freelancer/client/split) with a percentage
- **Validators**: Independently run the same evaluation and verify:
  - Decision field matches exactly
  - Freelancer percentage is within ±10% tolerance

The escrowed funds are split according to the consensus result.
