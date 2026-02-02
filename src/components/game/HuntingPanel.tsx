'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LOCATIONS } from '@/lib/game/locations';
import { Monster } from '@/types/game';

interface HuntingPanelProps {
  characterId: number;
  characterLevel: number;
  minDamage: number;
  maxDamage: number;
  defense: number;
  maxHp: number;
  currentHp: number;
  criticalRate: number;
  attackSpeed: number;
  lifeSteal?: number;
  reflectDamage?: number;
  expBonus?: number;
  onHpChange: (newHp: number) => void;
  onExpGain: (exp: bigint, zen: bigint) => void;
  onItemDrop: (monsterLevel: number) => void;
  onJewelDrop: (type: 'bless' | 'soul' | 'life' | 'chaos' | 'archangel' | 'bloodbone' | 'devilskey' | 'devilseye') => void;
  onDeath: () => void;
  onMonsterKill: () => void;
}

interface CombatLog {
  id: number;
  message: string;
  type: 'damage' | 'heal' | 'exp' | 'item' | 'death' | 'info';
}

interface ActiveMonster extends Monster {
  currentHp: number;
  maxHp: number;
  emoji?: string;
}

interface FloatingDamage {
  id: number;
  damage: number;
  type: 'normal' | 'critical' | 'excellent' | 'monster' | 'reflect';
  x: number;
  y: number;
}

// Simple damage calculation
function calculateDamage(min: number, max: number, isCritical: boolean, isExcellent: boolean): number {
  const base = Math.floor(Math.random() * (max - min + 1)) + min;
  if (isExcellent) return Math.floor(base * 2);
  if (isCritical) return Math.floor(base * 1.5);
  return base;
}

