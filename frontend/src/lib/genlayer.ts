import { createClient } from "genlayer-js";
import { studionet, localnet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";
import type { Address } from "genlayer-js/types";

// ---------------------------------------------------------------------------
// Network configuration
// ---------------------------------------------------------------------------
// Available chains: localnet | studionet | testnetAsimov | testnetBradbury
// Configure via NEXT_PUBLIC_GENLAYER_NETWORK in .env.local (defaults to studionet)
const NETWORK_NAME = (process.env.NEXT_PUBLIC_GENLAYER_NETWORK || "studionet") as
  | "localnet"
  | "studionet"
  | "testnetAsimov"
  | "testnetBradbury";

const CHAINS = {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
};

export const chain = CHAINS[NETWORK_NAME];
export const networkName = NETWORK_NAME;

// ---------------------------------------------------------------------------
// Read client — talks directly to the GenLayer RPC, no wallet needed
// Used for: readContract, getTransaction, waitForTransactionReceipt, etc.
// ---------------------------------------------------------------------------
export const readClient = createClient({ chain });

// ---------------------------------------------------------------------------
// Wallet adapter (MetaMask / EIP-1193 injected provider)
// ---------------------------------------------------------------------------
type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getInjectedProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

/**
 * Prompts the user to connect their wallet (MetaMask). Returns the selected
 * EVM address or null if the user rejected / no provider is installed.
 */
export async function connectWallet(): Promise<Address | null> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("No injected wallet found. Install MetaMask to continue.");
  }
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts || accounts.length === 0) return null;
  return accounts[0] as Address;
}

/**
 * Returns the currently connected address (without prompting), or null.
 */
export async function getConnectedAddress(): Promise<Address | null> {
  const provider = getInjectedProvider();
  if (!provider) return null;
  try {
    const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
    return accounts && accounts.length > 0 ? (accounts[0] as Address) : null;
  } catch {
    return null;
  }
}

/**
 * Builds a GenLayer client capable of writing transactions through the
 * connected wallet. The wallet will pop up to sign every writeContract call.
 *
 * Pass the result of `connectWallet()` as `address`.
 */
export function createWriteClient(address: Address) {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("No injected wallet found.");
  }
  return createClient({
    chain,
    account: address,
    // GenLayerJS accepts any EIP-1193 provider (MetaMask, Rabby, etc.)
    // It internally builds a viem custom transport.
    provider: provider as unknown as never,
  });
}

// ---------------------------------------------------------------------------
// Contract address (set after deployment)
// ---------------------------------------------------------------------------
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as Address;
