# Oathstone Client

A lightweight, browser-friendly SDK to do on the client exactly what your server API did:
- Connect to multiple EVM networks via RPC (testnet/mainnet)
- Create wallets (mnemonic/private key)
- Get native balances (ETH/CELO/etc.)
- Get ERC-20 token balances
- Transfer native and ERC-20 tokens

Built with ethers v6. Works in React, Next.js, Vue, and vanilla JS.

## Installation

```bash
npm install oathstone-client
# or
yarn add oathstone-client
```

## Quick Start

```js
import OathstoneClient from "oathstone-client";

// Same shape as your previous data.json, but passed inline (no fs needed on client)
const config = {
  networks: {
    celo: {
      // 0 = testnet (alfajores), 1 = mainnet
      environment: 0,
      rpcUrl: {
        testnet: "https://alfajores-forno.celo-testnet.org",
        mainnet: "https://forno.celo.org"
      },
      tokens: {
        USD: {
          contractAddress: "0x45f1DcFE95db1e61240b8450C78ed467463dC8E9"
          // Optional overrides:
          // decimals: 18,
          // abi: [ ... ],
        }
      }
    }
  }
};

const client = new OathstoneClient(config);

// Connect and prepare contracts
await client.connectNetworks();
await client.loadContracts();

// Create a new wallet (BIP-39)
const wallet = client.createWallet();
// { address, privateKey, mnemonic }

// Get balances
const native = await client.getNativeBalance("celo", wallet.address);
const usd = await client.getTokenBalance("celo", "USD", wallet.address);

// Transfers (be careful — these send live transactions!)
await client.transferNative("celo", wallet.privateKey, "0xRecipient", "0.01");
await client.transferToken("celo", "USD", wallet.privateKey, "0xRecipient", "5.5");
```

## API

- new OathstoneClient(config)
  - config.networks[networkName]
    - environment: 0 for testnet, any other value for mainnet
    - rpcUrl: { testnet: string, mainnet: string }
    - tokens: { [tokenName]: { contractAddress: string, abi?: any[], decimals?: number } }

- connectNetworks(): Promise<boolean>
- loadContracts(): Promise<boolean>
- createWallet(): { address, privateKey, mnemonic }
- getNativeBalance(network, address): Promise<string>
- getTokenBalance(network, tokenName, address): Promise<string>
- transferNative(network, fromPrivateKey, toAddress, amount): Promise<{ network, hash, status }>
- transferToken(network, tokenName, fromPrivateKey, toAddress, amount): Promise<{ network, token, hash, status }>

Notes:
- Amounts are strings or numbers in human-readable units (ETH for native, token units for ERC-20).
- Token decimals are auto-detected via the contract's `decimals()` call if not provided in config.

## Framework Notes

- React/Next.js: This package is ESM and browser-targeted. You can import it directly in components or hooks.
- Server-side rendering: Only call network methods inside client-side code paths (e.g., useEffect) to avoid SSR provider usage.

## Build

```bash
npm run build
```

This outputs ESM to `dist/index.js`.

## License

MIT

