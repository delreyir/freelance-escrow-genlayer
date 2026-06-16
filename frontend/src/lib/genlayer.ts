import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { GenLayerClient } from "genlayer-js/types";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xEf2647EeA410292d37AB82C3F39472D9cE0Dc357") as `0x${string}`;

declare global {
  interface Window { ethereum?: any; }
}

export type WalletState = { address: `0x${string}` | null; client: GenLayerClient<any> | null; };

// GenLayer Studio Network — added to the wallet the standard EVM way (no Snap required)
const STUDIONET = {
  chainId: "0xF22F", // 61999
  chainName: "GenLayer Studio Network",
  nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: ["https://genlayer-explorer.vercel.app"],
};

export function hasWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

// Connects a plain EVM wallet (MetaMask, Rabby, …) WITHOUT installing any Snap.
// Signing goes through the wallet's normal eth_sendTransaction popup.
export async function connectWallet(): Promise<WalletState> {
  if (!hasWallet()) throw new Error("No wallet found. Install MetaMask, Rabby, or another EVM wallet.");

  const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts?.length) throw new Error("No accounts authorized");
  const address = accounts[0] as `0x${string}`;

  // Switch (or add) the GenLayer Studio network — standard wallet RPC, no Snap
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: STUDIONET.chainId }] });
  } catch (e: any) {
    if (e?.code === 4902 || /Unrecognized chain/i.test(e?.message || "")) {
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [STUDIONET] });
    } else if (e?.code !== 4001) {
      // ignore other non-rejection errors; signing will still surface a clear message
    } else {
      throw e;
    }
  }

  // No client.connect() call → no GenLayer Snap prompt. The wallet signs directly.
  const client = createClient({ chain: studionet, account: address, provider: window.ethereum } as any);
  return { address, client };
}

export function readClient(): GenLayerClient<any> {
  return createClient({ chain: studionet }) as GenLayerClient<any>;
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
