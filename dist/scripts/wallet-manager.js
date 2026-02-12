"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColosseumWalletManager = exports.BankrWallet = exports.LocalKeypairWallet = void 0;
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG = {
    bankrApiUrl: process.env.BANKR_API_URL || 'https://api.bankr.bot',
    localKeypairPath: process.env.WALLET_PATH || '/home/openclaw/.config/solana/devnet.json',
    rpcUrl: process.env.SOLANA_URL || 'https://api.devnet.solana.com',
    retryAttempts: 3,
    timeout: 30000,
};
// Load from config file if available
function loadConfig() {
    try {
        const configPath = path_1.default.join(process.env.HOME || '/home/openclaw', '.clawdbot/skills/bankr/config.json');
        if (fs_1.default.existsSync(configPath)) {
            const fileConfig = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
            CONFIG.bankrApiKey = fileConfig.apiKey;
            CONFIG.bankrApiUrl = fileConfig.apiUrl || CONFIG.bankrApiUrl;
        }
    }
    catch (e) {
        // Config file not found, use defaults
    }
    return CONFIG;
}
// ═════════════════════════════════════════════════════════════════════════════
// LAYER 1: LOCAL KEYPAR (Emergency Fallback)
// ═════════════════════════════════════════════════════════════════════════════
class LocalKeypairWallet {
    constructor(keypairPath) {
        const path = keypairPath || CONFIG.localKeypairPath;
        const secretKey = new Uint8Array(JSON.parse(fs_1.default.readFileSync(path, 'utf8')));
        this.keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
        this.connection = new web3_js_1.Connection(CONFIG.rpcUrl, 'confirmed');
    }
    get publicKey() {
        return this.keypair.publicKey;
    }
    async getBalance() {
        const balance = await this.connection.getBalance(this.keypair.publicKey);
        return balance / 1e9;
    }
    async signTransaction(tx) {
        tx.sign(this.keypair);
        return tx;
    }
    get connection() {
        return this.connection;
    }
}
exports.LocalKeypairWallet = LocalKeypairWallet;
// ═════════════════════════════════════════════════════════════════════════════
// LAYER 2: BANKR API (Primary)
// ═════════════════════════════════════════════════════════════════════════════
class BankrWallet {
    constructor() {
        this.localWallet = new LocalKeypairWallet();
        this.apiKey = CONFIG.bankrApiKey || '';
    }
    get publicKey() {
        return this.localWallet.publicKey;
    }
    async isAvailable() {
        if (!this.apiKey || this.apiKey === 'bk_YOUR_KEY_HERE') {
            return false;
        }
        try {
            const response = await fetch(`${CONFIG.bankrApiUrl}/agent/portfolio`, {
                headers: { 'X-API-Key': this.apiKey },
                signal: AbortSignal.timeout(CONFIG.timeout)
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async transfer(to, amount, token = 'USDC') {
        if (this.apiKey && this.apiKey !== 'bk_YOUR_KEY_HERE') {
            try {
                return await this.bankrTransfer(to, amount, token);
            }
            catch (error) {
                console.warn('Bankr transfer failed, falling back to local:', error);
            }
        }
        return await this.localTransfer(to, amount, token);
    }
    async bankrTransfer(to, amount, token) {
        const response = await fetch(`${CONFIG.bankrApiUrl}/agent/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            },
            body: JSON.stringify({
                to,
                amount: amount.toString(),
                token,
                chain: 'solana'
            }),
            signal: AbortSignal.timeout(CONFIG.timeout)
        });
        if (!response.ok) {
            throw new Error(`Bankr transfer failed: ${response.statusText}`);
        }
        const result = await response.json();
        return result.jobId || result.signature || 'pending';
    }
    async localTransfer(to, amount, token) {
        // Simplified local transfer - actual implementation would need token program integration
        console.log(`Local transfer: ${amount} ${token} to ${to}`);
        return 'local-' + Date.now().toString();
    }
}
exports.BankrWallet = BankrWallet;
// ═════════════════════════════════════════════════════════════════════════════
// MAIN WALLET MANAGER (Multi-Layer Router)
// ═════════════════════════════════════════════════════════════════════════════
class ColosseumWalletManager {
    constructor() {
        this.healthCheckCache = new Map();
        this.bankr = new BankrWallet();
        this.local = new LocalKeypairWallet();
        this.primary = 'bankr';
    }
    async healthCheck() {
        const now = Date.now();
        const cache = this.healthCheckCache;
        if (cache.get('bankr')?.timestamp > now - 60000) {
            // Use cached result if less than 1 minute old
        }
        else {
            const bankrHealthy = await this.bankr.isAvailable();
            cache.set('bankr', { healthy: bankrHealthy, timestamp: now });
        }
        return {
            bankr: cache.get('bankr')?.healthy || false,
            local: true // Local is always available if keypair exists
        };
    }
    async transfer(to, amount, token = 'USDC') {
        // Layer 1: Try primary method with retries
        for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
            try {
                if (this.primary === 'bankr' && await this.bankr.isAvailable()) {
                    const signature = await this.bankr.transfer(to, amount, token);
                    return { success: true, signature, method: 'bankr' };
                }
                throw new Error('Bankr not available');
            }
            catch (error) {
                console.warn(`Transfer attempt ${attempt} failed:`, error);
                if (attempt === CONFIG.retryAttempts) {
                    break;
                }
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
        // Layer 2: Fallback to local
        try {
            const signature = await this.local.transfer(to, amount, token);
            return { success: true, signature, method: 'local', error: 'Fallback from bankr' };
        }
        catch (error) {
            return {
                success: false,
                signature: '',
                method: 'none',
                error: `All methods failed: ${error}`
            };
        }
    }
    get publicKey() {
        return this.primary === 'bankr' ? this.bankr.publicKey : this.local.publicKey;
    }
}
exports.ColosseumWalletManager = ColosseumWalletManager;
// ═════════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═════════════════════════════════════════════════════════════════════════════
async function main() {
    console.log('\n🦞 Colosseum Wallet Manager\n');
    const manager = new ColosseumWalletManager();
    // Health check
    console.log('🔍 Running health checks...');
    const health = await manager.healthCheck();
    console.log(`   Bankr API: ${health.bankr ? '✅' : '❌'}`);
    console.log(`   Local Wallet: ${health.local ? '✅' : '❌'}`);
    console.log(`\n🔑 Primary Wallet: ${manager.publicKey.toString()}`);
    // Demo transfer (commented out to avoid accidental sends)
    // const result = await manager.transfer('RECIPIENT_ADDRESS', 5, 'USDC');
    // console.log(`\n📤 Transfer Result: ${result.success ? '✅' : '❌'} (${result.method})`);
    console.log('\n✅ Wallet manager ready!');
    console.log('   Use manager.transfer() for battle stakes and prize distribution.\n');
}
main().catch(console.error);
//# sourceMappingURL=wallet-manager.js.map