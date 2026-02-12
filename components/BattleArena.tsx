/**
 * Battle Animation Engine
 * 
 * Epic 3D-style battle animations for Claw Royale arena.
 * Real-time combat visualization with particle effects.
 */

'use client';

import { useState, useEffect, useRef } from 'react';

// ═════════════════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════════════════

interface Combatant {
  id: string;
  name: string;
  avatar: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  color: string;
}

interface BattleState {
  combatantA: Combatant;
  combatantB: Combatant;
  turn: number;
  log: BattleLogEntry[];
  status: 'waiting' | 'attacking' | 'damaged' | 'complete';
  winner?: string;
}

interface BattleLogEntry {
  turn: number;
  attacker: string;
  defender: string;
  damage: number;
  type: 'attack' | 'critical' | 'miss' | 'heal';
}

// ═════════════════════════════════════════════════════════════════════════════
// BATTLE ENGINE
// ═════════════════════════════════════════════════════════════════════════════

export function useBattleEngine(
  agentA: Combatant,
  agentB: Combatant,
  onBattleComplete: (winner: Combatant) => void
) {
  const [state, setState] = useState<BattleState>({
    combatantA: { ...agentA, hp: agentA.maxHp },
    combatantB: { ...agentB, hp: agentB.maxHp },
    turn: 1,
    log: [],
    status: 'waiting'
  });

  const [animating, setAnimating] = useState(false);

  const executeTurn = async () => {
    if (animating || state.status === 'complete') return;
    
    setAnimating(true);
    const attacker = state.turn % 2 === 1 ? state.combatantA : state.combatantB;
    const defender = state.turn % 2 === 1 ? state.combatantB : state.combatantA;

    // Calculate damage
    const baseDamage = attacker.attack * (0.8 + Math.random() * 0.4);
    const actualDamage = Math.max(1, Math.floor(baseDamage * (100 / (100 + defender.defense))));
    
    // Critical hit (20% chance)
    const isCritical = Math.random() < 0.2;
    const finalDamage = isCritical ? Math.floor(actualDamage * 1.5) : actualDamage;

    // Apply damage
    const logEntry: BattleLogEntry = {
      turn: state.turn,
      attacker: attacker.name,
      defender: defender.name,
      damage: finalDamage,
      type: isCritical ? 'critical' : 'attack'
    };

    // Update state
    if (state.turn % 2 === 1) {
      setState(prev => ({
        ...prev,
        combatantB: { ...prev.combatantB, hp: Math.max(0, prev.combatantB.hp - finalDamage) },
        log: [...prev.log, logEntry],
        status: 'damaged'
      }));
    } else {
      setState(prev => ({
        ...prev,
        combatantA: { ...prev.combatantA, hp: Math.max(0, prev.combatantA.hp - finalDamage) },
        log: [...prev.log, logEntry],
        status: 'damaged'
      }));
    }

    // Check for winner
    await delay(500);
    
    const defenderHp = state.turn % 2 === 1 
      ? state.combatantB.hp - finalDamage 
      : state.combatantA.hp - finalDamage;

    if (defenderHp <= 0) {
      setState(prev => ({
        ...prev,
        status: 'complete',
        winner: attacker.name
      }));
      onBattleComplete(attacker);
    } else {
      setState(prev => ({
        ...prev,
        turn: prev.turn + 1,
        status: 'waiting'
      }));
    }

    setAnimating(false);
  };

  const resetBattle = () => {
    setState({
      combatantA: { ...agentA, hp: agentA.maxHp },
      combatantB: { ...agentB, hp: agentB.maxHp },
      turn: 1,
      log: [],
      status: 'waiting'
    });
  };

  return { state, executeTurn, resetBattle, animating };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═════════════════════════════════════════════════════════════════════════════
// BATTLE ARENA COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export function BattleArena({ 
  agentA, 
  agentB,
  onComplete 
}: { 
  agentA: Combatant; 
  agentB: Combatant;
  onComplete: (winner: Combatant) => void;
}) {
  const { state, executeTurn, resetBattle, animating } = useBattleEngine(agentA, agentB, onComplete);
  const [showLog, setShowLog] = useState(false);

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>⚔️</span> Battle Arena
        </h2>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            state.status === 'complete' ? 'bg-yellow-500/20 text-yellow-400' :
            state.status === 'attacking' ? 'bg-red-500/20 text-red-400' :
            state.status === 'damaged' ? 'bg-orange-500/20 text-orange-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {state.status === 'waiting' ? 'READY' :
             state.status === 'attacking' ? 'ATTACK!' :
             state.status === 'damaged' ? 'DAMAGE!' :
             'COMPLETE'}
          </span>
        </div>
      </div>

      {/* Combatants */}
      <div className="flex justify-between items-center mb-8">
        <CombatantCard 
          combatant={state.combatantA} 
          isAttacking={state.turn % 2 === 1 && animating}
          isDamaged={state.status === 'damaged' && state.turn % 2 === 1}
        />
        
        <div className="text-center">
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            VS
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Turn {state.turn}
          </div>
        </div>

        <CombatantCard 
          combatant={state.combatantB}
          isAttacking={state.turn % 2 === 0 && animating}
          isDamaged={state.status === 'damaged' && state.turn % 2 === 0}
        />
      </div>

      {/* Health Bars */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <HealthBar 
          current={state.combatantA.hp} 
          max={state.combatantA.maxHp}
          color="cyan"
        />
        <HealthBar 
          current={state.combatantB.hp} 
          max={state.combatantB.maxHp}
          color="purple"
        />
      </div>

      {/* Battle Log Toggle */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={executeTurn}
          disabled={animating || state.status === 'complete'}
          className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
            animating || state.status === 'complete'
              ? 'bg-gray-600 opacity-50 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 animate-pulse'
          }`}
        >
          {animating ? '⏳' : state.status === 'complete' ? '🏆 Complete' : '⚔️ ATTACK!'}
        </button>
        
        <button
          onClick={() => setShowLog(!showLog)}
          className="px-4 py-3 rounded-xl font-bold bg-gray-700 hover:bg-gray-600"
        >
          {showLog ? '📜 Hide Log' : '📜 Show Log'}
        </button>

        {state.status === 'complete' && (
          <button
            onClick={resetBattle}
            className="px-4 py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-600"
          >
            🔄 Rematch
          </button>
        )}
      </div>

      {/* Battle Log */}
      {showLog && (
        <div className="bg-gray-800/50 rounded-xl p-4 max-h-48 overflow-y-auto">
          <h3 className="font-bold mb-2">Battle Log</h3>
          <div className="space-y-2">
            {state.log.slice().reverse().map((entry, i) => (
              <div 
                key={i}
                className={`text-sm flex items-center gap-2 ${
                  entry.type === 'critical' ? 'text-yellow-400' :
                  entry.type === 'miss' ? 'text-gray-400' :
                  'text-gray-300'
                }`}
              >
                <span className="text-gray-500">T{entry.turn}</span>
                <span>{entry.attacker}</span>
                <span>{entry.type === 'critical' ? '💥' : entry.type === 'miss' ? '💨' : '⚔️'}</span>
                <span>{entry.defender}</span>
                <span className="font-bold">{entry.damage} DMG</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function CombatantCard({ 
  combatant, 
  isAttacking, 
  isDamaged 
}: { 
  combatant: Combatant; 
  isAttacking: boolean;
  isDamaged: boolean;
}) {
  return (
    <div className={`text-center transition-all duration-300 ${
      isAttacking ? 'scale-110 translate-x-4' : ''
    } ${isDamaged ? 'animate-shake' : ''}`}>
      <div className="relative inline-block">
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-50"
          style={{ backgroundColor: combatant.color }}
        />
        
        {/* Avatar */}
        <div 
          className={`relative w-24 h-24 rounded-full flex items-center justify-center text-4xl ${
            isAttacking ? 'animate-pulse' : ''
          }`}
          style={{ 
            background: `linear-gradient(135deg, ${combatant.color}40, ${combatant.color}20)`,
            border: `2px solid ${combatant.color}`
          }}
        >
          {combatant.avatar}
        </div>

        {/* Health bar */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${(combatant.hp / combatant.maxHp) * 100}%`,
              backgroundColor: combatant.hp > combatant.maxHp * 0.5 ? '#22c55e' :
                               combatant.hp > combatant.maxHp * 0.25 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="font-bold">{combatant.name}</div>
        <div className="text-sm text-gray-400">
          {combatant.hp}/{combatant.maxHp} HP
        </div>
      </div>
    </div>
  );
}

function HealthBar({ current, max, color }: { 
  current: number; 
  max: number;
  color: 'cyan' | 'purple' | 'green';
}) {
  const percentage = (current / max) * 100;
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>HP</span>
        <span>{current}/{max}</span>
      </div>
      <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            color === 'cyan' ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' :
            color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-400' :
            'bg-gradient-to-r from-green-500 to-green-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PARTICLE EFFECTS
// ═════════════════════════════════════════════════════════════════════════════

export function ParticleExplosion({ x, y, color }: { x: number; y: number; color: string }) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10 - 5,
      life: 1
    }));
    setParticles(newParticles);

    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.5,
          life: p.life - 0.05
        })).filter(p => p.life > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [x, y]);

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: p.x,
            top: p.y,
            backgroundColor: color,
            opacity: p.life,
            transform: `scale(${p.life})`
          }}
        />
      ))}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ANIMATIONS (CSS-in-JS for Tailwind compatibility)
// ═════════════════════════════════════════════════════════════════════════════

const shakeAnimation = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.animate-shake {
  animation: shake 0.3s ease-in-out;
}
`;

export { shakeAnimation };
