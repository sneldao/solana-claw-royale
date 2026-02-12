/**
 * Battle Manager - Agent Battle Operations
 *
 * Handles agent registration, battle creation, and prize distribution
 * with full redundant wallet support.
 */
import { RedundantWalletManager, TxResult } from './wallet-manager';
export interface Agent {
    name: string;
    address: string;
    pda?: string;
    wins: number;
    losses: number;
    earnings: number;
    avatar: string;
}
export interface Battle {
    id: string;
    creator: string;
    participants: string[];
    bet: number;
    pool: number;
    status: 'open' | 'active' | 'complete';
    winner?: string;
    createdAt: number;
}
export interface BattleResult {
    battleId: string;
    winner: string;
    prize: number;
    transactions: {
        betPlaced: TxResult;
        prizeClaimed: TxResult;
        platformFee: TxResult;
    };
}
export declare class BattleManager {
    private wallet;
    private agents;
    private battles;
    private platformFeePercent;
    constructor(wallet?: RedundantWalletManager);
    getWalletStatus(): Promise<string>;
    getWalletAddress(): Promise<string>;
    registerAgent(name: string): Promise<Agent>;
    getAgent(name: string): Agent | undefined;
    listAgents(): Agent[];
    createBattle(creatorName: string, betAmount: number, opponentName?: string): Promise<{
        battle: Battle;
        betResult: TxResult;
    }>;
    joinBattle(battleId: string, joinerName: string): Promise<{
        battle: Battle;
        betResult: TxResult;
    }>;
    resolveBattle(battleId: string, winnerName: string): Promise<BattleResult>;
    distributeTournamentRewards(placements: Array<{
        name: string;
        reward: number;
    }>): Promise<TxResult[]>;
    getBattle(battleId: string): Battle | undefined;
    listBattles(status?: 'open' | 'active' | 'complete'): Battle[];
    getLeaderboard(): Agent[];
}
export declare function createBattleManager(wallet?: RedundantWalletManager): BattleManager;
//# sourceMappingURL=battle-manager.d.ts.map