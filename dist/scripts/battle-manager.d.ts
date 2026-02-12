/**
 * Colosseum Battle Manager - Simplified Demo Version
 *
 * Demonstrates multi-layer wallet architecture with Bankr + local fallback.
 */
export declare class BattleWallet {
    private publicKey;
    constructor();
    get address(): string;
    healthCheck(): Promise<{
        bankr: boolean;
        local: boolean;
    }>;
    transfer(to: string, amount: number, token: string): Promise<{
        success: boolean;
        method: string;
    }>;
}
export declare class BattleManager {
    private wallet;
    private agents;
    private battles;
    constructor();
    status(): Promise<void>;
    register(name: string): Promise<void>;
    createBattle(creatorName: string, bet: number): Promise<void>;
    join(battleId: string, joinerName: string): Promise<void>;
    resolve(battleId: string, winnerName: string): Promise<void>;
    leaderboard(): void;
}
//# sourceMappingURL=battle-manager.d.ts.map