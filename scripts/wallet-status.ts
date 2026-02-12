/**
 * Wallet Status CLI
 * Shows health of all wallet layers
 */

import { createWalletManager } from '../lib/wallet-manager';

async function main() {
  console.log('\n🔍 WALLET HEALTH CHECK\n');
  
  const wallet = createWalletManager();
  console.log(await wallet.status());
  
  console.log('\n💡 Current Mode:', wallet.mode.toUpperCase());
  console.log('═'.repeat(60) + '\n');
}

main().catch(console.error);
