"use strict";
/**
 * Wallet Status CLI
 * Shows health of all wallet layers
 */
Object.defineProperty(exports, "__esModule", { value: true });
const wallet_manager_1 = require("../lib/wallet-manager");
async function main() {
    console.log('\n🔍 WALLET HEALTH CHECK\n');
    const wallet = (0, wallet_manager_1.createWalletManager)();
    console.log(await wallet.status());
    console.log('\n💡 Current Mode:', wallet.mode.toUpperCase());
    console.log('═'.repeat(60) + '\n');
}
main().catch(console.error);
//# sourceMappingURL=wallet-status.js.map