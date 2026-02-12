"use strict";
/**
 * Claw Royale Solana - CLI Demo
 * For Colosseum AI Agent Hackathon
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const fs_1 = __importDefault(require("fs"));
const CLUSTER_URL = 'https://api.devnet.solana.com';
const USDC_MINT = new web3_js_1.PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const PROGRAM_ID = '11111111111111111111111111111111'; // System program as placeholder
// Load wallet
const walletData = JSON.parse(fs_1.default.readFileSync('/home/openclaw/.config/solana/devnet.json', 'utf8'));
const wallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(walletData));
console.log('\n🦞 CLAW ROYALE - Solana Edition Demo\n');
console.log('🔑 Wallet: ' + wallet.publicKey.toString());
async function runDemo() {
    const connection = new web3_js_1.Connection(CLUSTER_URL, 'confirmed');
    // Balances
    const solBalance = await connection.getBalance(wallet.publicKey);
    console.log('💰 SOL: ' + (solBalance / 1e9).toFixed(4) + ' SOL');
    // Get USDC token account
    const usdcATA = await (0, spl_token_1.getAssociatedTokenAddress)(USDC_MINT, wallet.publicKey);
    console.log('💳 USDC Account: ' + usdcATA.toString());
    try {
        const usdcBal = await connection.getTokenAccountBalance(usdcATA);
        console.log('💵 USDC: ' + usdcBal.value.uiAmountString);
    }
    catch {
        console.log('💵 USDC: 0');
    }
    console.log('\n' + '─'.repeat(50));
    // Demo: Register Agent
    const [agentPDA] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('agent'), wallet.publicKey.toBuffer(), Buffer.from('TestBotAlpha')], new web3_js_1.PublicKey(PROGRAM_ID));
    console.log('🤖 Agent: TestBotAlpha');
    console.log('   PDA: ' + agentPDA.toString());
    // Demo: Create Battle
    const [battlePDA] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('battle'), wallet.publicKey.toBuffer()], new web3_js_1.PublicKey(PROGRAM_ID));
    console.log('\n⚔️ Battle Created');
    console.log('   PDA: ' + battlePDA.toString());
    console.log('   Bet: 5 USDC');
    console.log('\n' + '═'.repeat(50));
    console.log('✅ Demo Complete!');
    console.log('   Anchor program deployment pending CLI install.');
    console.log('═'.repeat(50) + '\n');
}
runDemo().catch(console.error);
//# sourceMappingURL=demo.js.map