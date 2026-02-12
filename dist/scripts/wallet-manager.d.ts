/**
 * Colosseum Agent Wallet Manager
 *
 * Multi-layer wallet system with Bankr as primary, fallbacks for robustness.
 *
 * Architecture:
 * 1. Bankr API (primary) - AI-powered transactions
 * 2. Direct RPC (fallback) - Manual transactions via web3.js
 * 3. Local Keypair (emergency) - Direct keypair signing
 */
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
export declare class LocalKeypairWallet {
    private keypair;
    private connection;
    constructor(keypairPath?: string);
    get publicKey(): PublicKey;
    getBalance(): Promise<number>;
    signTransaction(tx: Transaction): Promise<Transaction>;
    get connection(): Connection;
}
export declare class BankrWallet {
    private apiKey;
    private localWallet;
    constructor();
    get publicKey(): PublicKey;
    isAvailable(): Promise<boolean>;
    transfer(to: string, amount: number, token?: string): Promise<string>;
    private bankrTransfer;
    private localTransfer;
}
export declare class ColosseumWalletManager {
    private bankr;
    private local;
    private primary;
    private healthCheckCache;
    constructor();
    healthCheck(): Promise<{
        bankr: boolean;
        local: boolean;
    }>;
    transfer(to: string, amount: number, token?: string): Promise<{
        success: boolean;
        signature: string;
        method: string;
        error?: string;
    }>;
    get publicKey(): PublicKey;
}
//# sourceMappingURL=wallet-manager.d.ts.map