export interface RpcUrls {
  testnet?: string;
  mainnet?: string;
}

export interface TokenConfig {
  contractAddress?: string; // alias
  address?: string;
  abi?: any[];
  decimals?: number;
  symbol?: string;
  name?: string;
}

export interface NetworkConfig {
  environment: number; // 0 = testnet, otherwise mainnet
  rpcUrl: RpcUrls;
  tokens?: Record<string, TokenConfig>;
}

export interface OathstoneConfig {
  networks: Record<string, NetworkConfig>;
}

export interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic: string | null;
}

export interface TxResult {
  network: string;
  hash: string;
  status: number | null;
  token?: string;
}

export class OathstoneClient {
  constructor(config: OathstoneConfig);

  /** Create an instance by fetching a JSON config (same shape as data.json) from a URL */
  static fromRemote(url: string): Promise<OathstoneClient>;

  /** Validate and normalize a config (ensures token.contractAddress is set). Throws on invalid config. */
  static validateConfig(config: OathstoneConfig): OathstoneConfig;

  static resolveRpcUrl(networkConfig: NetworkConfig): string;
  static readonly ERC20_ABI: any[];

  connectNetworks(): Promise<boolean>;
  loadContracts(): Promise<boolean>;

  getProvider(network: string): any;
  getContract(network: string, tokenName: string): any;

  createWallet(): WalletInfo;

  getNativeBalance(network: string, address: string): Promise<string>;
  getTokenBalance(network: string, tokenName: string, address: string): Promise<string>;

  transferNative(network: string, fromPrivateKey: string, toAddress: string, amount: string | number): Promise<TxResult>;
  transferToken(network: string, tokenName: string, fromPrivateKey: string, toAddress: string, amount: string | number): Promise<TxResult>;
}

export default OathstoneClient;