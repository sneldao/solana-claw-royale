/**
 * Tournament Bracket System
 * 
 * Structured tournament management for Claw Royale battles.
 * Supports single elimination, double elimination, and battle royale formats.
 */

'use client';

import { useState } from 'react';

// ═════════════════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════════════════

type TournamentType = 'single-elimination' | 'double-elimination' | 'battle-royale';
type TournamentStatus = 'registration' | 'in-progress' | 'completed';

interface Participant {
  id: string;
  name: string;
  seed: number;
  wins: number;
  losses: number;
  eliminated: boolean;
}

interface Match {
  id: string;
  round: number;
  position: number;
  participantA?: string;
  participantB?: string;
  winner?: string;
  scoreA: number;
  scoreB: number;
  status: 'pending' | 'ready' | 'in-progress' | 'completed';
}

interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  status: TournamentStatus;
  participants: Participant[];
  matches: Match[];
  prizePool: number;
  entryFee: number;
  maxParticipants: number;
  currentRound: number;
  champion?: Participant;
}

// ═════════════════════════════════════════════════════════════════════════════
// TOURNAMENT MANAGER
// ═════════════════════════════════════════════════════════════════════════════

export function useTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null);

  const createTournament = (
    name: string,
    type: TournamentType,
    maxParticipants: number,
    entryFee: number
  ): Tournament => {
    const newTournament: Tournament = {
      id: `tournament_${Date.now()}`,
      name,
      type,
      status: 'registration',
      participants: [],
      matches: [],
      prizePool: 0,
      entryFee,
      maxParticipants,
      currentRound: 1
    };
    
    setTournament(newTournament);
    return newTournament;
  };

  const registerParticipant = (name: string): Participant => {
    if (!tournament) throw new Error('No tournament active');
    if (tournament.participants.length >= tournament.maxParticipants) {
      throw new Error('Tournament is full');
    }

    const participant: Participant = {
      id: `p_${Date.now()}`,
      name,
      seed: tournament.participants.length + 1,
      wins: 0,
      losses: 0,
      eliminated: false
    };

    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: [...prev.participants, participant]
      };
    });

    return participant;
  };

  const startTournament = (): void => {
    if (!tournament) return;
    if (tournament.participants.length < 2) {
      throw new Error('Need at least 2 participants');
    }

    const rounds = Math.ceil(Math.log2(tournament.participants.length));
    const matches: Match[] = [];

    // Create bracket matches
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let pos = 1; pos <= matchesInRound; pos++) {
        matches.push({
          id: `match_r${round}_p${pos}`,
          round,
          position: pos,
          scoreA: 0,
          scoreB: 0,
          status: round === 1 ? 'ready' : 'pending'
        });
      }
    }

    // Seed participants into first round
    const seeded = [...tournament.participants].sort((a, b) => a.seed - b.seed);
    
    // Simple seeding: 1 vs last, 2 vs second-to-last, etc.
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (match.round === 1) {
        const aIdx = i;
        const bIdx = matches.length - 1 - i;
        match.participantA = seeded[aIdx]?.id;
        match.participantB = seeded[bIdx]?.id;
      }
    }

    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        status: 'in-progress',
        matches
      };
    });
  };

  const resolveMatch = (matchId: string, winnerId: string): void => {
    if (!tournament) return;

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) return;

    // Update match
    const updatedMatches = tournament.matches.map(m => {
      if (m.id !== matchId) return m;
      return {
        ...m,
        winner: winnerId,
        status: 'completed' as const
      };
    });

    // Advance winner to next round
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const nextMatch = updatedMatches.find(
      m => m.round === nextRound && m.position === nextPosition
    );

    if (nextMatch && nextRound <= Math.ceil(Math.log2(tournament.participants.length))) {
      const winnerMatchIdx = updatedMatches.findIndex(m => m.id === nextMatch.id);
      if (match.position % 2 === 1) {
        updatedMatches[winnerMatchIdx].participantA = winnerId;
      } else {
        updatedMatches[winnerMatchIdx].participantB = winnerId;
      }
      updatedMatches[winnerMatchIdx].status = 'ready';
    }

    // Update participant stats
    const updatedParticipants = tournament.participants.map(p => {
      if (p.id === winnerId) {
        return { ...p, wins: p.wins + 1 };
      }
      if ((match.participantA && p.id === match.participantA) || 
          (match.participantB && p.id === match.participantB)) {
        return { ...p, losses: p.losses + 1, eliminated: true };
      }
      return p;
    });

    // Check for champion (finals winner)
    let champion: Participant | undefined;
    const finalMatch = updatedMatches.find(
      m => m.round === Math.ceil(Math.log2(tournament.participants.length))
    );
    
    if (finalMatch?.status === 'completed') {
      const championId = finalMatch.winner;
      champion = updatedParticipants.find(p => p.id === championId);
      
      setTournament(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'completed',
          champion,
          prizePool: prev.participants.length * prev.entryFee
        };
      });
    } else {
      setTournament(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          matches: updatedMatches,
          participants: updatedParticipants,
          currentRound: match.round + 1
        };
      });
    }
  };

  return {
    tournament,
    createTournament,
    registerParticipant,
    startTournament,
    resolveMatch
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// TOURNAMENT BRACKET VISUALIZATION
// ═════════════════════════════════════════════════════════════════════════════

export function TournamentBracket({ tournament }: { tournament: Tournament }) {
  const rounds = tournament.type === 'battle-royale' 
    ? 1 
    : Math.ceil(Math.log2(tournament.participants.length));

  const getRoundMatches = (round: number): Match[] => {
    return tournament.matches
      .filter(m => m.round === round)
      .sort((a, b) => a.position - b.position);
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max p-4">
        {Array.from({ length: rounds }, (_, i) => (
          <div key={i} className="flex flex-col justify-around">
            <h4 className="text-center text-sm font-bold mb-4">
              {tournament.type === 'battle-royale' 
                ? 'Free for All' 
                : i === rounds - 1 
                  ? 'Finals' 
                  : `Round ${i + 1}`}
            </h4>
            
            <div className="space-y-4">
              {getRoundMatches(i + 1).map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match}
                  participants={tournament.participants}
                  onResolve={(winner) => resolveMatch(match.id, winner)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ 
  match, 
  participants,
  onResolve 
}: { 
  match: Match;
  participants: Participant[];
  onResolve: (winner: string) => void;
}) {
  const getParticipant = (id?: string): Participant | undefined => 
    participants.find(p => p.id === id);

  const participantA = getParticipant(match.participantA);
  const participantB = getParticipant(match.participantB);

  return (
    <div className={`
      w-48 bg-gray-800 rounded-lg border overflow-hidden
      ${match.status === 'completed' ? 'border-green-500/50' : 
        match.status === 'in-progress' ? 'border-yellow-500/50' : 
        match.status === 'ready' ? 'border-cyan-500/50' : 
        'border-gray-700'}
    `}>
      {/* Participant A */}
      <div className={`p-2 ${match.winner === participantA?.id ? 'bg-green-500/20' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm truncate">
            {participantA?.name || 'TBD'}
            {participantA?.eliminated && ' (out)'}
          </span>
          <span className="font-mono">{match.scoreA}</span>
        </div>
      </div>

      {/* Participant B */}
      <div className={`p-2 border-t border-gray-700 ${match.winner === participantB?.id ? 'bg-green-500/20' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm truncate">
            {participantB?.name || 'TBD'}
            {participantB?.eliminated && ' (out)'}
          </span>
          <span className="font-mono">{match.scoreB}</span>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOURNAMENT CARD (for listing)
// ═════════════════════════════════════════════════════════════════════════════

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const statusColors = {
    registration: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'in-progress': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{tournament.name}</h3>
          <p className="text-sm text-gray-400 capitalize">
            {tournament.type.replace('-', ' ')}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-bold border ${statusColors[tournament.status]}`}>
          {tournament.status.replace('-', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center text-sm mb-3">
        <div>
          <div className="text-2xl font-bold">{tournament.participants.length}</div>
          <div className="text-gray-400">Players</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{tournament.prizePool}</div>
          <div className="text-gray-400">USDC Prize</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{tournament.maxParticipants}</div>
          <div className="text-gray-400">Max</div>
        </div>
      </div>

      <button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 py-2 rounded-lg font-bold">
        {tournament.status === 'registration' ? 'Join Tournament' : 'View Bracket'}
      </button>
    </div>
  );
}
