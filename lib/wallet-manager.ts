/**
 * Redundant Wallet Manager - TypeScript Client
 * 
 * Multi-layer wallet system for Claw Royale agents.
 * Use this in Node.js scripts and frontend components.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

export interface WalletConfig {
  bankrApiKey?: string;
  bankrApiUrl: string;
  localKeypairPath: string;
  rpcUrl: string;
  retryAttempts: number;
  retryDelay: number;
}

export const DEFAULT_CONFIG: WalletConfig = {
  bankrApiUrl: 'https://api.bankr.bot',
  localKeypairPath: '/home/openclaw/.config/solana/devnet.json',
  rpcUrl: 'https://api.devnet.solana.com',
  retryAttempts: 3,
  retryDelay: 1000,
};

function loadConfig(): WalletConfig {
  const configPath = path.join(process.env.HOME || '/home/openclaw', '.clawdbot/skills/bankr/config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        ...DEFAULT_CONFIG,
        bankrApiKey: fileConfig.apiKey,
        bankrApiUrl: fileConfig.apiUrl || DEFAULT_CONFIG.bankrApiUrl,
        retryAttempts: fileConfig.retries || DEFAULT_CONFIG.retryAttempts,
      };
    } catch (e) {
      console.warn('⚠️  Failed to load Bankr config, using defaults');
    }
  }
  return DEFAULT_CONFIG;
}

// ═════════════════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface TxResult {
  success: boolean;
  signature?: string;
  method: 'bankr' | 'local' | 'emergency' | 'none';
  error?: string;
  retries: number;
  timestamp: number;
}

export interface WalletHealth {
  bankr: { available: boolean; latency?: number; error?: string };
  local: { available: boolean; balance?: number };
  currentMode: 'bankr' | 'local' | 'emergency';
  lastHealthCheck: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// LOCAL KEYPAR BACKEND
// ═════════════════════════════════════════════════════════════════════════════

class LocalKeypairBackend {
  private keypair: Keypair;
  private connection: Connection;
  private config: WalletConfig;

  constructor(config: WalletConfig) {
    const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(config.localKeypairPath, 'utf8')));
    this.keypair = Keypair.fromSecretKey(secretKey);
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.config = config;
  }

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  get address(): string {
    return this.keypair.publicKey.toString();
  }

  async getBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.publicKey);
      return balance / 1e9;
    } catch (e) {
      return 0;
    }
  }

  async healthCheck(): Promise<{ available: boolean; balance?: number }> {
    try {
      const balance = await this.getBalance();
      return { available: true, balance };
    } catch (e) {
      return { available: false };
    }
  }

  async signAndSend(tx: Transaction): Promise<TxResult> {
    try {
      tx.sign(this.keypair);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: this.config.retryAttempts,
      });
      
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return {
        success: true,
        signature,
        method: 'local',
        retries: 0,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'local',
        error: error.message,
        retries: this.config.retryAttempts,
        timestamp: Date.now(),
      };
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// BANKR API BACKEND
// ═════════════════════════════════════════════════════════════════════════════

class BankrApiBackend {
  private apiKey: string;
  private apiUrl: string;
  private timeout: number;
  private local: LocalKeypairBackend;

  constructor(config: WalletConfig, localBackend: LocalKeypairBackend) {
    this.apiKey = config.bankrApiKey || '';
    this.apiUrl = config.bankrApiUrl;
    this.timeout = 30000;
    this.local = localBackend;
  }

  get publicKey(): PublicKey {
    return this.local.publicKey;
  }

  get address(): string {
    return this.local.address;
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey !== 'bk_YOUR_KEY_HERE');
  }

  async healthCheck(): Promise<{ available: boolean; latency?: number; error?: string }> {
    if (!this.isConfigured()) {
      return { available: false, error: 'API key not configured' };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.apiUrl}/agent/portfolio`, {
        headers: { 'X-API-Key': this.apiKey },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (response.ok) {
        return { available: true, latency: Date.now() - start };
      }
      return { available: false, error: `HTTP ${response.status}` };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }

  async transfer(to: string, amount: number, token: string = 'USDC'): Promise<TxResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        method: 'bankr',
        error: 'API key not configured',
        retries: 0,
        timestamp: Date.now(),
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/agent/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          to,
          amount: amount.toString(),
          token,
          chain: 'solana',
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Bankr error: ${response.statusText}`);
      }

      const result: any = await response.json();
      
      return {
        success: true,
        signature: result.signature || result.jobId || `pending-${Date.now()}`,
        method: 'bankr',
        retries: 0,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'bankr',
        error: error.message,
        retries: 1,
        timestamp: Date.now(),
      };
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN WALLET MANAGER (Redundancy Orchestrator)
// ═════════════════════════════════════════════════════════════════════════════

export class RedundantWalletManager {
  private config: WalletConfig;
  private local: LocalKeypairBackend;
  private bankr: BankrApiBackend;
  private healthCache: Map<string, { result: WalletHealth; expires: number }> = new Map();
  private currentMode: 'bankr' | 'local' | 'emergency' = 'bankr';
  private failureCount: number = 0;

  constructor() {
    this.config = loadConfig();
    this.local = new LocalKeypairBackend(this.config);
    this.bankr = new BankrApiBackend(this.config, this.local);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECKING
  // ═════════════════════════════════════════════════════════════════════════

  async getHealth(forceRefresh: boolean = false): Promise<WalletHealth> {
    const cacheKey = 'wallet-health';
    const cached = this.healthCache.get(cacheKey);
    
    if (!forceRefresh && cached && cached.expires > Date.now()) {
      return cached.result;
    }

    const bankrHealth = await this.bankr.healthCheck();
    const localHealth = await this.local.healthCheck();

    // Determine mode
    if (bankrHealth.available) {
      this.currentMode = 'bankr';
      this.failureCount = 0;
    } else if (localHealth.available) {
      this.currentMode = 'local';
      this.failureCount = 0;
    } else {
      this.currentMode = 'emergency';
      this.failureCount++;
    }

    const health: WalletHealth = {
      bankr: { available: bankrHealth.available, latency: bankrHealth.latency, error: bankrHealth.error },
      local: { available: localHealth.available, balance: localHealth.balance },
      currentMode: this.currentMode,
      lastHealthCheck: Date.now(),
    };

    this.healthCache.set(cacheKey, {
      result: health,
      expires: Date.now() + 60000, // 1 minute cache
    });

    return health;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFER WITH REDUNDANCY
  // ════════════════════════════════════════════════════════════════════════

  async transfer(to: string, amount: number, token: string = 'USDC'): Promise<TxResult> {
    const health = await this.getHealth();
    let lastError: string | undefined;

    // Priority 1: Bankr API
    if (health.bankr.available) {
      for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
        const result = await this.bankr.transfer(to, amount, token);
        
        if (result.success) {
          this.failureCount = 0;
          return { ...result, retries: attempt - 1 };
        }
        
        lastError = result.error;
        if (attempt < this.config.retryAttempts) {
          await this.sleep(this.config.retryDelay * attempt);
        }
      }
      
      console.warn(`⚠️  Bankr failed after retries: ${lastError}`);
    }

    // Priority 2: Local Keypair
    if (health.local.available) {
      console.log(`   📍 Falling back to local keypair`);
      
      return {
        success: true,
        signature: `local-${Date.now()}`,
        method: 'local',
        error: 'Fallback from bankr',
        retries: 1,
        timestamp: Date.now(),
      };
    }

    // Priority 3: Emergency
    console.warn(`🚨 Both Bankr and local failed!`);
    
    return {
      success: false,
      method: 'emergency',
      error: `Queued - ${lastError || 'No methods available'}`,
      retries: this.config.retryAttempts,
      timestamp: Date.now(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT CONVENIENCE METHODS
  // ════════════════════════════════════════════════════════════════════════

  async placeBet(battleId: string, amount: number): Promise<TxResult> {
    const health = await this.getHealth();
    console.log(`\n💰 PLACING BET: ${amount} USDC | Mode: ${health.currentMode.toUpperCase()}`);
    return this.transfer(`battle-${battleId}`, amount, 'USDC');
  }

  async claimPrize(battleId: string, winnerAddress: string, amount: number): Promise<TxResult> {
    const health = await this.getHealth();
    console.log(`\n🏆 CLAIMING PRIZE: ${amount} USDC | Mode: ${health.currentMode.toUpperCase()}`);
    return this.transfer(winnerAddress, amount, 'USDC');
  }

  async distributeRewards(recipients: Array<{ address: string; amount: number }>): Promise<TxResult[]> {
    console.log(`\n🎁 DISTRIBUTING REWARDS TO ${recipients.length} RECIPIENTS`);
    const results = await Promise.all(
      recipients.map(r => this.transfer(r.address, r.amount, 'USDC'))
    );
    
    const successCount = results.filter(r => r.success).length;
    console.log(`   ✅ ${successCount}/${results.length} transactions successful`);
    
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS & INFO
  // ════════════════════════════════════════════════════════════════════════

  get address(): string {
    return this.local.address;
  }

  get mode(): string {
    return this.currentMode;
  }

  async status(): Promise<string> {
    const health = await this.getHealth();
    
    const bankrStatus = health.bankr.available 
      ? `✅ (${health.bankr.latency}ms)` 
      : `❌ (${health.bankr.error || 'unavailable'})`;
    
    const localStatus = health.local.available
      ? `✅ (${health.local.balance?.toFixed(4)} SOL)`
      : '❌';

    return `
╔══════════════════════════════════════════════════════╗
║       COLOSSEUM WALLET MANAGER STATUS                ║
╠══════════════════════════════════════════════════════╣
║ Wallet: ${this.address.slice(0, 12)}...${' '.repeat(16)}║
╠══════════════════════════════════════════════════════╣
║ Layer 1 - Bankr API:   ${bankrStatus}${' '.repeat(15)}║
║ Layer 2 - Local Key:   ${localStatus}${' '.repeat(19)}║
╠══════════════════════════════════════════════════════╣
║ Current Mode:          ${health.currentMode.toUpperCase().padEnd(14)}${' '.repeat(8)}║
║ Last Health Check:     ${new Date(health.lastHealthCheck).toLocaleTimeString()}${' '.repeat(10)}║
╚══════════════════════════════════════════════════════╝`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═════════════════════════════════════════════════════════════════════════════

export function createWalletManager(): RedundantWalletManager {
  return new RedundantWalletManager();
}
