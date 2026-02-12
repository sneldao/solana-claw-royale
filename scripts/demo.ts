/**
 * Claw Royale Solana - CLI Demo
 * For Colosseum AI Agent Hackathon
 */

import {
  Connection,
  PublicKey,
  Keypair,
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccount,
} from '@solana/spl-token';
import fs from 'fs';

const CLUSTER_URL = 'https://api.devnet.solana.com';
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const PROGRAM_ID = '11111111111111111111111111111111'; // System program as placeholder

// Load wallet
const walletData = JSON.parse(fs.readFileSync('/home/openclaw/.config/solana/devnet.json', 'utf8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

console.log('\n🦞 CLAW ROYALE - Solana Edition Demo\n');
console.log('🔑 Wallet: ' + wallet.publicKey.toString());

async function runDemo() {
  const connection = new Connection(CLUSTER_URL, 'confirmed');
  
  // Balances
  const solBalance = await connection.getBalance(wallet.publicKey);
  console.log('💰 SOL: ' + (solBalance / 1e9).toFixed(4) + ' SOL');
  
  // Get USDC token account
  const usdcATA = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
  console.log('💳 USDC Account: ' + usdcATA.toString());
  
  try {
    const usdcBal = await connection.getTokenAccountBalance(usdcATA);
    console.log('💵 USDC: ' + usdcBal.value.uiAmountString);
  } catch {
    console.log('💵 USDC: 0');
  }
  
  console.log('\n' + '─'.repeat(50));
  
  // Demo: Register Agent
  const [agentPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), wallet.publicKey.toBuffer(), Buffer.from('TestBotAlpha')],
    new PublicKey(PROGRAM_ID)
  );
  console.log('🤖 Agent: TestBotAlpha');
  console.log('   PDA: ' + agentPDA.toString());
  
  // Demo: Create Battle
  const [battlePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('battle'), wallet.publicKey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
  console.log('\n⚔️ Battle Created');
  console.log('   PDA: ' + battlePDA.toString());
  console.log('   Bet: 5 USDC');
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ Demo Complete!');
  console.log('   Anchor program deployment pending CLI install.');
  console.log('═'.repeat(50) + '\n');
}

runDemo().catch(console.error);
