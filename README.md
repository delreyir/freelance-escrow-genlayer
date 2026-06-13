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

## Deployed Contract

```
Network: GenLayer Studionet
Address: 0xEf2647EeA410292d37AB82C3F39472D9cE0Dc357
```

You can interact with this contract directly via [GenLayer Studio](https://studio.genlayer.com) — import by address.

## Setup

### 1. Install GenLayer CLI

```bash
npm install -g genlayer
genlayer network set studionet
```

### 2. Deploy the Contract

```bash
genlayer account create --name deployer --password "yourpass"
genlayer account unlock --password "yourpass"
genlayer deploy --contract contracts/freelance_escrow.py
```

Or use the already-deployed address above.

### 3. Run Frontend Locally

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=0xEf2647EeA410292d37AB82C3F39472D9cE0Dc357" > .env.local
npm run dev
```

The app will be available at your local development server.

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
