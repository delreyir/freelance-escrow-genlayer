import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { GenLayerClient } from "genlayer-js/types";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xEf2647EeA410292d37AB82C3F39472D9cE0Dc357") as `0x${string}`;

declare global {
  interface Window { ethereum?: any; }
}

export type WalletState = { address: `0x${string}` | null; client: GenLayerClient<any> | null; };

export function hasWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export async function connectWallet(): Promise<WalletState> {
  if (!hasWallet()) throw new Error("No wallet found. Install MetaMask, Rabby, or another EVM wallet.");
  const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts?.length) throw new Error("No accounts authorized");
  const address = accounts[0] as `0x${string}`;
  const client = createClient({ chain: studionet, account: address });
  await client.connect("studionet");
  return { address, client };
}

export function readClient(): GenLayerClient<any> {
  return createClient({ chain: studionet }) as GenLayerClient<any>;
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
