/**
 * Colosseum Wallet Manager - Redundant Multi-Layer Architecture
 *
 * Priority: Bankr → Local Keypair → Emergency Mode
 *
 * Redundancy Strategy:
 * 1. Bankr API (preferred) - AI-powered, handles gas/approvals
 * 2. Local Keypair (fallback) - Direct RPC transactions
 * 3. Emergency Mode - Queued transactions for manual resolution
 */
export interface WalletConfig {
    bankrApiKey?: string;
    bankrApiUrl: string;
    localKeypairPath: string;
    rpcUrl: string;
    retryAttempts: number;
    retryDelay: number;
    healthCheckInterval: number;
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
    private emergency;
    private healthCache;
    private currentMode;
    private failureCount;
    private failureThreshold;
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
    get emergencyQueueSize(): number;
    status(): Promise<string>;
    private sleep;
}
//# sourceMappingURL=redundant-wallet-manager.d.ts.map