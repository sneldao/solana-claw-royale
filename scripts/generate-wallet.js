import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Generate new keypair
const keypair = Keypair.generate();

// Save to file
const keypairPath = process.env.WALLET_PATH || path.join(process.env.HOME || '/home/openclaw', '.config/solana/devnet.json');

// Ensure directory exists
const dir = path.dirname(keypairPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));

// Output
console.log('✅ Wallet generated!');
console.log(`📁 Path: ${keypairPath}`);
console.log(`🔑 Public Key: ${keypair.publicKey.toString()}`);
