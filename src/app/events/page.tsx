'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MONSTERS } from '@/lib/game/monsters';
import { calculateExp, calculateZen } from '@/lib/game/formulas';

interface Materials {
  chaos: number;
  archangel: number;
  bloodbone: number;
  devilskey: number;
  devilseye: number;
}

interface Tickets {
  bloodCastle: number;
  devilSquare: number;
}

interface Entries {
  bloodCastle: number;
  devilSquare: number;
}

interface CharacterData {
  id: number;
  name: string;
  level: number;
  experience: string;
  zen: string;
  damage: number;
  defense: number;
  vitality: number;
  monstersKilled: number;
}

interface Stats {
  minDamage: number;
  maxDamage: number;
  physicalDefense: number;
  attackSpeed: number;
  maxHp: number;
  criticalRate: number;
}

interface EquipmentBonuses {
  damage_min: number;
  damage_max: number;
  defense: number;
  attack_speed: number;
  critical_rate: number;
  life_steal: number;
  exp_bonus: number;
}

interface Monster {
  name: string;
  level: number;
  hp: number;
  minDamage: number;
  maxDamage: number;
  defense: number;
  exp: number;
  zen: number;
  emoji?: string;
}

interface ActiveMonster extends Monster {
  currentHp: number;
  maxHp: number;
}

type EventType = 'blood_castle' | 'devil_square';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_LEVELS: Record<Difficulty, { min: number; max: number; label: string; color: string }> = {
  easy: { min: 31, max: 50, label: 'Easy', color: 'green' },
  medium: { min: 51, max: 80, label: 'Medium', color: 'yellow' },
  hard: { min: 81, max: 180, label: 'Hard', color: 'red' },
};

