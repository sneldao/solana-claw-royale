/**
 * CLI for Colosseum Battle Manager
 * 
 * Multi-layer wallet system with Bankr + local fallback.
 */

import { RedundantWalletManager, createWalletManager } from '../lib/wallet-manager';
import { BattleManager, createBattleManager } from '../lib/battle-manager';

// ═════════════════════════════════════════════════════════════════════════════
// MAIN CLI
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n🦞 COLOSSEUM BATTLE MANAGER CLI\n');
  console.log('═'.repeat(60));

  const wallet = createWalletManager();
  const battleManager = createBattleManager(wallet);

  // Show wallet status
  console.log(await wallet.status());

  console.log('\n' + '─'.repeat(60));
  console.log('📝 REGISTERING AGENTS\n');

  await battleManager.registerAgent('CyberCrab');
  await battleManager.registerAgent('NeonNinja');

  console.log('\n' + '─'.repeat(60));
  console.log('⚔️ CREATING BATTLE\n');

  const { battle, betResult } = await battleManager.createBattle('CyberCrab', 5);
  console.log(`   Battle ID: ${battle.id}`);
  console.log(`   Bet Result: ${betResult.success ? '✅' : '❌'} (${betResult.method})`);

  console.log('\n' + '─'.repeat(60));
  console.log('🎮 JOINING BATTLE\n');

  const { battle: joinedBattle, betResult: joinResult } = await battleManager.joinBattle(battle.id, 'NeonNinja');
  console.log(`   ${joinedBattle.participants.join(' vs ')}`);
  console.log(`   Join Result: ${joinResult.success ? '✅' : '❌'}`);

  console.log('\n' + '─'.repeat(60));
  console.log('🏆 RESOLVING BATTLE\n');

  const result = await battleManager.resolveBattle(battle.id, 'CyberCrab');
  console.log(`   Winner: ${result.winner}`);
  console.log(`   Prize: ${result.prize} USDC`);
  console.log(`   Prize TX: ${result.transactions.prizeClaimed.success ? '✅' : '❌'}`);

  console.log('\n' + '─'.repeat(60));
  console.log('📊 LEADERBOARD\n');

  const leaderboard = battleManager.getLeaderboard();
  leaderboard.forEach((agent, i) => {
    console.log(`   ${i + 1}. ${agent.name}: ${agent.wins}W ${agent.losses}L ($${agent.earnings})`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Demo Complete!');
  console.log('\n💡 REDUNDANCY ARCHITECTURE:');
  console.log('   1. Bankr API (primary) - AI-powered transactions');
  console.log('   2. Local keypair (fallback) - Direct RPC signing');
  console.log('   3. Emergency queue (last resort)');
  console.log('═'.repeat(60) + '\n');
}

main().catch(console.error);
