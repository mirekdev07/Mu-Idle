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
  onHpChange: (newHp: number) => void;
  onExpGain: (exp: bigint, zen: bigint) => void;
  onItemDrop: () => void;
  onDeath: () => void;
}

interface CombatLog {
  id: number;
  message: string;
  type: 'damage' | 'heal' | 'exp' | 'item' | 'death' | 'info';
}

interface ActiveMonster extends Monster {
  currentHp: number;
  maxHp: number;
}

// Simple damage calculation
function calculateDamage(min: number, max: number, isCritical: boolean): number {
  const base = Math.floor(Math.random() * (max - min + 1)) + min;
  return isCritical ? Math.floor(base * 1.5) : base;
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
  onHpChange,
  onExpGain,
  onItemDrop,
  onDeath,
}: HuntingPanelProps) {
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [isHunting, setIsHunting] = useState(false);
  const [currentMonster, setCurrentMonster] = useState<ActiveMonster | null>(null);
  const [combatLog, setCombatLog] = useState<CombatLog[]>([]);
  const [monstersKilled, setMonstersKilled] = useState(0);
  const logIdRef = useRef(0);
  const combatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const location = LOCATIONS[selectedLocation];

  const addLog = useCallback((message: string, type: CombatLog['type']) => {
    logIdRef.current += 1;
    setCombatLog((prev) => [
      { id: logIdRef.current, message, type },
      ...prev.slice(0, 49),
    ]);
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

  const performCombatRound = useCallback(() => {
    if (!currentMonster || currentHp <= 0) return;

    // Player attacks monster
    const isCritical = Math.random() * 100 < criticalRate;
    const playerDamage = calculateDamage(minDamage, maxDamage, isCritical);
    const newMonsterHp = Math.max(0, currentMonster.currentHp - playerDamage);

    if (isCritical) {
      addLog(`Critical! You deal ${playerDamage} damage to ${currentMonster.name}!`, 'damage');
    } else {
      addLog(`You deal ${playerDamage} damage to ${currentMonster.name}.`, 'damage');
    }

    // Check if monster died
    if (newMonsterHp <= 0) {
      const expGain = currentMonster.exp;
      const zenGain = currentMonster.zen;

      addLog(`${currentMonster.name} defeated! +${expGain} EXP, +${zenGain} Zen`, 'exp');
      setMonstersKilled((prev) => prev + 1);

      // Check for item drop (10% chance)
      if (Math.random() < 0.1) {
        onItemDrop();
        addLog('An item dropped!', 'item');
      }

      onExpGain(BigInt(expGain), BigInt(zenGain));

      // Spawn new monster
      setTimeout(() => {
        setCurrentMonster(spawnMonster());
      }, 500);
      return;
    }

    setCurrentMonster({ ...currentMonster, currentHp: newMonsterHp });

    // Monster attacks player
    const monsterDamage = Math.max(1, Math.floor(
      Math.random() * (currentMonster.maxDamage - currentMonster.minDamage + 1) + currentMonster.minDamage
    ) - Math.floor(defense / 4));
    const newPlayerHp = currentHp - monsterDamage;

    addLog(`${currentMonster.name} deals ${monsterDamage} damage to you.`, 'damage');

    if (newPlayerHp <= 0) {
      onHpChange(0);
      addLog('You have been defeated!', 'death');
      setIsHunting(false);
      onDeath();
    } else {
      onHpChange(newPlayerHp);
    }
  }, [
    currentMonster,
    currentHp,
    minDamage,
    maxDamage,
    defense,
    criticalRate,
    addLog,
    onExpGain,
    onItemDrop,
    onHpChange,
    onDeath,
    spawnMonster,
  ]);

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
    if (currentHp <= 0) {
      addLog('You need to heal first!', 'info');
      return;
    }
    setIsHunting(true);
    setCurrentMonster(spawnMonster());
    addLog(`Started hunting in ${location.name}!`, 'info');
  };

  const stopHunting = () => {
    setIsHunting(false);
    setCurrentMonster(null);
    addLog('Stopped hunting.', 'info');
  };

  const healCharacter = () => {
    onHpChange(maxHp);
    addLog(`Healed to full HP (${maxHp})!`, 'heal');
  };

  const hpPercent = Math.max(0, (currentHp / maxHp) * 100);
  const monsterHpPercent = currentMonster
    ? (currentMonster.currentHp / currentMonster.maxHp) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Location Selector */}
      <div className="flex gap-2 flex-wrap">
        {LOCATIONS.map((loc, index) => (
          <button
            key={loc.id}
            onClick={() => !isHunting && setSelectedLocation(index)}
            disabled={isHunting || characterLevel < loc.levelRange[0]}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              selectedLocation === index
                ? 'bg-yellow-500 text-gray-900'
                : characterLevel < loc.levelRange[0]
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {loc.name} (Lv.{loc.levelRange[0]}-{loc.levelRange[1]})
          </button>
        ))}
      </div>

      {/* Combat Area */}
      <div className="bg-gray-900 rounded-lg p-4 min-h-[200px]">
        {/* Player HP */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Your HP</span>
            <span className="text-red-400">{currentHp} / {maxHp}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className="bg-red-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Monster Display */}
        {currentMonster ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">👹</div>
            <div className="text-lg font-bold">{currentMonster.name}</div>
            <div className="text-sm text-gray-400">Level {currentMonster.level}</div>
            <div className="mt-2 max-w-xs mx-auto">
              <div className="flex justify-between text-xs mb-1">
                <span>HP</span>
                <span>{currentMonster.currentHp} / {currentMonster.maxHp}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
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

        {/* Controls */}
        <div className="flex gap-2 justify-center mt-4">
          {!isHunting ? (
            <button
              onClick={startHunting}
              disabled={currentHp <= 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Hunting
            </button>
          ) : (
            <button
              onClick={stopHunting}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded font-bold"
            >
              Stop Hunting
            </button>
          )}
          <button
            onClick={healCharacter}
            disabled={currentHp >= maxHp}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Heal
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Monsters killed: {monstersKilled}
        </div>
      </div>

      {/* Combat Log */}
      <div className="bg-gray-900 rounded-lg p-3 h-32 overflow-y-auto">
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
    </div>
  );
}
