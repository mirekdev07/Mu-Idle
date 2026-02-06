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
  zenBonus?: number;
  resetCount?: number;
  burstCooldownEnd?: string | null;
  excellentChance?: number;  // % chance for excellent hit (2x damage)
  poisonChance?: number;     // % chance for poison (10% of monster current HP)
  onHpChange: (newHp: number) => void;
  onExpGain: (exp: bigint, zen: bigint) => void;
  onItemDrop: (monsterLevel: number) => void;
  onJewelDrop: (type: 'bless' | 'soul' | 'life' | 'chaos' | 'archangel' | 'bloodbone' | 'devilskey' | 'devilseye' | 'feather') => void;
  onDeath: () => void;
  onMonsterKill: () => void;
}

interface ActiveMonster extends Monster {
  currentHp: number;
  maxHp: number;
  emoji?: string;
}

interface FloatingDamage {
  id: number;
  damage: number;
  type: 'normal' | 'critical' | 'excellent' | 'monster' | 'reflect' | 'poison';
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
  characterId,
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
  zenBonus = 1,
  resetCount = 0,
  burstCooldownEnd,
  excellentChance = 5,
  poisonChance = 0,
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
  const [monstersKilled, setMonstersKilled] = useState(0);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [respawnCountdown, setRespawnCountdown] = useState<number | null>(null);
  const [inEvent, setInEvent] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [burstCooldown, setBurstCooldown] = useState(() => {
    // Initialize cooldown from saved value
    if (burstCooldownEnd) {
      const remaining = Math.ceil((new Date(burstCooldownEnd).getTime() - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });
  const [burstActive, setBurstActive] = useState(false); // Burst mode active (5x speed)
  const [burstTimeLeft, setBurstTimeLeft] = useState(0); // Seconds left in burst mode

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

  const damageIdRef = useRef(0);
  const combatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasHuntingBeforeDeathRef = useRef(false);
  const burstCooldownRef = useRef<NodeJS.Timeout | null>(null);

  const burstTimeRef = useRef<NodeJS.Timeout | null>(null);

  // Burst cooldown timer
  useEffect(() => {
    if (burstCooldown > 0) {
      burstCooldownRef.current = setTimeout(() => {
        setBurstCooldown(burstCooldown - 1);
      }, 1000);
    }
    return () => {
      if (burstCooldownRef.current) {
        clearTimeout(burstCooldownRef.current);
      }
    };
  }, [burstCooldown]);

  // Burst active timer (10 seconds duration)
  useEffect(() => {
    if (burstTimeLeft > 0) {
      burstTimeRef.current = setTimeout(() => {
        setBurstTimeLeft(burstTimeLeft - 1);
      }, 1000);
    } else if (burstActive && burstTimeLeft === 0) {
      // Burst ended
      setBurstActive(false);
    }
    return () => {
      if (burstTimeRef.current) {
        clearTimeout(burstTimeRef.current);
      }
    };
  }, [burstTimeLeft, burstActive]);

  const location = LOCATIONS[selectedLocation];
  const isDead = currentHp <= 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addLog = useCallback((_message: string, _type: string) => {
    // Combat log removed
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

  // Ref to track zone where player died (to go back one zone)
  const diedInZoneRef = useRef<number | null>(null);

  // Handle death - start respawn countdown and go back one zone
  useEffect(() => {
    if (isDead && respawnCountdown === null && isHunting) {
      wasHuntingBeforeDeathRef.current = true;
      diedInZoneRef.current = selectedLocation; // Remember where we died
      setIsHunting(false);
      setCurrentMonster(null);
      addLog('You have been defeated! Respawning in 5 seconds...', 'death');
      setRespawnCountdown(5);
      onDeath();
    }
  }, [isDead, respawnCountdown, isHunting, addLog, onDeath, selectedLocation]);

  // After respawn, go back one zone if we died
  useEffect(() => {
    if (respawnCountdown === 0 && diedInZoneRef.current !== null) {
      const deathZone = diedInZoneRef.current;
      // Go back one zone (minimum zone 0)
      if (deathZone > 0) {
        setSelectedLocation(deathZone - 1);
      }
      diedInZoneRef.current = null;
    }
  }, [respawnCountdown]);

  const performCombatRound = useCallback(() => {
    if (!currentMonster || currentHp <= 0) return;

    // Player attacks monster
    const isCritical = Math.random() * 100 < criticalRate;
    const isExcellent = Math.random() * 100 < excellentChance;
    const isPoison = poisonChance > 0 && Math.random() * 100 < poisonChance;

    const playerDamage = calculateDamage(minDamage, maxDamage, isCritical, isExcellent);

    // Poison deals 10% of monster's CURRENT HP
    const poisonDamage = isPoison ? Math.floor(currentMonster.currentHp * 0.1) : 0;
    const totalDamage = playerDamage + poisonDamage;

    const newMonsterHp = Math.max(0, currentMonster.currentHp - totalDamage);

    // Add floating damage for main hit
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

    // Add floating damage for poison (separate number)
    if (isPoison && poisonDamage > 0) {
      setTimeout(() => {
        addFloatingDamage(poisonDamage, 'poison');
      }, 150);
      addLog(`Poison! ${poisonDamage} extra damage!`, 'damage');
    }

    // Check if monster died
    if (newMonsterHp <= 0) {
      // Reset bonus: +0.1% per reset for both EXP and Zen
      const resetExpBonus = resetCount * 0.1;
      const resetZenBonus = resetCount * 0.1;

      const expGain = Math.floor(currentMonster.exp * 5.625 * (1 + (expBonus + resetExpBonus) / 100)); // +87.5% base + equipment + reset bonus
      const zenGain = Math.floor(currentMonster.zen * 36 * (1 + (zenBonus - 1 + resetZenBonus) / 100)); // +181% base + zenBonus level + reset bonus

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

      // Check for item drop (2% chance)
      if (Math.random() < 0.02) {
        onItemDrop(currentMonster.level);
        addLog('An item dropped!', 'item');
      }

      // Check for jewel drops (0.8% each type, only from monsters level 41+)
      if (currentMonster.level >= 41) {
        if (Math.random() < 0.008) {
          onJewelDrop('bless');
          addLog('💎 Jewel of Bless dropped!', 'item');
        }
        if (Math.random() < 0.008) {
          onJewelDrop('soul');
          addLog('💎 Jewel of Soul dropped!', 'item');
        }
        if (Math.random() < 0.008) {
          onJewelDrop('life');
          addLog('💎 Jewel of Life dropped!', 'item');
        }
        // Jewel of Chaos - rare drop (0.4%)
        if (Math.random() < 0.004) {
          onJewelDrop('chaos');
          addLog('💎 Jewel of Chaos dropped!', 'item');
        }
        // Special materials - drops (0.8% each)
        if (Math.random() < 0.008) {
          onJewelDrop('archangel');
          addLog('📜 Scroll of Archangel dropped!', 'item');
        }
        if (Math.random() < 0.008) {
          onJewelDrop('bloodbone');
          addLog('🦴 Blood Bone dropped!', 'item');
        }
        if (Math.random() < 0.008) {
          onJewelDrop('devilskey');
          addLog('🗝️ Devil\'s Key dropped!', 'item');
        }
        if (Math.random() < 0.008) {
          onJewelDrop('devilseye');
          addLog('👁️ Devil\'s Eye dropped!', 'item');
        }
      }

      // Feather drop - very rare (0.1%), only from monsters level 81+
      if (currentMonster.level >= 81) {
        if (Math.random() < 0.001) {
          onJewelDrop('feather');
          addLog('🪶 Feather dropped!', 'item');
        }
      }

      onExpGain(BigInt(expGain), BigInt(zenGain));

      // Immediately set monster to null to prevent double kills
      setCurrentMonster(null);

      // Spawn new monster after delay
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
    excellentChance,
    poisonChance,
    addLog,
    addFloatingDamage,
    onExpGain,
    onItemDrop,
    onHpChange,
    onMonsterKill,
    spawnMonster,
  ]);

  // Burst Attack - 5x attack speed for 10 seconds
  const activateBurst = useCallback(async () => {
    if (currentHp <= 0 || burstCooldown > 0 || burstActive) return;

    // Save cooldown to database
    try {
      const response = await fetch('/api/character/burst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId }),
      });

      if (!response.ok) {
        console.error('Failed to save burst cooldown');
        return;
      }
    } catch (err) {
      console.error('Burst API error:', err);
      return;
    }

    // Activate burst mode
    setBurstActive(true);
    setBurstTimeLeft(10); // 10 seconds duration

    // Start cooldown (180 seconds = 3 minutes)
    setBurstCooldown(180);
  }, [currentHp, burstCooldown, burstActive, characterId]);

  // Combat loop
  useEffect(() => {
    if (isHunting && currentHp > 0) {
      // Normal attack interval: scales with attack speed, min 150ms
      const normalInterval = Math.max(150, 2000 - attackSpeed * 10);
      // Burst mode: 5x faster (minimum 30ms)
      const attackInterval = burstActive ? Math.max(30, normalInterval / 5) : normalInterval;
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
  }, [isHunting, currentHp, attackSpeed, burstActive, performCombatRound]);

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
      {/* Location Selector - Custom Dropdown */}
      <div className="relative">
        <label className="text-xs text-gray-400 mb-1 block">Hunting Zone</label>
        <button
          onClick={() => !isHunting && !isDead && setLocationDropdownOpen(!locationDropdownOpen)}
          disabled={isHunting || isDead}
          className={`w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between transition-colors ${
            isHunting || isDead ? 'opacity-50 cursor-not-allowed' : 'hover:border-yellow-500/50 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🗺️</span>
            <div>
              <div className="font-medium text-yellow-400">{LOCATIONS[selectedLocation].name}</div>
              <div className="text-xs text-gray-400">
                Level {LOCATIONS[selectedLocation].levelRange[0]}-{LOCATIONS[selectedLocation].levelRange[1]} • {LOCATIONS[selectedLocation].monsters.length} monsters
              </div>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${locationDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {locationDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setLocationDropdownOpen(false)}
            />
            {/* Menu */}
            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden max-h-80 overflow-y-auto">
              {LOCATIONS.map((loc, index) => {
                const isSelected = selectedLocation === index;
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setSelectedLocation(index);
                      setLocationDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                      isSelected
                        ? 'bg-yellow-500/20 border-l-2 border-yellow-500'
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-xl">🗺️</span>
                    <div className="flex-1">
                      <div className={`font-medium ${isSelected ? 'text-yellow-400' : 'text-white'}`}>
                        {loc.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        Monsters Lv.{loc.levelRange[0]}-{loc.levelRange[1]}
                      </div>
                    </div>
                    {isSelected && (
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Zone info */}
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <span>💀</span>
          <span>On death, you will be moved back one zone.</span>
        </div>
      </div>

      {/* Combat Area */}
      <div className={`bg-gray-900 rounded-lg p-4 min-h-[200px] relative overflow-hidden ${burstActive ? 'animate-shake' : ''}`}>
        {/* Burst Attack Overlay */}
        {burstActive && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            {/* Pulsing border effect */}
            <div className="absolute inset-0 border-4 border-orange-500/50 rounded-lg animate-pulse" />
            {/* Top banner */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-600 to-red-600 px-4 py-1 rounded-full">
              <span className="text-white font-bold text-sm flex items-center gap-2">
                ⚡ BURST MODE ⚡
                <span className="bg-black/30 px-2 py-0.5 rounded text-xs">{burstTimeLeft}s</span>
              </span>
            </div>
          </div>
        )}

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
            <div className={`text-center py-4 relative ${burstActive ? 'animate-shake-fast' : ''}`}>
              {/* Floating Damage Numbers */}
              {floatingDamages.map((fd) => (
                <div
                  key={fd.id}
                  className={`absolute text-xl font-bold pointer-events-none animate-float-up ${
                    fd.type === 'excellent' ? 'text-green-400' :
                    fd.type === 'critical' ? 'text-cyan-400' :
                    fd.type === 'monster' ? 'text-red-500' :
                    fd.type === 'reflect' ? 'text-purple-400' :
                    fd.type === 'poison' ? 'text-lime-400' :
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
                  {fd.type === 'poison' && <span className="text-xs ml-1">☠️</span>}
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
            <div className="text-center py-4 relative">
              {isHunting ? (
                <>
                  {/* Keep same structure as monster display to prevent UI jump */}
                  <div className="text-4xl mb-2 opacity-30">💀</div>
                  <div className="text-lg font-bold text-gray-500">Spawning...</div>
                  <div className="text-sm text-gray-600">Next monster</div>
                  <div className="mt-2 max-w-xs mx-auto">
                    <div className="flex justify-between text-xs mb-1">
                      <span>HP</span>
                      <span className="text-gray-600">---</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div className="bg-gray-600 h-3 rounded-full w-0" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-gray-500">Select a location and start hunting!</div>
              )}
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

          {/* Skill: Burst Attack */}
          {!isDead && isHunting && (
            <div className="mt-2">
              <button
                onClick={activateBurst}
                disabled={burstCooldown > 0 || burstActive}
                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                  burstCooldown > 0 || burstActive
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/20'
                }`}
              >
                <span className="text-lg">⚡</span>
                <span>Burst Attack</span>
                {burstActive ? (
                  <span className="text-xs bg-orange-800 px-2 py-0.5 rounded animate-pulse">
                    {burstTimeLeft}s
                  </span>
                ) : burstCooldown > 0 ? (
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                    {Math.floor(burstCooldown / 60)}:{(burstCooldown % 60).toString().padStart(2, '0')}
                  </span>
                ) : (
                  <span className="text-xs bg-black/30 px-2 py-0.5 rounded">5x 10s</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Monsters killed: {monstersKilled}
        </div>
      </div>

      {/* CSS for animations */}
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

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake-fast {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-1deg); }
          50% { transform: translateX(4px) rotate(1deg); }
          75% { transform: translateX(-4px) rotate(-1deg); }
        }
        .animate-shake-fast {
          animation: shake-fast 0.15s ease-in-out infinite;
        }

      `}</style>
    </div>
  );
}
