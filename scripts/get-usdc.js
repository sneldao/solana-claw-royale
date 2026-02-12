import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// Load wallet
const walletPath = process.env.WALLET_PATH || '/home/openclaw/.config/solana/devnet.json';
const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')));
const wallet = Keypair.fromSecretKey(secretKey);

console.log(`🔑 Wallet: ${wallet.publicKey.toString()}`);

// Devnet USDC mint
const USDC_DEVNET = new PublicKey('4zMMC9srtZ67CakbfoLiWeyN2v1bg4ftHsFCLqCf2Rx');

// Connect
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function getDevnetUSDC() {
  try {
    // Get associated token account address
    const associatedTokenAddress = await getAssociatedTokenAddress(
      USDC_DEVNET,
      wallet.publicKey
    );
    
    console.log(`💳 Associated Token Account: ${associatedTokenAddress.toString()}`);
    
    // Check balance
    try {
      const balance = await connection.getTokenAccountBalance(associatedTokenAddress);
      console.log(`💰 Current USDC Balance: ${balance.value.uiAmountString}`);
    } catch (e) {
      console.log(`💰 Current USDC Balance: 0 (no token account yet)`);
    }
    
    console.log('\n📋 To get devnet USDC:');
    console.log(`1. Send USDC to: ${associatedTokenAddress.toString()}`);
    console.log('2. Or use: https://spl.solana.com/token');
    console.log('3. Or use: curl -X POST https://api.devnet.solana.com -H Content-Type: application/json -d {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"requestAirdrop\",\"params\":[\"' + associatedTokenAddress.toString() + '\",\"100000000\"]}');
    
    return {
      associatedTokenAddress: associatedTokenAddress.toString(),
      usdcMint: USDC_DEVNET.toString()
    };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { error: error.message };
  }
}

getDevnetUSDC();
