import { ethers } from "ethers";

/**
 * OathstoneClient
 * Lightweight browser-friendly SDK to:
 * - connect to multiple EVM networks via RPC
 * - create wallets
 * - get native and ERC-20 token balances
 * - transfer native and ERC-20 tokens
 *
 * Works in React, Next.js, Vue and other modern frontend frameworks.
 *
 * Usage:
 *   import { OathstoneClient } from "oathstone-js";
 *   const client = new OathstoneClient(config);
 *   await client.connectNetworks();
 *   await client.loadContracts();
 *   const wallet = client.createWallet();
 *
 * If you previously used a data.json file on the server, pass the same shape
 * of data as the `config` object, or use:
 *   const client = await OathstoneClient.fromRemote('/path/to/data.json');
 */
export class OathstoneClient {
  constructor(config) {
    if (!config || !config.networks) {
      throw new Error("Invalid config: expected { networks: {...} }");
    }
    this.config = OathstoneClient.validateConfig(config);
    this.providers = {};
    this.contracts = {};
  }

  // Create an instance by fetching a data.json-like config from a URL (browser-friendly).
  static async fromRemote(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch config from ${url}: ${res.status}`);
    const json = await res.json();
    return new OathstoneClient(json);
  }

  // Validates and normalizes the config (accepts token.address or token.contractAddress)
  static validateConfig(config) {
    const normalized = { ...config, networks: { ...config.networks } };
    for (const [n, net] of Object.entries(normalized.networks)) {
      if (!net || !net.rpcUrl) {
        throw new Error(`Network ${n} missing rpcUrl`);
      }
      const tokens = net.tokens || {};
      const normTokens = {};
      for (const [t, tk] of Object.entries(tokens)) {
        const address = tk.contractAddress || tk.address;
        normTokens[t] = { ...tk, contractAddress: address };
      }
      normalized.networks[n] = { ...net, tokens: normTokens };
    }
    return normalized;
  }

  // Picks correct RPC URL given environment flag (0 = testnet, else mainnet)
  static resolveRpcUrl(networkConfig) {
    const isTestnet = Number(networkConfig.environment) === 0;
    const rpcUrl =
      isTestnet ? networkConfig.rpcUrl?.testnet : networkConfig.rpcUrl?.mainnet;
    if (!rpcUrl) {
      throw new Error("Missing rpcUrl for network (check testnet/mainnet keys)");
    }
    return rpcUrl;
  }

  // Minimal ERC-20 ABI (overridable per-token via config.tokens[TOKEN].abi)
  static get ERC20_ABI() {
    return [
      { constant: true, inputs: [{ name: "owner", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], type: "function", stateMutability: "view" },
      { constant: false, inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], type: "function", stateMutability: "nonpayable" },
      { constant: true, inputs: [], name: "decimals", outputs: [{ name: "", type: "uint8" }], type: "function", stateMutability: "view" },
      { constant: true, inputs: [], name: "symbol", outputs: [{ name: "", type: "string" }], type: "function", stateMutability: "view" },
      { constant: true, inputs: [], name: "name", outputs: [{ name: "", type: "string" }], type: "function", stateMutability: "view" }
    ];
  }

  async connectNetworks() {
    for (const [networkName, networkConfig] of Object.entries(this.config.networks)) {
      const rpcUrl = OathstoneClient.resolveRpcUrl(networkConfig);
      this.providers[networkName] = new ethers.JsonRpcProvider(rpcUrl);
    }
    return true;
  }

  async loadContracts() {
    if (!Object.keys(this.providers).length) {
      await this.connectNetworks();
    }
    for (const [networkName, networkConfig] of Object.entries(this.config.networks)) {
      this.contracts[networkName] = this.contracts[networkName] || {};
      const tokens = networkConfig.tokens || {};
      for (const [tokenName, tokenConfig] of Object.entries(tokens)) {
        const address = tokenConfig.contractAddress || tokenConfig.address;
        if (!address) continue;
        const abi = tokenConfig.abi && Array.isArray(tokenConfig.abi)
          ? tokenConfig.abi
          : OathstoneClient.ERC20_ABI;
        this.contracts[networkName][tokenName] = new ethers.Contract(
          address,
          abi,
          this.providers[networkName]
        );
      }
    }
    return true;
  }

  getProvider(network) {
    return this.providers[network];
  }

  getContract(network, tokenName) {
    return this.contracts[network]?.[tokenName];
  }

  // Creates new wallet (BIP-39)
  createWallet() {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || null
    };
  }

  // Native balance formatted as string (ether units)
  async getNativeBalance(network, address) {
    const provider = this.getProvider(network);
    if (!provider) throw new Error(`Provider not initialized for ${network}`);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  // Token balance formatted with ERC-20 decimals
  async getTokenBalance(network, tokenName, address) {
    const contract = this.getContract(network, tokenName);
    if (!contract) throw new Error(`Contract not found for ${tokenName} on ${network}`);
    const [raw, decimals] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals().catch(() => 18)
    ]);
    return ethers.formatUnits(raw, decimals);
  }

  // Transfer native currency. amount as string/number in ether units.
  async transferNative(network, fromPrivateKey, toAddress, amount) {
    const provider = this.getProvider(network);
    if (!provider) throw new Error(`Provider not initialized for ${network}`);
    const signer = new ethers.Wallet(fromPrivateKey, provider);
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount.toString())
    });
    const receipt = await tx.wait();
    return {
      network,
      hash: tx.hash,
      status: receipt.status
    };
  }

  // Transfer ERC-20. amount in human units, resolves decimals automatically (or via config.tokens[...].decimals)
  async transferToken(network, tokenName, fromPrivateKey, toAddress, amount) {
    const provider = this.getProvider(network);
    if (!provider) throw new Error(`Provider not initialized for ${network}`);
    const contract = this.getContract(network, tokenName);
    if (!contract) throw new Error(`Contract not found for ${tokenName} on ${network}`);

    // Determine decimals (prefer config if provided)
    const decimalsFromConfig =
      this.config.networks?.[network]?.tokens?.[tokenName]?.decimals;
    const decimals = typeof decimalsFromConfig === "number"
      ? decimalsFromConfig
      : await contract.decimals().catch(() => 18);

    const signer = new ethers.Wallet(fromPrivateKey, provider);
    const connected = contract.connect(signer);
    const value = ethers.parseUnits(amount.toString(), decimals);

    const tx = await connected.transfer(toAddress, value);
    const receipt = await tx.wait();

    return {
      network,
      token: tokenName,
      hash: tx.hash,
      status: receipt.status
    };
  }
}

// Default export for convenience
export default OathstoneClient;
