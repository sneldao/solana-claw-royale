import { Connection, Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Load wallet
const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME || '/home/openclaw', '.config/solana/devnet.json');
const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')));
const wallet = Keypair.fromSecretKey(secretKey);

console.log(`🔑 Wallet: ${wallet.publicKey.toString()}`);

// Try multiple RPC endpoints
const rpcEndpoints = [
  'https://api.devnet.solana.com',
  'https://solana-devnet.rpc.fastnode.com',
  'https://devnet.genesysgo.net',
];

async function checkBalance() {
  for (const rpc of rpcEndpoints) {
    try {
      console.log(`\n🔗 Trying: ${rpc}`);
      const connection = new Connection(rpc, 'confirmed');
      const balance = await connection.getBalance(wallet.publicKey);
      console.log(`💰 Balance: ${balance / 1e9} SOL`);
      
      // Try airdrop on this endpoint
      console.log('💸 Attempting airdrop...');
      const signature = await connection.requestAirdrop(wallet.publicKey, 2e9);
      const confirmation = await connection.confirmTransaction(signature);
      console.log('✅ Airdrop successful!');
      
      const newBalance = await connection.getBalance(wallet.publicKey);
      console.log(`💰 New Balance: ${newBalance / 1e9} SOL`);
      return;
    } catch (error) {
      console.log(`❌ Failed: ${error.message.split('\n')[0]}`);
    }
  }
  console.log('\n⚠️ All RPC endpoints failed. You may need to:');
  console.log('1. Use local Solana CLI: solana airdrop 2');
  console.log('2. Use a different RPC provider');
  console.log('3. Check your network connection');
}

checkBalance();
