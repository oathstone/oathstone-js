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

## TypeScript Quick Start

```ts
import OathstoneClient, {
  type OathstoneConfig,
  type WalletInfo,
} from "oathstone-client";

const config: OathstoneConfig = {
  networks: {
    celo: {
      // 0 = testnet (alfajores), any other value = mainnet
      environment: 0,
      rpcUrl: {
        testnet: "https://alfajores-forno.celo-testnet.org",
        mainnet: "https://forno.celo.org",
      },
      tokens: {
        USD: {
          contractAddress: "0x45f1DcFE95db1e61240b8450C78ed467463dC8E9",
          // Optional: decimals: 18,
          // Optional: abi: [...],
        },
      },
    },
  },
};

async function main() {
  const client = new OathstoneClient(config);

  await client.connectNetworks();
  await client.loadContracts();

  const wallet: WalletInfo = client.createWallet();

  const native = await client.getNativeBalance("celo", wallet.address);
  const usd = await client.getTokenBalance("celo", "USD", wallet.address);

  // CAUTION: sends a real transaction if running against a live RPC
  await client.transferNative("celo", wallet.privateKey, "0xRecipient", "0.01");
  await client.transferToken("celo", "USD", wallet.privateKey, "0xRecipient", "5.5");
}

main().catch(console.error);
```

## React (TypeScript) Example

```tsx
"use client";
import React from "react";
import OathstoneClient, { type OathstoneConfig, type WalletInfo } from "oathstone-client";

const config: OathstoneConfig = {
  networks: {
    celo: {
      environment: 0,
      rpcUrl: {
        testnet: "https://alfajores-forno.celo-testnet.org",
        mainnet: "https://forno.celo.org",
      },
      tokens: {
        USD: { contractAddress: "0x45f1DcFE95db1e61240b8450C78ed467463dC8E9" },
      },
    },
  },
};

export default function WalletDemo() {
  const [client] = React.useState(() => new OathstoneClient(config));
  const [wallet, setWallet] = React.useState<WalletInfo | null>(null);
  const [native, setNative] = React.useState<string>("");
  const [usd, setUsd] = React.useState<string>("");

  React.useEffect(() => {
    (async () => {
      await client.connectNetworks();
      await client.loadContracts();
      const w = client.createWallet();
      setWallet(w);

      const nb = await client.getNativeBalance("celo", w.address);
      setNative(nb);
      const tb = await client.getTokenBalance("celo", "USD", w.address);
      setUsd(tb);
    })();
  }, [client]);

  return (
    <div>
      <h3>Wallet</h3>
      <pre>{JSON.stringify(wallet, null, 2)}</pre>
      <h4>CELO: {native}</h4>
      <h4>USD: {usd}</h4>
    </div>
  );
}
```

## Next.js Notes

- Use the SDK only in client components or inside useEffect to avoid SSR issues.
- Add "use client" at the top of Next.js 13+ components that interact with the SDK.

## API (Types)

- new OathstoneClient(config: OathstoneConfig)
  - config.networks[networkName]: NetworkConfig
    - environment: number (0=testnet, otherwise mainnet)
    - rpcUrl: { testnet?: string; mainnet?: string }
    - tokens?: Record<string, TokenConfig>

- connectNetworks(): Promise<boolean>
- loadContracts(): Promise<boolean>
- createWallet(): WalletInfo
- getNativeBalance(network: string, address: string): Promise<string>
- getTokenBalance(network: string, tokenName: string, address: string): Promise<string>
- transferNative(network: string, fromPrivateKey: string, toAddress: string, amount: string | number): Promise<{ network, hash, status }>
- transferToken(network: string, tokenName: string, fromPrivateKey: string, toAddress: string, amount: string | number): Promise<{ network, token, hash, status }>

Notes:
- Amounts are human-readable units (ETH for native, token units for ERC-20).
- Token decimals are auto-detected via `decimals()` if not provided.

## Build

```bash
npm run build
```

Outputs ESM bundle to `dist/index.js` and TypeScript declarations to `dist/index.d.ts`.

## Publish to npm

1) Sign in:
```bash
npm login
```

2) Ensure package name is available or scoped (e.g., @your-scope/oathstone-client). Update package.json fields (name, version, repository, author).

3) Version bump:
```bash
npm version patch   # or minor / major
```

4) Build and publish (2FA if enabled):
```bash
npm run build
npm publish --access public
```

After publish, consumers can:
```bash
npm install oathstone-client
```

## License

MIT

