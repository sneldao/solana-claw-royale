import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Load wallet
const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME || '/home/openclaw', '.config/solana/devnet.json');
const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')));
const wallet = Keypair.fromSecretKey(secretKey);

console.log(`🔑 Wallet: ${wallet.publicKey.toString()}`);

// Connect to devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function airdrop() {
  try {
    console.log('💸 Requesting airdrop...');
    const signature = await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
    console.log(`📤 Transaction: ${signature}`);
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature);
    console.log('✅ Airdrop confirmed!');
    
    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    console.error('❌ Airdrop failed:', error.message);
  }
}

airdrop();
