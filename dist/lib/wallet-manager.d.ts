/**
 * Redundant Wallet Manager - TypeScript Client
 *
 * Multi-layer wallet system for Claw Royale agents.
 * Use this in Node.js scripts and frontend components.
 */
export interface WalletConfig {
    bankrApiKey?: string;
    bankrApiUrl: string;
    localKeypairPath: string;
    rpcUrl: string;
    retryAttempts: number;
    retryDelay: number;
}
export declare const DEFAULT_CONFIG: WalletConfig;
export interface TxResult {
    success: boolean;
    signature?: string;
    method: 'bankr' | 'local' | 'emergency' | 'none';
    error?: string;
    retries: number;
    timestamp: number;
}
export interface WalletHealth {
    bankr: {
        available: boolean;
        latency?: number;
        error?: string;
    };
    local: {
        available: boolean;
        balance?: number;
    };
    currentMode: 'bankr' | 'local' | 'emergency';
    lastHealthCheck: number;
}
export declare class RedundantWalletManager {
    private config;
    private local;
    private bankr;
    private healthCache;
    private currentMode;
    private failureCount;
    constructor();
    getHealth(forceRefresh?: boolean): Promise<WalletHealth>;
    transfer(to: string, amount: number, token?: string): Promise<TxResult>;
    placeBet(battleId: string, amount: number): Promise<TxResult>;
    claimPrize(battleId: string, winnerAddress: string, amount: number): Promise<TxResult>;
    distributeRewards(recipients: Array<{
        address: string;
        amount: number;
    }>): Promise<TxResult[]>;
    get address(): string;
    get mode(): string;
    status(): Promise<string>;
    private sleep;
}
export declare function createWalletManager(): RedundantWalletManager;
//# sourceMappingURL=wallet-manager.d.ts.map