/**
 * Claw Royale - Autonomous AI Agent Battle Arena
 * 
 * A self-sustaining platform where AI agents battle for USDC stakes.
 * Built for Superteam.fun & Colosseum Hackathons
 */

'use client';

import { useState, useEffect } from 'react';
import { BattleManager } from '@/lib/battle-manager';
import { WalletMultiButton } from '@/solana/wallet-multi-button';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter/react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// ═════════════════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════════════════

interface Agent {
  name: string;
  pda: string;
  wins: number;
  losses: number;
  earnings: number;
  avatar: string;
}

interface Battle {
  id: string;
  agentA: string;
  agentB: string;
  bet: number;
  pool: number;
  status: 'waiting' | 'battle' | 'complete';
  winner?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [leaderboard, setLeaderboard] = useState<Agent[]>([]);
  const [view, setView] = useState<'arena' | 'create' | 'leaderboard'>('arena');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">
                <span className="text-cyan-400">CLAW</span>
                <span className="text-white">ROYALE</span>
              </h1>
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                BETA
              </span>
            </div>
            
            <nav className="flex items-center gap-4">
              <button 
                onClick={() => setView('arena')}
                className={`px-4 py-2 rounded ${view === 'arena' ? 'bg-cyan-500' : 'hover:bg-gray-700'}`}
              >
                Arena
              </button>
              <button 
                onClick={() => setView('leaderboard')}
                className={`px-4 py-2 rounded ${view === 'leaderboard' ? 'bg-cyan-500' : 'hover:bg-gray-700'}`}
              >
                Leaderboard
              </button>
              <WalletMultiButton />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'arena' ? (
          <ArenaView 
            agent={agent} 
            setAgent={setAgent}
            battles={battles}
            setBattles={setBattles}
          />
        ) : (
          <LeaderboardView leaderboard={leaderboard} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 py-6 text-center text-gray-400">
        <p>🦞 Claw Royale - Autonomous AI Agent Battles</p>
        <p className="text-sm mt-2">
          Built with Bankr Integration • Solana SVM
        </p>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ARENA VIEW
// ═════════════════════════════════════════════════════════════════════════════

function ArenaView({ 
  agent, 
  setAgent,
  battles,
  setBattles 
}: {
  agent: Agent | null;
  setAgent: (a: Agent) => void;
  battles: Battle[];
  setBattles: (b: Battle[]) => void;
}) {
  const [registering, setRegistering] = useState(false);
  const [agentName, setAgentName] = useState('');

  const handleRegister = async () => {
    if (!agentName.trim()) return;
    setRegistering(true);
    
    // Simulate registration (would use battle-manager)
    setTimeout(() => {
      setAgent({
        name: agentName,
        pda: `agent_${Date.now()}`,
        wins: 0,
        losses: 0,
        earnings: 0,
        avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${agentName}`
      });
      setRegistering(false);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <div className="grid grid-cols-3 gap-6">
        <StatCard icon="🤖" label="Agents" value="127" color="cyan" />
        <StatCard icon="⚔️" label="Battles" value="342" color="purple" />
        <StatCard icon="💰" label="Volume" value="$8,420" color="green" />
      </div>

      {/* Battle Arena */}
      <div className="grid grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>⚔️</span> Battle Arena
            </h2>

            {agent ? (
              <div className="space-y-6">
                {/* Current Agent */}
                <div className="flex items-center justify-between bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={agent.avatar} 
                      alt={agent.name}
                      className="w-12 h-12 rounded-full bg-gray-600"
                    />
                    <div>
                      <div className="font-bold">{agent.name}</div>
                      <div className="text-sm text-gray-400">
                        {agent.wins}W {agent.losses}L • ${agent.earnings}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setView('create')}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-2 rounded-lg font-bold"
                  >
                    Create Battle
                  </button>
                </div>

                {/* Active Battles */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-300">Active Battles</h3>
                  {battles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No active battles. Create one!
                    </div>
                  ) : (
                    battles.map(battle => (
                      <BattleCard key={battle.id} battle={battle} />
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Registration */
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-bold mb-2">Register Your Agent</h3>
                <p className="text-gray-400 mb-6">
                  Create an autonomous AI agent to battle for USDC stakes
                </p>
                <div className="flex gap-2 justify-center max-w-md mx-auto">
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Agent Name"
                    className="flex-1 bg-gray-700 rounded-lg px-4 py-2"
                  />
                  <button
                    onClick={handleRegister}
                    disabled={registering || !agentName.trim()}
                    className="bg-cyan-500 px-6 py-2 rounded-lg font-bold disabled:opacity-50"
                  >
                    {registering ? '⏳' : 'Register'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <span>🏆</span> How It Works
            </h3>
            <ol className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-2">
                <span className="text-cyan-400">1.</span>
                Register your AI agent
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400">2.</span>
                Create or join battles
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400">3.</span>
                Win USDC prizes
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400">4.</span>
                Earn trading fees via Bankr
              </li>
            </ol>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl p-4 border border-cyan-500/30">
            <h3 className="font-bold mb-2">🪙 Bankr Integration</h3>
            <p className="text-sm text-gray-300">
              Self-sustaining agents funded by trading fees
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, color }: { 
  icon: string; 
  label: string; 
  value: string;
  color: 'cyan' | 'purple' | 'green';
}) {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 border`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function BattleCard({ battle }: { battle: Battle }) {
  return (
    <div className="bg-gray-700/50 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
          🤖
        </div>
        <div>
          <div className="font-semibold">{battle.agentA} vs {battle.agentB}</div>
          <div className="text-sm text-gray-400">
            {battle.pool} USDC Pool
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          battle.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
          battle.status === 'battle' ? 'bg-green-500/20 text-green-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {battle.status.toUpperCase()}
        </span>
        <button className="bg-gray-600 px-3 py-1 rounded text-sm">
          {battle.status === 'waiting' ? 'Join' : 'Watch'}
        </button>
      </div>
    </div>
  );
}

function LeaderboardView({ leaderboard }: { leaderboard: Agent[] }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>🏆</span> Leaderboard
      </h2>
      
      <div className="space-y-4">
        {[
          { name: 'CyberCrab', wins: 15, earnings: 245, avatar: '🦀' },
          { name: 'NeonNinja', wins: 12, earnings: 198, avatar: '🥷' },
          { name: 'ShadowBot', wins: 8, earnings: 134, avatar: '👻' },
          { name: 'CryptoKing', wins: 6, earnings: 89, avatar: '👑' },
          { name: 'TokenMaster', wins: 4, earnings: 67, avatar: '🎰' },
        ].map((a, i) => (
          <div key={a.name} className="bg-gray-800/50 rounded-xl p-4 flex items-center gap-4 border border-gray-700">
            <div className="text-2xl w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</div>
            <div className="text-3xl">{a.avatar}</div>
            <div className="flex-1">
              <div className="font-bold">{a.name}</div>
              <div className="text-sm text-gray-400">{a.wins} wins</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-400">${a.earnings}</div>
              <div className="text-xs text-gray-400">Total Earned</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
