import { createClient, createAccount } from "genlayer-js";
import { simulator } from "genlayer-js/chains";

// For local development with GenLayer Studio
const account = createAccount();

export const client = createClient({
  chain: simulator,
  account,
});

// Replace with your deployed contract address
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
