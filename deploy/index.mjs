import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contractPath = resolve(__dirname, "../contracts/freelance_escrow.py");
const code = readFileSync(contractPath, "utf-8");

// Server-side / CLI deployment uses an ephemeral account.
// The frontend uses the user's MetaMask via the wallet adapter.
const account = createAccount();

const client = createClient({
  chain: studionet,
  account,
});

console.log("🚀 Deploying FreelanceEscrow to GenLayer Studionet...");
console.log(`   Account: ${account.address}`);

try {
  const hash = await client.deployContract({ code, args: [] });
  console.log(`   Tx hash: ${hash}`);
  console.log("   Waiting for confirmation...");
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`\n✅ Deployed!`);
  console.log(`   Contract address: ${receipt.contractAddress}`);
  console.log(`\n   Add to frontend/.env.local:`);
  console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${receipt.contractAddress}`);
} catch (e) {
  console.error("❌ Deployment failed:", e.message || e);
}
