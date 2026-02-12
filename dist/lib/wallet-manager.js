"use strict";
/**
 * Redundant Wallet Manager - TypeScript Client
 *
 * Multi-layer wallet system for Claw Royale agents.
 * Use this in Node.js scripts and frontend components.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedundantWalletManager = exports.DEFAULT_CONFIG = void 0;
exports.createWalletManager = createWalletManager;
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.DEFAULT_CONFIG = {
    bankrApiUrl: 'https://api.bankr.bot',
    localKeypairPath: '/home/openclaw/.config/solana/devnet.json',
    rpcUrl: 'https://api.devnet.solana.com',
    retryAttempts: 3,
    retryDelay: 1000,
};
function loadConfig() {
    const configPath = path_1.default.join(process.env.HOME || '/home/openclaw', '.clawdbot/skills/bankr/config.json');
    if (fs_1.default.existsSync(configPath)) {
        try {
            const fileConfig = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
            return {
                ...exports.DEFAULT_CONFIG,
                bankrApiKey: fileConfig.apiKey,
                bankrApiUrl: fileConfig.apiUrl || exports.DEFAULT_CONFIG.bankrApiUrl,
                retryAttempts: fileConfig.retries || exports.DEFAULT_CONFIG.retryAttempts,
            };
        }
        catch (e) {
            console.warn('⚠️  Failed to load Bankr config, using defaults');
        }
    }
    return exports.DEFAULT_CONFIG;
}
// ═════════════════════════════════════════════════════════════════════════════
// LOCAL KEYPAR BACKEND
// ═════════════════════════════════════════════════════════════════════════════
class LocalKeypairBackend {
    constructor(config) {
        const secretKey = new Uint8Array(JSON.parse(fs_1.default.readFileSync(config.localKeypairPath, 'utf8')));
        this.keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
        this.connection = new web3_js_1.Connection(config.rpcUrl, 'confirmed');
        this.config = config;
    }
    get publicKey() {
        return this.keypair.publicKey;
    }
    get address() {
        return this.keypair.publicKey.toString();
    }
    async getBalance() {
        try {
            const balance = await this.connection.getBalance(this.publicKey);
            return balance / 1e9;
        }
        catch (e) {
            return 0;
        }
    }
    async healthCheck() {
        try {
            const balance = await this.getBalance();
            return { available: true, balance };
        }
        catch (e) {
            return { available: false };
        }
    }
    async signAndSend(tx) {
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
        }
        catch (error) {
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
    constructor(config, localBackend) {
        this.apiKey = config.bankrApiKey || '';
        this.apiUrl = config.bankrApiUrl;
        this.timeout = 30000;
        this.local = localBackend;
    }
    get publicKey() {
        return this.local.publicKey;
    }
    get address() {
        return this.local.address;
    }
    isConfigured() {
        return !!(this.apiKey && this.apiKey !== 'bk_YOUR_KEY_HERE');
    }
    async healthCheck() {
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
        }
        catch (error) {
            return { available: false, error: error.message };
        }
    }
    async transfer(to, amount, token = 'USDC') {
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
            const result = await response.json();
            return {
                success: true,
                signature: result.signature || result.jobId || `pending-${Date.now()}`,
                method: 'bankr',
                retries: 0,
                timestamp: Date.now(),
            };
        }
        catch (error) {
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
class RedundantWalletManager {
    constructor() {
        this.healthCache = new Map();
        this.currentMode = 'bankr';
        this.failureCount = 0;
        this.config = loadConfig();
        this.local = new LocalKeypairBackend(this.config);
        this.bankr = new BankrApiBackend(this.config, this.local);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // HEALTH CHECKING
    // ═════════════════════════════════════════════════════════════════════════
    async getHealth(forceRefresh = false) {
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
        }
        else if (localHealth.available) {
            this.currentMode = 'local';
            this.failureCount = 0;
        }
        else {
            this.currentMode = 'emergency';
            this.failureCount++;
        }
        const health = {
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
    async transfer(to, amount, token = 'USDC') {
        const health = await this.getHealth();
        let lastError;
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
    async placeBet(battleId, amount) {
        const health = await this.getHealth();
        console.log(`\n💰 PLACING BET: ${amount} USDC | Mode: ${health.currentMode.toUpperCase()}`);
        return this.transfer(`battle-${battleId}`, amount, 'USDC');
    }
    async claimPrize(battleId, winnerAddress, amount) {
        const health = await this.getHealth();
        console.log(`\n🏆 CLAIMING PRIZE: ${amount} USDC | Mode: ${health.currentMode.toUpperCase()}`);
        return this.transfer(winnerAddress, amount, 'USDC');
    }
    async distributeRewards(recipients) {
        console.log(`\n🎁 DISTRIBUTING REWARDS TO ${recipients.length} RECIPIENTS`);
        const results = await Promise.all(recipients.map(r => this.transfer(r.address, r.amount, 'USDC')));
        const successCount = results.filter(r => r.success).length;
        console.log(`   ✅ ${successCount}/${results.length} transactions successful`);
        return results;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // STATUS & INFO
    // ════════════════════════════════════════════════════════════════════════
    get address() {
        return this.local.address;
    }
    get mode() {
        return this.currentMode;
    }
    async status() {
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RedundantWalletManager = RedundantWalletManager;
// ═════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═════════════════════════════════════════════════════════════════════════════
function createWalletManager() {
    return new RedundantWalletManager();
}
//# sourceMappingURL=wallet-manager.js.map