export default function HuntingPanel({
  characterLevel,
  minDamage,
  maxDamage,
  defense,
  maxHp,
  currentHp,
  criticalRate,
  attackSpeed,
  lifeSteal = 0,
  reflectDamage = 0,
  expBonus = 0,
  onHpChange,
  onExpGain,
  onItemDrop,
  onJewelDrop,
  onDeath,
  onMonsterKill,
}: HuntingPanelProps) {
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [isHunting, setIsHunting] = useState(false);
  const [currentMonster, setCurrentMonster] = useState<ActiveMonster | null>(null);
  const [combatLog, setCombatLog] = useState<CombatLog[]>([]);
  const [monstersKilled, setMonstersKilled] = useState(0);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [respawnCountdown, setRespawnCountdown] = useState<number | null>(null);
  const [inEvent, setInEvent] = useState(false);

  // Check if player is in event - poll localStorage
  useEffect(() => {
    const checkEventStatus = () => {
      const eventActive = localStorage.getItem('inEvent') === 'true';
      setInEvent(eventActive);
      if (eventActive && isHunting) {
        setIsHunting(false);
      }
    };

    checkEventStatus();
    const interval = setInterval(checkEventStatus, 1000);
    return () => clearInterval(interval);
  }, [isHunting]);

  const logIdRef = useRef(0);
  const damageIdRef = useRef(0);
  const combatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasHuntingBeforeDeathRef = useRef(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const location = LOCATIONS[selectedLocation];
  const isDead = currentHp <= 0;

  const addLog = useCallback((message: string, type: CombatLog['type']) => {
    logIdRef.current += 1;
    setCombatLog((prev) => [
      ...prev.slice(-49),
      { id: logIdRef.current, message, type },
    ]);
  }, []);

  const addFloatingDamage = useCallback((damage: number, type: FloatingDamage['type']) => {
    damageIdRef.current += 1;
    const x = 40 + Math.random() * 20;
    const y = 30 + Math.random() * 10;
    const newDamage: FloatingDamage = {
      id: damageIdRef.current,
      damage,
      type,
      x,
      y,
    };
    setFloatingDamages((prev) => [...prev, newDamage]);

    setTimeout(() => {
      setFloatingDamages((prev) => prev.filter((d) => d.id !== newDamage.id));
    }, 1000);
  }, []);

  const spawnMonster = useCallback(() => {
    const locationMonsters = location.monsters;

    if (!locationMonsters || locationMonsters.length === 0) {
      addLog('No monsters in this area!', 'info');
      return null;
    }

    const monster = locationMonsters[Math.floor(Math.random() * locationMonsters.length)];
    const activeMonster: ActiveMonster = {
      ...monster,
      currentHp: monster.hp,
      maxHp: monster.hp,
    };

    addLog(`${monster.name} appeared! (Lv.${monster.level})`, 'info');
    return activeMonster;
  }, [location, addLog]);

  // Respawn countdown timer
  useEffect(() => {
    if (respawnCountdown === null) return;

    if (respawnCountdown <= 0) {
      // Respawn!
      setRespawnCountdown(null);
      onHpChange(maxHp);
      addLog('Respawned with full HP!', 'heal');

      // Auto-resume hunting if was hunting before death
      if (wasHuntingBeforeDeathRef.current) {
        setTimeout(() => {
          setIsHunting(true);
          setCurrentMonster(spawnMonster());
          addLog(`Resumed hunting in ${location.name}!`, 'info');
        }, 100);
      }
      return;
    }

    const timer = setTimeout(() => {
      setRespawnCountdown(respawnCountdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [respawnCountdown, maxHp, onHpChange, addLog, spawnMonster, location.name]);

  // Handle death - start respawn countdown
  useEffect(() => {
    if (isDead && respawnCountdown === null && isHunting) {
      wasHuntingBeforeDeathRef.current = true;
      setIsHunting(false);
      setCurrentMonster(null);
      addLog('You have been defeated! Respawning in 5 seconds...', 'death');
      setRespawnCountdown(5);
      onDeath();
    }
  }, [isDead, respawnCountdown, isHunting, addLog, onDeath]);

  const performCombatRound = useCallback(() => {
    if (!currentMonster || currentHp <= 0) return;

    // Player attacks monster
    const isCritical = Math.random() * 100 < criticalRate;
    const isExcellent = Math.random() * 100 < 5;
    const playerDamage = calculateDamage(minDamage, maxDamage, isCritical, isExcellent);
    const newMonsterHp = Math.max(0, currentMonster.currentHp - playerDamage);

    // Add floating damage
    if (isExcellent) {
      addFloatingDamage(playerDamage, 'excellent');
      addLog(`Excellent! You deal ${playerDamage} damage to ${currentMonster.name}!`, 'damage');
    } else if (isCritical) {
      addFloatingDamage(playerDamage, 'critical');
      addLog(`Critical! You deal ${playerDamage} damage to ${currentMonster.name}!`, 'damage');
    } else {
      addFloatingDamage(playerDamage, 'normal');
      addLog(`You deal ${playerDamage} damage to ${currentMonster.name}.`, 'damage');
    }

    // Check if monster died
    if (newMonsterHp <= 0) {
      const expGain = Math.floor(currentMonster.exp * 1.2 * (1 + expBonus / 100)); // +20% base + equipment bonus
      const zenGain = currentMonster.zen;

      addLog(`${currentMonster.name} defeated! +${expGain} EXP, +${zenGain} Zen`, 'exp');
      setMonstersKilled((prev) => prev + 1);
      onMonsterKill();

      // Heal 5% HP on kill
      const healAmount = Math.floor(maxHp * 0.05);
      const newHp = Math.min(maxHp, currentHp + healAmount);
      if (newHp > currentHp) {
        onHpChange(newHp);
        addLog(`+${healAmount} HP recovered!`, 'heal');
      }

      // Check for item drop (7% chance)
      if (Math.random() < 0.025) {
        onItemDrop(currentMonster.level);
        addLog('An item dropped!', 'item');
      }

      // Check for jewel drops (1% each type, only from monsters level 41+)
      if (currentMonster.level >= 41) {
        if (Math.random() < 0.01) {
          onJewelDrop('bless');
          addLog('💎 Jewel of Bless dropped!', 'item');
        }
        if (Math.random() < 0.01) {
          onJewelDrop('soul');
          addLog('💎 Jewel of Soul dropped!', 'item');
        }
        if (Math.random() < 0.01) {
          onJewelDrop('life');
          addLog('💎 Jewel of Life dropped!', 'item');
        }
        // Jewel of Chaos - rare drop (0.5%)
        if (Math.random() < 0.005) {
          onJewelDrop('chaos');
          addLog('💎 Jewel of Chaos dropped!', 'item');
        }
        // Special materials - rare drops (0.5% each)
        if (Math.random() < 0.005) {
          onJewelDrop('archangel');
          addLog('📜 Scroll of Archangel dropped!', 'item');
        }
        if (Math.random() < 0.005) {
          onJewelDrop('bloodbone');
          addLog('🦴 Blood Bone dropped!', 'item');
        }
        if (Math.random() < 0.005) {
          onJewelDrop('devilskey');
          addLog('🗝️ Devil\'s Key dropped!', 'item');
        }
        if (Math.random() < 0.005) {
          onJewelDrop('devilseye');
          addLog('👁️ Devil\'s Eye dropped!', 'item');
        }
      }

      onExpGain(BigInt(expGain), BigInt(zenGain));

      // Spawn new monster
      setTimeout(() => {
        setCurrentMonster(spawnMonster());
      }, 500);
      return;
    }

    // Life steal: heal from damage dealt
    if (lifeSteal > 0) {
      const healFromSteal = Math.floor(playerDamage * lifeSteal / 100);
      if (healFromSteal > 0) {
        const newHpAfterSteal = Math.min(maxHp, currentHp + healFromSteal);
        if (newHpAfterSteal > currentHp) {
          onHpChange(newHpAfterSteal);
        }
      }
    }

    setCurrentMonster({ ...currentMonster, currentHp: newMonsterHp });

    // Monster attacks player
    const monsterDamage = Math.max(1, Math.floor(
      Math.random() * (currentMonster.maxDamage - currentMonster.minDamage + 1) + currentMonster.minDamage
    ) - Math.floor(defense / 4));

    // Show monster damage as floating red number
    addFloatingDamage(monsterDamage, 'monster');
    addLog(`${currentMonster.name} deals ${monsterDamage} damage to you.`, 'damage');

    let finalPlayerHp = currentHp - monsterDamage;

    // Reflect damage: return some damage to monster
    if (reflectDamage > 0) {
      const reflectedAmount = Math.floor(monsterDamage * reflectDamage / 100);
      if (reflectedAmount > 0) {
        const monsterHpAfterReflect = newMonsterHp - reflectedAmount;
        setCurrentMonster((prev) => prev ? { ...prev, currentHp: Math.max(0, monsterHpAfterReflect) } : null);
        addFloatingDamage(reflectedAmount, 'reflect');
        addLog(`Reflected ${reflectedAmount} damage back!`, 'damage');
      }
    }

    onHpChange(Math.max(0, finalPlayerHp));
  }, [
    currentMonster,
    currentHp,
    maxHp,
    minDamage,
    maxDamage,
    defense,
    criticalRate,
    lifeSteal,
    reflectDamage,
    addLog,
    addFloatingDamage,
    onExpGain,
    onItemDrop,
    onHpChange,
    onMonsterKill,
    spawnMonster,
  ]);

  // Auto-scroll combat log to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [combatLog]);

  // Combat loop
  useEffect(() => {
    if (isHunting && currentHp > 0) {
      const attackInterval = Math.max(500, 2000 - attackSpeed * 10);
      combatIntervalRef.current = setInterval(performCombatRound, attackInterval);
    } else {
      if (combatIntervalRef.current) {
        clearInterval(combatIntervalRef.current);
        combatIntervalRef.current = null;
      }
    }

    return () => {
      if (combatIntervalRef.current) {
        clearInterval(combatIntervalRef.current);
      }
    };
  }, [isHunting, currentHp, attackSpeed, performCombatRound]);

  const startHunting = () => {
    if (currentHp <= 0) return;
    wasHuntingBeforeDeathRef.current = true;
    setIsHunting(true);
    setCurrentMonster(spawnMonster());
    addLog(`Started hunting in ${location.name}!`, 'info');
  };

  const stopHunting = () => {
    wasHuntingBeforeDeathRef.current = false;
    setIsHunting(false);
    setCurrentMonster(null);
    addLog('Stopped hunting.', 'info');
  };

  const hpPercent = Math.max(0, (currentHp / maxHp) * 100);
  const monsterHpPercent = currentMonster
    ? (currentMonster.currentHp / currentMonster.maxHp) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Location Selector - Dropdown */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Location:</label>
        <select
          value={selectedLocation}
          onChange={(e) => !isHunting && setSelectedLocation(Number(e.target.value))}
          disabled={isHunting || isDead}
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 disabled:opacity-50"
        >
          {LOCATIONS.map((loc, index) => (
            <option
              key={loc.id}
              value={index}
              disabled={characterLevel < loc.levelRange[0]}
            >
              {loc.name} (Lv.{loc.levelRange[0]}-{loc.levelRange[1]})
              {characterLevel < loc.levelRange[0] ? ' - Locked' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Combat Area */}
      <div className="bg-gray-900 rounded-lg p-4 min-h-[200px]">
        {/* Player HP */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Your HP</span>
            <span className="text-red-400">{Math.max(0, currentHp)} / {maxHp}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-red-500 h-4 rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Monster Display with Floating Damage */}
        <div className="relative">
          {isDead ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">💀</div>
              <div className="text-red-500 font-bold text-lg">You are dead!</div>
              <div className="text-gray-400 mt-2">
                Respawning in <span className="text-yellow-400 font-bold">{respawnCountdown ?? 0}</span> seconds...
              </div>
            </div>
          ) : currentMonster ? (
            <div className="text-center py-4 relative">
              {/* Floating Damage Numbers */}
              {floatingDamages.map((fd) => (
                <div
                  key={fd.id}
                  className={`absolute text-xl font-bold pointer-events-none animate-float-up ${
                    fd.type === 'excellent' ? 'text-green-400' :
                    fd.type === 'critical' ? 'text-cyan-400' :
                    fd.type === 'monster' ? 'text-red-500' :
                    fd.type === 'reflect' ? 'text-purple-400' :
                    'text-yellow-400'
                  }`}
                  style={{
                    left: `${fd.x}%`,
                    top: `${fd.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {fd.type === 'monster' ? `-${fd.damage}` : fd.damage}
                  {fd.type === 'excellent' && <span className="text-xs ml-1">EXC!</span>}
                  {fd.type === 'critical' && <span className="text-xs ml-1">CRIT!</span>}
                  {fd.type === 'reflect' && <span className="text-xs ml-1">REFLECT!</span>}
                </div>
              ))}

              <div className="text-4xl mb-2">{currentMonster.emoji || '👹'}</div>
              <div className="text-lg font-bold">{currentMonster.name}</div>
              <div className="text-sm text-gray-400">Level {currentMonster.level}</div>
              <div className="mt-2 max-w-xs mx-auto">
                <div className="flex justify-between text-xs mb-1">
                  <span>HP</span>
                  <span>{currentMonster.currentHp} / {currentMonster.maxHp}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${monsterHpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {isHunting ? 'Spawning monster...' : 'Select a location and start hunting!'}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-2 mt-4">
          {inEvent && (
            <div className="text-orange-400 text-sm font-bold mb-2">
              ⚔️ Currently in Event - Hunting disabled
            </div>
          )}
          <div className="flex gap-2">
            {!isDead && !isHunting && (
              <button
                onClick={startHunting}
                disabled={inEvent}
                className={`px-6 py-2 rounded font-bold ${
                  inEvent
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                Start Hunting
              </button>
            )}
            {!isDead && isHunting && (
              <button
                onClick={stopHunting}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded font-bold"
              >
                Stop Hunting
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Monsters killed: {monstersKilled}
        </div>
      </div>

      {/* Combat Log */}
      <div ref={logContainerRef} className="bg-gray-900 rounded-lg p-3 h-32 overflow-y-auto">
        <div className="text-xs space-y-1">
          {combatLog.map((log) => (
            <div
              key={log.id}
              className={`${
                log.type === 'damage' ? 'text-red-400' :
                log.type === 'heal' ? 'text-green-400' :
                log.type === 'exp' ? 'text-yellow-400' :
                log.type === 'item' ? 'text-purple-400' :
                log.type === 'death' ? 'text-red-600 font-bold' :
                'text-gray-400'
              }`}
            >
              {log.message}
            </div>
          ))}
        </div>
      </div>

      {/* CSS for floating animation */}
      <style jsx>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(-40px);
          }
        }
        .animate-float-up {
          animation: float-up 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
