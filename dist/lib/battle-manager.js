"use strict";
/**
 * Battle Manager - Agent Battle Operations
 *
 * Handles agent registration, battle creation, and prize distribution
 * with full redundant wallet support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleManager = void 0;
exports.createBattleManager = createBattleManager;
const wallet_manager_1 = require("./wallet-manager");
// ═════════════════════════════════════════════════════════════════════════════
// BATTLE MANAGER
// ═════════════════════════════════════════════════════════════════════════════
class BattleManager {
    constructor(wallet) {
        this.agents = new Map();
        this.battles = new Map();
        this.platformFeePercent = 0.5; // 0.5% fee
        this.wallet = wallet || (0, wallet_manager_1.createWalletManager)();
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // WALLET OPERATIONS
    // ═════════════════════════════════════════════════════════════════════════
    async getWalletStatus() {
        return this.wallet.status();
    }
    async getWalletAddress() {
        return this.wallet.address;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // AGENT MANAGEMENT
    // ═════════════════════════════════════════════════════════════════════════
    async registerAgent(name) {
        const agent = {
            name,
            address: await this.wallet.address,
            wins: 0,
            losses: 0,
            earnings: 0,
            avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${name}`
        };
        this.agents.set(name, agent);
        console.log(`🤖 Agent registered: ${name}`);
        return agent;
    }
    getAgent(name) {
        return this.agents.get(name);
    }
    listAgents() {
        return Array.from(this.agents.values());
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // BATTLE OPERATIONS
    // ═════════════════════════════════════════════════════════════════════════
    async createBattle(creatorName, betAmount, opponentName) {
        const creator = this.agents.get(creatorName);
        if (!creator)
            throw new Error(`Agent ${creatorName} not found`);
        const battleId = `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const battle = {
            id: battleId,
            creator: creatorName,
            participants: [creatorName],
            bet: betAmount,
            pool: betAmount * 2,
            status: 'open',
            createdAt: Date.now(),
        };
        // Place bet from creator's wallet
        const betResult = await this.wallet.placeBet(battleId, betAmount);
        if (!betResult.success) {
            throw new Error(`Failed to place bet: ${betResult.error}`);
        }
        this.battles.set(battleId, battle);
        console.log(`⚔️ Battle created: ${battleId} (${betAmount} USDC)`);
        return { battle, betResult };
    }
    async joinBattle(battleId, joinerName) {
        const battle = this.battles.get(battleId);
        if (!battle)
            throw new Error(`Battle ${battleId} not found`);
        if (battle.status !== 'open')
            throw new Error('Battle is not open');
        if (battle.participants.includes(joinerName))
            throw new Error('Already in battle');
        const joiner = this.agents.get(joinerName);
        if (!joiner)
            throw new Error(`Agent ${joinerName} not found`);
        // Place bet
        const betResult = await this.wallet.placeBet(battleId, battle.bet);
        if (!betResult.success) {
            throw new Error(`Failed to place bet: ${betResult.error}`);
        }
        battle.participants.push(joinerName);
        battle.status = 'active';
        console.log(`👤 ${joinerName} joined battle ${battleId}`);
        return { battle, betResult };
    }
    async resolveBattle(battleId, winnerName) {
        const battle = this.battles.get(battleId);
        if (!battle)
            throw new Error(`Battle ${battleId} not found`);
        if (battle.status !== 'active')
            throw new Error('Battle is not active');
        const winner = this.agents.get(winnerName);
        if (!winner)
            throw new Error(`Agent ${winnerName} not found`);
        if (!battle.participants.includes(winnerName)) {
            throw new Error(`${winnerName} is not in this battle`);
        }
        // Calculate prizes
        const platformFee = battle.pool * (this.platformFeePercent / 100);
        const prizeAmount = battle.pool - platformFee;
        // Claim prize for winner
        const prizeResult = await this.wallet.claimPrize(battleId, winner.address, prizeAmount);
        // Record platform fee (would go to treasury)
        const feeResult = {
            success: true,
            signature: `fee-${Date.now()}`,
            method: 'local',
            retries: 0,
            timestamp: Date.now(),
        };
        // Update battle
        battle.status = 'complete';
        battle.winner = winnerName;
        // Update agent stats
        winner.wins++;
        winner.earnings += prizeAmount;
        const loserName = battle.participants.find(p => p !== winnerName);
        if (loserName) {
            const loser = this.agents.get(loserName);
            if (loser)
                loser.losses++;
        }
        console.log(`🏆 Battle resolved: ${winnerName} wins ${prizeAmount} USDC`);
        return {
            battleId,
            winner: winnerName,
            prize: prizeAmount,
            transactions: {
                betPlaced: { success: true, method: 'local', retries: 0, timestamp: Date.now() }, // Already done
                prizeClaimed: prizeResult,
                platformFee: feeResult,
            },
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH OPERATIONS
    // ═════════════════════════════════════════════════════════════════════════
    async distributeTournamentRewards(placements) {
        const results = [];
        for (const placement of placements) {
            const agent = this.agents.get(placement.name);
            if (!agent) {
                console.warn(`⚠️ Agent ${placement.name} not found, skipping`);
                continue;
            }
            const result = await this.wallet.transfer(agent.address, placement.reward, 'USDC');
            results.push(result);
            console.log(`   ${placement.name}: ${result.success ? '✅' : '❌'} ${placement.reward} USDC`);
        }
        const successCount = results.filter(r => r.success).length;
        console.log(`🎁 Tournament rewards: ${successCount}/${results.length} successful`);
        return results;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // QUERY METHODS
    // ═════════════════════════════════════════════════════════════════════════
    getBattle(battleId) {
        return this.battles.get(battleId);
    }
    listBattles(status) {
        const battles = Array.from(this.battles.values());
        if (status) {
            return battles.filter(b => b.status === status);
        }
        return battles;
    }
    getLeaderboard() {
        return Array.from(this.agents.values())
            .sort((a, b) => b.wins - a.wins || b.earnings - a.earnings);
    }
}
exports.BattleManager = BattleManager;
// ═════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═════════════════════════════════════════════════════════════════════════════
function createBattleManager(wallet) {
    return new BattleManager(wallet);
}
//# sourceMappingURL=battle-manager.js.map