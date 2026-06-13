"""Deploy FreelanceEscrow contract to GenLayer Studio Network via JSON-RPC."""
import json
import requests
import time

STUDIO_URL = "https://studio.genlayer.com/api"

def rpc_call(method, params=None):
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params or []}
    r = requests.post(STUDIO_URL, json=payload)
    data = r.json()
    if "error" in data:
        raise Exception(f"RPC Error: {data['error']}")
    return data.get("result")

def main():
    # Read contract source
    with open("contracts/freelance_escrow.py", "r") as f:
        contract_code = f.read()

    print("Deploying FreelanceEscrow to GenLayer Studio Network...")
    print(f"Endpoint: {STUDIO_URL}")

    # Get available accounts from Studio
    accounts = rpc_call("eth_accounts")
    if not accounts:
        print("No accounts available on Studio. Please open studio.genlayer.com and create an account first.")
        return
    
    sender = accounts[0]
    print(f"Using account: {sender}")

    # Deploy contract
    # GenLayer uses gen_deployContract or similar
    result = rpc_call("gen_deployContract", [{
        "from": sender,
        "code": contract_code,
        "args": [],
    }])

    if result:
        print(f"\n✅ Deployment transaction submitted!")
        print(f"   Result: {json.dumps(result, indent=2)}")
        
        # If result is a tx hash, wait for it
        if isinstance(result, str) and result.startswith("0x"):
            print(f"\n   Transaction hash: {result}")
            print("   Waiting for confirmation...")
            time.sleep(5)
            receipt = rpc_call("gen_getTransactionReceipt", [result])
            if receipt:
                print(f"   Contract address: {receipt.get('contract_address', 'check in Studio')}")
    else:
        print("Deployment returned no result. Check Studio UI for status.")

if __name__ == "__main__":
    main()