const EVENT_DURATION = 5 * 60 * 1000; // 5 minutes in ms
const MAX_DAILY_ENTRIES = 2;
const EXP_MULTIPLIER = 1.2; // +20% EXP

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bonuses, setBonuses] = useState<EquipmentBonuses | null>(null);
  const [materials, setMaterials] = useState<Materials>({
    chaos: 0, archangel: 0, bloodbone: 0, devilskey: 0, devilseye: 0,
  });
  const [tickets, setTickets] = useState<Tickets>({ bloodCastle: 0, devilSquare: 0 });
  const [entries, setEntries] = useState<Entries>({ bloodCastle: 0, devilSquare: 0 });

  // Event state
  const [activeEvent, setActiveEvent] = useState<EventType | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [eventStartTime, setEventStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentMonster, setCurrentMonster] = useState<ActiveMonster | null>(null);
  const [currentHp, setCurrentHp] = useState(0);
  const [eventExp, setEventExp] = useState(0);
  const [eventZen, setEventZen] = useState(0);
  const [monstersKilled, setMonstersKilled] = useState(0);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    exp: number;
    zen: number;
    monstersKilled: number;
    eventType: EventType;
  } | null>(null);
  const [floatingDamages, setFloatingDamages] = useState<Array<{
    id: number;
    damage: number;
    type: 'player' | 'monster' | 'critical';
    x: number;
    y: number;
  }>>([]);

  const damageIdRef = useRef(0);

  const addFloatingDamage = useCallback((damage: number, type: 'player' | 'monster' | 'critical') => {
    damageIdRef.current += 1;
    const x = 30 + Math.random() * 40;
    const y = 20 + Math.random() * 20;
    const newDamage = { id: damageIdRef.current, damage, type, x, y };
    setFloatingDamages(prev => [...prev, newDamage]);
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== newDamage.id));
    }, 1000);
  }, []);

  const combatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync event state to localStorage so main game knows we're in event
  useEffect(() => {
    if (activeEvent) {
      localStorage.setItem('inEvent', 'true');
    } else {
      localStorage.removeItem('inEvent');
    }
    return () => {
      localStorage.removeItem('inEvent');
    };
  }, [activeEvent]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      const response = await fetch('/api/game/data');
      const data = await response.json();

      if (data.success) {
        setCharacter({
          id: data.character.id,
          name: data.character.name,
          level: data.character.level,
          experience: data.character.experience,
          zen: data.character.zen,
          damage: data.character.damage,
          defense: data.character.defense,
          vitality: data.character.vitality,
          monstersKilled: data.character.monstersKilled || 0,
        });
        setStats(data.stats);
        setBonuses(data.bonuses || {
          damage_min: 0, damage_max: 0, defense: 0, attack_speed: 0,
          critical_rate: 0, life_steal: 0, exp_bonus: 0,
        });
        setCurrentHp(data.character.currentHp ?? data.stats.maxHp);
        setMaterials({
          chaos: data.character.jewelOfChaos || 0,
          archangel: data.character.scrollOfArchangel || 0,
          bloodbone: data.character.bloodBone || 0,
          devilskey: data.character.devilsKey || 0,
          devilseye: data.character.devilsEye || 0,
        });
        setTickets({
          bloodCastle: data.character.bloodCastleTicket || 0,
          devilSquare: data.character.devilSquareTicket || 0,
        });
        setEntries({
          bloodCastle: data.character.bloodCastleEntriesToday || 0,
          devilSquare: data.character.devilSquareEntriesToday || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (message: string) => {
    setCombatLog(prev => [message, ...prev.slice(0, 49)]);
  };

  const spawnMonster = useCallback((diff: Difficulty): ActiveMonster => {
    const { min, max } = DIFFICULTY_LEVELS[diff];
    const eligibleMonsters = MONSTERS.filter(m => m.level >= min && m.level <= max);
    const monster = eligibleMonsters[Math.floor(Math.random() * eligibleMonsters.length)] || MONSTERS[0];

    // Event monsters are stronger - multipliers based on difficulty
    const multipliers = {
      easy: { hp: 2, damage: 1.5, defense: 1.5 },
      medium: { hp: 3, damage: 2, defense: 2 },
      hard: { hp: 5, damage: 3, defense: 2.5 },
    };
    const mult = multipliers[diff];

    const boostedHp = Math.floor(monster.hp * mult.hp);
    const boostedMinDamage = Math.floor(monster.minDamage * mult.damage);
    const boostedMaxDamage = Math.floor(monster.maxDamage * mult.damage);
    const boostedDefense = Math.floor(monster.defense * mult.defense);

    return {
      ...monster,
      hp: boostedHp,
      minDamage: boostedMinDamage,
      maxDamage: boostedMaxDamage,
      defense: boostedDefense,
      currentHp: boostedHp,
      maxHp: boostedHp,
    };
  }, []);

  const startEvent = async (eventType: EventType, diff: Difficulty) => {
    if (!character) return;

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: character.id,
          event_type: eventType,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        alert(data.message || 'Failed to start event');
        return;
      }

      setTickets(data.tickets);
      setEntries(data.entries);
      setActiveEvent(eventType);
      setDifficulty(diff);
      setEventStartTime(Date.now());
      setTimeRemaining(EVENT_DURATION);
      setEventExp(0);
      setEventZen(0);
      setMonstersKilled(0);
      setCombatLog([]);
      setCurrentMonster(spawnMonster(diff));
      setCurrentHp(stats?.maxHp || 100);

      addLog(`Entered ${eventType === 'blood_castle' ? 'Blood Castle' : 'Devil Square'} (${DIFFICULTY_LEVELS[diff].label})!`);
    } catch (err) {
      console.error('Failed to start event:', err);
    }
  };

  const endEvent = useCallback(async () => {
    if (combatIntervalRef.current) {
      clearInterval(combatIntervalRef.current);
      combatIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Save progress - ADD monsters killed to current value (not overwrite)
    if (character && (eventExp > 0 || monstersKilled > 0)) {
      const totalMonstersKilled = character.monstersKilled + monstersKilled;
      try {
        await fetch('/api/game/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character_id: character.id,
            experience: (BigInt(character.experience) + BigInt(eventExp)).toString(),
            zen: (BigInt(character.zen) + BigInt(eventZen)).toString(),
            level: character.level,
            monsters_killed: totalMonstersKilled,
          }),
        });
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
    }

    addLog(`Event ended! Earned ${eventExp.toLocaleString()} EXP and ${eventZen.toLocaleString()} Zen!`);

    // Show summary modal
    setSummaryData({
      exp: eventExp,
      zen: eventZen,
      monstersKilled: monstersKilled,
      eventType: activeEvent!,
    });
    setShowSummaryModal(true);

    setDifficulty(null);
    setEventStartTime(null);
    setCurrentMonster(null);
  }, [character, eventExp, eventZen, monstersKilled, activeEvent]);

  const closeSummaryModal = useCallback(() => {
    setShowSummaryModal(false);
    setSummaryData(null);
    setActiveEvent(null);
    // Reload data to get updated character state
    loadData();
  }, []);

  // Timer effect
  useEffect(() => {
    if (!activeEvent || !eventStartTime) return;

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - eventStartTime;
      const remaining = Math.max(0, EVENT_DURATION - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        endEvent();
      }
    }, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeEvent, eventStartTime, endEvent]);

  // Combat effect
  useEffect(() => {
    if (!activeEvent || !currentMonster || !stats || !bonuses || !difficulty) return;

    const totalMinDamage = stats.minDamage + (bonuses.damage_min || 0);
    const totalMaxDamage = stats.maxDamage + (bonuses.damage_max || 0);
    const totalDefense = stats.physicalDefense + (bonuses.defense || 0);
    const critRate = stats.criticalRate + (bonuses.critical_rate || 0);
    const lifeSteal = bonuses.life_steal || 0;
    const attackSpeed = stats.attackSpeed + (bonuses.attack_speed || 0);
    const attackInterval = Math.max(500, 2000 - attackSpeed * 10); // Same as normal hunting

    combatIntervalRef.current = setInterval(() => {
      setCurrentMonster(prev => {
        if (!prev) return null;

        // Player attacks monster
        const isCrit = Math.random() * 100 < critRate;
        let playerDamage = Math.floor(Math.random() * (totalMaxDamage - totalMinDamage + 1)) + totalMinDamage;
        playerDamage = Math.max(1, playerDamage - Math.floor(prev.defense * 0.3));
        if (isCrit) playerDamage = Math.floor(playerDamage * 1.5);

        // Show floating damage
        addFloatingDamage(playerDamage, isCrit ? 'critical' : 'player');

        const newMonsterHp = prev.currentHp - playerDamage;

        // Life steal
        if (lifeSteal > 0) {
          const healAmount = Math.floor(playerDamage * lifeSteal / 100);
          setCurrentHp(hp => Math.min(stats.maxHp, hp + healAmount));
        }

        // Monster defeated
        if (newMonsterHp <= 0) {
          const expGain = Math.floor(calculateExp(prev.exp, bonuses.exp_bonus || 0) * EXP_MULTIPLIER);
          const zenGain = calculateZen(prev.zen, 0);

          setEventExp(e => e + expGain);
          setEventZen(z => z + zenGain);
          setMonstersKilled(k => k + 1);
          addLog(`Killed ${prev.name}! +${expGain} EXP (x1.2)`);

          // Spawn new monster
          return spawnMonster(difficulty);
        }

        // Monster attacks player
        const monsterBaseDamage = Math.floor(Math.random() * (prev.maxDamage - prev.minDamage + 1)) + prev.minDamage;
        const monsterDamage = Math.max(1, monsterBaseDamage - Math.floor(totalDefense * 0.5));
        addFloatingDamage(monsterDamage, 'monster');
        setCurrentHp(hp => {
          const newHp = hp - monsterDamage;
          if (newHp <= 0) {
            // Player died - respawn with full HP
            addLog('You died! Respawning...');
            return stats.maxHp;
          }
          return newHp;
        });

        return { ...prev, currentHp: newMonsterHp };
      });
    }, attackInterval);

    return () => {
      if (combatIntervalRef.current) {
        clearInterval(combatIntervalRef.current);
      }
    };
  }, [activeEvent, currentMonster, stats, bonuses, difficulty, character, spawnMonster, addFloatingDamage]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const progressPercent = ((EVENT_DURATION - timeRemaining) / EVENT_DURATION) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-yellow-400 hover:text-yellow-300">
              MU Idle
            </Link>
            <span className="text-gray-500">|</span>
            <h1 className="text-xl font-semibold text-orange-400">Events</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
              Game
            </Link>
            <Link href="/chaos-machine" className="px-3 py-1 bg-purple-700 rounded hover:bg-purple-600 text-sm">
              Chaos Machine
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {/* Active Event */}
        {activeEvent && difficulty && stats && (
          <div className="bg-gray-800/50 rounded-lg p-6 border border-orange-500/50">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-orange-400">
                {activeEvent === 'blood_castle' ? '🏰 Blood Castle' : '👿 Devil Square'}
              </h2>
              <p className="text-sm text-gray-400">
                Difficulty: <span className={`text-${DIFFICULTY_LEVELS[difficulty].color}-400 font-bold`}>
                  {DIFFICULTY_LEVELS[difficulty].label}
                </span>
              </p>
            </div>

            {/* Time Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Time Remaining</span>
                <span className="text-yellow-400 font-bold">{formatTime(timeRemaining)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 h-4 rounded-full transition-all duration-100"
                  style={{ width: `${100 - progressPercent}%` }}
                />
              </div>
            </div>

            {/* Combat Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
              <div className="bg-gray-900/50 rounded p-3">
                <div className="text-2xl text-purple-400 font-bold">{eventExp.toLocaleString()}</div>
                <div className="text-xs text-gray-500">EXP Earned (x1.2)</div>
              </div>
              <div className="bg-gray-900/50 rounded p-3">
                <div className="text-2xl text-green-400 font-bold">{eventZen.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Zen Earned</div>
              </div>
              <div className="bg-gray-900/50 rounded p-3">
                <div className="text-2xl text-orange-400 font-bold">{monstersKilled}</div>
                <div className="text-xs text-gray-500">Monsters Killed</div>
              </div>
            </div>

            {/* Player HP */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Your HP</span>
                <span className="text-red-400">{currentHp} / {stats.maxHp}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-red-500 h-3 rounded-full transition-[width] duration-300"
                  style={{ width: `${(currentHp / stats.maxHp) * 100}%` }}
                />
              </div>
            </div>

            {/* Monster */}
            {currentMonster && (
              <div className="bg-gray-900/50 rounded-lg p-4 text-center mb-4 relative overflow-visible">
                {/* Floating Damage Numbers */}
                {floatingDamages.map(fd => (
                  <div
                    key={fd.id}
                    className={`absolute pointer-events-none font-bold text-lg animate-bounce ${
                      fd.type === 'critical' ? 'text-yellow-400 text-xl' :
                      fd.type === 'player' ? 'text-white' : 'text-red-500'
                    }`}
                    style={{
                      left: `${fd.x}%`,
                      top: `${fd.y}%`,
                      animation: 'floatUp 1s ease-out forwards',
                    }}
                  >
                    {fd.type === 'monster' ? `-${fd.damage}` : fd.damage}
                    {fd.type === 'critical' && '!'}
                  </div>
                ))}

                <div className="text-4xl mb-2">{currentMonster.emoji || '👹'}</div>
                <div className="font-bold">{currentMonster.name}</div>
                <div className="text-sm text-gray-400">Level {currentMonster.level}</div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>HP</span>
                    <span>{currentMonster.currentHp.toLocaleString()} / {currentMonster.maxHp.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-[width] duration-300"
                      style={{ width: `${(currentMonster.currentHp / currentMonster.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Combat Log */}
            <div className="bg-gray-900/50 rounded p-3 h-32 overflow-y-auto text-xs">
              {combatLog.map((log, i) => (
                <div key={i} className="text-gray-400">{log}</div>
              ))}
            </div>

            {/* Leave Button */}
            <button
              onClick={() => setShowLeaveModal(true)}
              className="w-full mt-4 py-3 bg-red-700 hover:bg-red-600 rounded-lg font-bold"
            >
              Leave Event
            </button>

            {/* Leave Confirmation Modal */}
            {showLeaveModal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4 border border-gray-600">
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">Leave Event?</h3>
                  <p className="text-gray-300 mb-6">
                    Are you sure you want to leave? Your progress will be saved but the event will end.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLeaveModal(false)}
                      className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold"
                    >
                      Stay
                    </button>
                    <button
                      onClick={() => {
                        setShowLeaveModal(false);
                        endEvent();
                      }}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold"
                    >
                      Leave
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Event Summary Modal */}
        {showSummaryModal && summaryData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-6 max-w-md mx-4 border border-yellow-500/50 shadow-lg shadow-yellow-500/20">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">
                  {summaryData.eventType === 'blood_castle' ? '🏰' : '👿'}
                </div>
                <h3 className="text-2xl font-bold text-yellow-400">Event Complete!</h3>
                <p className="text-gray-400 text-sm">
                  {summaryData.eventType === 'blood_castle' ? 'Blood Castle' : 'Devil Square'} finished
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between border border-purple-500/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <span className="text-gray-300">Experience Earned</span>
                  </div>
                  <span className="text-xl font-bold text-purple-400">+{summaryData.exp.toLocaleString()}</span>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between border border-green-500/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <span className="text-gray-300">Zen Earned</span>
                  </div>
                  <span className="text-xl font-bold text-green-400">+{summaryData.zen.toLocaleString()}</span>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between border border-orange-500/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💀</span>
                    <span className="text-gray-300">Monsters Killed</span>
                  </div>
                  <span className="text-xl font-bold text-orange-400">{summaryData.monstersKilled}</span>
                </div>
              </div>

              <button
                onClick={closeSummaryModal}
                className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-lg font-bold text-white transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {!activeEvent && !showSummaryModal && (
          <>
            {/* Materials & Tickets */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4">Your Resources</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                <div className="bg-gray-900/50 rounded p-2 text-center">
                  <div className="text-xl">📜</div>
                  <div className="text-blue-400 font-bold text-sm">{materials.archangel}</div>
                  <div className="text-[10px] text-gray-500">Archangel</div>
                </div>
                <div className="bg-gray-900/50 rounded p-2 text-center">
                  <div className="text-xl">🦴</div>
                  <div className="text-red-400 font-bold text-sm">{materials.bloodbone}</div>
                  <div className="text-[10px] text-gray-500">Blood Bone</div>
                </div>
                <div className="bg-gray-900/50 rounded p-2 text-center">
                  <div className="text-xl">🗝️</div>
                  <div className="text-orange-400 font-bold text-sm">{materials.devilskey}</div>
                  <div className="text-[10px] text-gray-500">Devil's Key</div>
                </div>
                <div className="bg-gray-900/50 rounded p-2 text-center">
                  <div className="text-xl">👁️</div>
                  <div className="text-purple-400 font-bold text-sm">{materials.devilseye}</div>
                  <div className="text-[10px] text-gray-500">Devil's Eye</div>
                </div>
                <div className="bg-gray-900/50 rounded p-2 text-center">
                  <div className="text-xl">💎</div>
                  <div className="text-yellow-400 font-bold text-sm">{materials.chaos}</div>
                  <div className="text-[10px] text-gray-500">Chaos</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-900/30 rounded p-3 text-center border border-red-800">
                  <div className="text-2xl">🎫</div>
                  <div className="text-xl text-red-400 font-bold">{tickets.bloodCastle}</div>
                  <div className="text-xs text-gray-400">Blood Castle Tickets</div>
                </div>
                <div className="bg-purple-900/30 rounded p-3 text-center border border-purple-800">
                  <div className="text-2xl">🎟️</div>
                  <div className="text-xl text-purple-400 font-bold">{tickets.devilSquare}</div>
                  <div className="text-xs text-gray-400">Devil Square Tickets</div>
                </div>
              </div>
            </div>

            {/* Events */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Blood Castle */}
              <div className="bg-gray-800/50 rounded-lg p-6 border border-red-900/50">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">🏰</div>
                  <h3 className="text-2xl font-bold text-red-400">Blood Castle</h3>
                  <p className="text-xs text-gray-500 mt-1">Duration: 5 minutes | EXP: +20%</p>
                </div>

                <div className="text-center mb-4">
                  <span className="text-sm text-gray-400">Daily Entries: </span>
                  <span className={entries.bloodCastle >= MAX_DAILY_ENTRIES ? 'text-red-400' : 'text-green-400'}>
                    {entries.bloodCastle}/{MAX_DAILY_ENTRIES}
                  </span>
                </div>

                <div className="space-y-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => {
                    const canEnter = tickets.bloodCastle > 0 && entries.bloodCastle < MAX_DAILY_ENTRIES;
                    const { label, color, min, max } = DIFFICULTY_LEVELS[diff];
                    return (
                      <button
                        key={diff}
                        onClick={() => startEvent('blood_castle', diff)}
                        disabled={!canEnter}
                        className={`w-full py-3 rounded-lg font-bold transition-colors ${
                          canEnter
                            ? `bg-${color}-600 hover:bg-${color}-500 text-white`
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                        style={{
                          backgroundColor: canEnter
                            ? (color === 'green' ? '#16a34a' : color === 'yellow' ? '#ca8a04' : '#dc2626')
                            : undefined
                        }}
                      >
                        {label} (Lv. {min}-{max})
                      </button>
                    );
                  })}
                </div>

                {tickets.bloodCastle === 0 && (
                  <p className="text-center text-xs text-red-400 mt-3">
                    No tickets! Create them in Chaos Machine
                  </p>
                )}
              </div>

              {/* Devil Square */}
              <div className="bg-gray-800/50 rounded-lg p-6 border border-purple-900/50">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">👿</div>
                  <h3 className="text-2xl font-bold text-purple-400">Devil Square</h3>
                  <p className="text-xs text-gray-500 mt-1">Duration: 5 minutes | EXP: +20%</p>
                </div>

                <div className="text-center mb-4">
                  <span className="text-sm text-gray-400">Daily Entries: </span>
                  <span className={entries.devilSquare >= MAX_DAILY_ENTRIES ? 'text-red-400' : 'text-green-400'}>
                    {entries.devilSquare}/{MAX_DAILY_ENTRIES}
                  </span>
                </div>

                <div className="space-y-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => {
                    const canEnter = tickets.devilSquare > 0 && entries.devilSquare < MAX_DAILY_ENTRIES;
                    const { label, color, min, max } = DIFFICULTY_LEVELS[diff];
                    return (
                      <button
                        key={diff}
                        onClick={() => startEvent('devil_square', diff)}
                        disabled={!canEnter}
                        className={`w-full py-3 rounded-lg font-bold transition-colors ${
                          canEnter
                            ? `bg-${color}-600 hover:bg-${color}-500 text-white`
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                        style={{
                          backgroundColor: canEnter
                            ? (color === 'green' ? '#16a34a' : color === 'yellow' ? '#ca8a04' : '#dc2626')
                            : undefined
                        }}
                      >
                        {label} (Lv. {min}-{max})
                      </button>
                    );
                  })}
                </div>

                {tickets.devilSquare === 0 && (
                  <p className="text-center text-xs text-purple-400 mt-3">
                    No tickets! Create them in Chaos Machine
                  </p>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Create tickets in the <Link href="/chaos-machine" className="text-purple-400 hover:underline">Chaos Machine</Link></p>
              <p className="mt-1">Daily entries reset at midnight</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
