'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Boss } from '@/lib/game/bosses';

interface DroppedItemInfo {
  name: string;
  rarity: string;
  emoji: string;
  enhancementLevel?: number;
  options: { type: string; value: number; display: string }[] | null;
}

interface BattleResult {
  success: boolean;
  message: string;
  rewards?: {
    exp: number;
    zen: number;
    items: DroppedItemInfo[];
  };
  killsRemaining?: number;
}

interface FloatingDamage {
  id: number;
  damage: number;
  type: 'player' | 'boss' | 'critical' | 'heal';
  x: number;
  y: number;
}

interface CharacterStats {
  minDamage: number;
  maxDamage: number;
  defense: number;
  maxHp: number;
  currentHp: number;
  criticalRate: number;
  attackSpeed: number;
  lifeSteal: number;
}

export default function BossZonePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [killsToday, setKillsToday] = useState<Record<number, number>>({});
  const [characterLevel, setCharacterLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [characterStats, setCharacterStats] = useState<CharacterStats | null>(null);

  // Battle state
  const [activeBoss, setActiveBoss] = useState<Boss | null>(null);
  const [bossCurrentHp, setBossCurrentHp] = useState(0);
  const [playerCurrentHp, setPlayerCurrentHp] = useState(0);
  const [isFighting, setIsFighting] = useState(false);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  const damageIdRef = useRef(0);
  const combatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const gameRes = await fetch('/api/game/data');
        const gameData = await gameRes.json();
        if (gameData.character) {
          setCharacterId(gameData.character.id);

          // Use stats from API (same as main game)
          const char = gameData.character;
          const stats = gameData.stats || {};
          const bonuses = gameData.bonuses || {};

          const maxHp = stats.maxHp || 100;
          const currentHp = char.currentHp ?? maxHp;

          setCharacterStats({
            minDamage: stats.minDamage || 10,
            maxDamage: stats.maxDamage || 20,
            defense: stats.physicalDefense || 5,
            maxHp,
            currentHp,
            criticalRate: stats.criticalRate || 5,
            attackSpeed: stats.attackSpeed || 100,
            lifeSteal: (bonuses.life_steal || 0) + (char.ascLifeSteal || 0) * 0.1,
          });
          setPlayerCurrentHp(currentHp);

          const bossRes = await fetch(`/api/boss?characterId=${gameData.character.id}`);
          const bossData = await bossRes.json();
          if (bossData.success) {
            setBosses(bossData.bosses);
            setKillsToday(bossData.killsToday);
            setCharacterLevel(bossData.characterLevel);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const addFloatingDamage = useCallback((damage: number, type: FloatingDamage['type']) => {
    damageIdRef.current += 1;

    let x: number, y: number;
    if (type === 'player' || type === 'critical') {
      x = 30 + Math.random() * 40;
      y = 20 + Math.random() * 20;
    } else if (type === 'heal') {
      x = 60 + Math.random() * 30;
      y = 70 + Math.random() * 15;
    } else {
      x = 30 + Math.random() * 40;
      y = 65 + Math.random() * 20;
    }

    const newDamage: FloatingDamage = {
      id: damageIdRef.current,
      damage,
      type,
      x,
      y,
    };
    setFloatingDamages(prev => [...prev, newDamage]);

    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== newDamage.id));
    }, 1000);
  }, []);

  const startBattle = async (boss: Boss) => {
    if (!characterStats || !characterId) return;

    // First, consume the daily attempt via API
    try {
      const res = await fetch('/api/boss/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, bossId: boss.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Show error and don't start battle
        setBattleResult({
          success: false,
          message: data.error || 'Failed to start battle',
        });
        setActiveBoss(boss); // Show the result modal
        return;
      }

      // Update local kill count immediately
      setKillsToday(prev => ({
        ...prev,
        [boss.id]: (prev[boss.id] || 0) + 1,
      }));

    } catch {
      setBattleResult({
        success: false,
        message: 'Connection error',
      });
      setActiveBoss(boss);
      return;
    }

    // Start the actual battle
    const bossHp = boss.hp || 50000;
    setActiveBoss(boss);
    setBossCurrentHp(bossHp);
    setPlayerCurrentHp(characterStats.currentHp || characterStats.maxHp || 100);
    setIsFighting(true);
    setBattleResult(null);
  };

  const endBattle = useCallback(async (victory: boolean) => {
    if (combatIntervalRef.current) {
      clearInterval(combatIntervalRef.current);
      combatIntervalRef.current = null;
    }
    setIsFighting(false);

    if (victory && activeBoss && characterId) {
      // Call API to get rewards
      try {
        const res = await fetch('/api/boss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, bossId: activeBoss.id }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setBattleResult({
            success: true,
            message: data.message,
            rewards: data.rewards,
            killsRemaining: data.killsRemaining,
          });
          // Kill count already incremented in startBattle
        } else {
          setBattleResult({
            success: false,
            message: data.message || 'Failed to claim rewards',
          });
        }
      } catch {
        setBattleResult({
          success: false,
          message: 'Connection error',
        });
      }
    } else {
      setBattleResult({
        success: false,
        message: 'You have been defeated!',
      });
    }
  }, [activeBoss, characterId]);

  // Combat loop
  useEffect(() => {
    if (!isFighting || !activeBoss || !characterStats) return;

    const attackSpeed = characterStats.attackSpeed || 100;
    const attackInterval = Math.max(200, 1000 - attackSpeed);
    const bossDefense = activeBoss.defense || 0;
    const bossMinDmg = activeBoss.minDamage || 10;
    const bossMaxDmg = activeBoss.maxDamage || 20;
    const playerDefense = characterStats.defense || 0;
    const playerMinDmg = characterStats.minDamage || 10;
    const playerMaxDmg = characterStats.maxDamage || 20;
    const critRate = characterStats.criticalRate || 5;
    const lifeSteal = characterStats.lifeSteal || 0;
    const maxHp = characterStats.maxHp || 100;

    combatIntervalRef.current = setInterval(() => {
      // Player attacks boss
      const isCritical = Math.random() * 100 < critRate;
      let playerDamage = Math.floor(
        Math.random() * (playerMaxDmg - playerMinDmg + 1) + playerMinDmg
      );
      if (isCritical) playerDamage = Math.floor(playerDamage * 1.5);

      // Apply boss defense
      playerDamage = Math.max(1, playerDamage - Math.floor(bossDefense / 4));

      setBossCurrentHp(prev => {
        const newHp = Math.max(0, (prev || 0) - playerDamage);
        if (newHp <= 0) {
          endBattle(true);
        }
        return newHp;
      });

      addFloatingDamage(playerDamage, isCritical ? 'critical' : 'player');

      // Boss attacks player (after small delay)
      setTimeout(() => {
        if (!isFighting) return;

        const bossDamage = Math.max(1, Math.floor(
          Math.random() * (bossMaxDmg - bossMinDmg + 1) + bossMinDmg
        ) - Math.floor(playerDefense / 4));

        addFloatingDamage(bossDamage, 'boss');

        setPlayerCurrentHp(prev => {
          const hpAfterDamage = Math.max(0, (prev || 0) - bossDamage);

          // Check death BEFORE life steal
          if (hpAfterDamage <= 0) {
            // Use setTimeout to ensure state update completes
            setTimeout(() => endBattle(false), 0);
            return 0;
          }

          // Life steal only if alive
          let newHp = hpAfterDamage;
          if (lifeSteal > 0) {
            const healAmount = Math.floor(playerDamage * lifeSteal / 100);
            if (healAmount > 0) {
              newHp = Math.min(maxHp, newHp + healAmount);
              setTimeout(() => addFloatingDamage(healAmount, 'heal'), 100);
            }
          }

          return newHp;
        });
      }, attackInterval / 2);

    }, attackInterval);

    return () => {
      if (combatIntervalRef.current) {
        clearInterval(combatIntervalRef.current);
      }
    };
  }, [isFighting, activeBoss, characterStats, addFloatingDamage, endBattle]);

  const closeBattle = () => {
    if (combatIntervalRef.current) {
      clearInterval(combatIntervalRef.current);
    }
    setActiveBoss(null);
    setIsFighting(false);
    setBattleResult(null);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-400';
      case 'epic': return 'text-purple-400';
      case 'rare': return 'text-blue-400';
      case 'uncommon': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Mobile Header - hidden on desktop (has global menu) */}
        <div className="flex lg:hidden items-center justify-between mb-6">
          <Link
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            Game
          </Link>
          <h1 className="text-2xl font-bold text-purple-400">
            Boss Zone
          </h1>
          <div className="text-sm text-gray-400">
            Level: <span className="text-yellow-400 font-bold">{characterLevel}</span>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-purple-400">
            Boss Zone
          </h1>
          <div className="text-sm text-gray-400">
            Level: <span className="text-yellow-400 font-bold">{characterLevel}</span>
          </div>
        </div>

        {/* Battle Arena */}
        {activeBoss && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full border-2 border-red-500 shadow-2xl">
              {!battleResult ? (
                <>
                  {/* Boss Display */}
                  <div className="text-center mb-6 relative min-h-[200px]">
                    <div className="text-8xl mb-2 animate-pulse">{activeBoss.emoji}</div>
                    <div className="text-2xl font-bold text-red-400">{activeBoss.name}</div>
                    <div className="text-sm text-gray-400">Level {activeBoss.level}</div>

                    {/* Boss HP Bar */}
                    <div className="mt-4 max-w-md mx-auto">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-red-400">Boss HP</span>
                        <span className="text-red-400">{(bossCurrentHp || 0).toLocaleString()} / {(activeBoss.hp || 50000).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-red-600 h-4 rounded-full transition-all duration-300"
                          style={{ width: `${((bossCurrentHp || 0) / (activeBoss.hp || 50000)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Floating Damages */}
                    {floatingDamages.map(fd => (
                      <div
                        key={fd.id}
                        className={`absolute text-2xl font-bold pointer-events-none animate-bounce ${
                          fd.type === 'player' ? 'text-yellow-400' :
                          fd.type === 'critical' ? 'text-orange-400' :
                          fd.type === 'heal' ? 'text-green-400' :
                          'text-red-500'
                        }`}
                        style={{
                          left: `${fd.x}%`,
                          top: `${fd.y}%`,
                          animation: 'floatUp 1s ease-out forwards',
                        }}
                      >
                        {fd.type === 'heal' ? '+' : '-'}{fd.damage || 0}
                        {fd.type === 'critical' && ' CRIT!'}
                      </div>
                    ))}
                  </div>

                  {/* Player HP Bar */}
                  <div className="max-w-md mx-auto mb-6">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-400">Your HP</span>
                      <span className="text-green-400">{(playerCurrentHp || 0).toLocaleString()} / {(characterStats?.maxHp || 100).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-green-600 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${((playerCurrentHp || 0) / (characterStats?.maxHp || 100)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Combat Status */}
                  <div className="text-center text-yellow-400 animate-pulse mb-4">
                    Fighting...
                  </div>

                  {/* Flee Button */}
                  <button
                    onClick={closeBattle}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-colors"
                  >
                    Flee (Forfeit Battle)
                  </button>
                </>
              ) : (
                <>
                  {/* Battle Result */}
                  {battleResult.success ? (
                    <>
                      <h2 className="text-3xl font-bold text-green-400 text-center mb-4">
                        Victory!
                      </h2>
                      <div className="text-6xl text-center mb-4">🏆</div>
                      <p className="text-center text-gray-300 mb-4">{battleResult.message}</p>

                      {battleResult.rewards && (
                        <div className="space-y-4">
                          <div className="flex justify-center gap-8 text-lg">
                            <div>
                              <span className="text-cyan-400">+{battleResult.rewards.exp.toLocaleString()}</span>
                              <span className="text-gray-400 ml-1">EXP</span>
                            </div>
                            <div>
                              <span className="text-yellow-400">+{battleResult.rewards.zen.toLocaleString()}</span>
                              <span className="text-gray-400 ml-1">Zen</span>
                            </div>
                          </div>

                          <div className="border-t border-gray-700 pt-4">
                            <h3 className="text-center text-gray-400 mb-3">Items Dropped:</h3>
                            <div className="space-y-2">
                              {battleResult.rewards.items.map((item, idx) => (
                                <div key={idx} className="bg-gray-700/50 rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{item.emoji}</span>
                                    <span className={`font-medium ${getRarityColor(item.rarity)}`}>
                                      {item.name}
                                      {item.enhancementLevel && item.enhancementLevel > 0 && (
                                        <span className="text-yellow-400 ml-1">+{item.enhancementLevel}</span>
                                      )}
                                    </span>
                                  </div>
                                  {item.options && item.options.length > 0 && (
                                    <div className="mt-1 pl-8 text-sm text-blue-400">
                                      {item.options.map((opt, optIdx) => (
                                        <div key={optIdx}>{opt.display}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {battleResult.killsRemaining !== undefined && (
                            <p className="text-center text-gray-500 text-sm mt-2">
                              Kills remaining today: {battleResult.killsRemaining}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold text-red-400 text-center mb-4">
                        Defeated
                      </h2>
                      <div className="text-6xl text-center mb-4">💀</div>
                      <p className="text-center text-gray-300">{battleResult.message}</p>
                    </>
                  )}

                  <button
                    onClick={closeBattle}
                    className="w-full mt-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bosses Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {bosses.map(boss => {
            const killsUsed = killsToday[boss.id] || 0;
            const canFight = characterLevel >= boss.requiredLevel && killsUsed < boss.dailyLimit;
            const levelLocked = characterLevel < boss.requiredLevel;

            return (
              <div
                key={boss.id}
                className={`bg-gray-800/80 rounded-xl p-6 border-2 transition-all ${
                  levelLocked
                    ? 'border-gray-700 opacity-60'
                    : canFight
                    ? 'border-purple-500 hover:border-purple-400'
                    : 'border-red-900'
                }`}
              >
                {/* Boss Header */}
                <div className="text-center mb-4">
                  <div className="text-6xl mb-2">{boss.emoji}</div>
                  <h2 className="text-xl font-bold text-purple-300">{boss.name}</h2>
                  <div className="text-sm text-gray-400">Level {boss.level}</div>
                </div>

                {/* Boss Description */}
                <p className="text-gray-400 text-sm text-center mb-4 italic">
                  {boss.description}
                </p>

                {/* Boss Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-red-400 font-bold">{boss.hp.toLocaleString()}</div>
                    <div className="text-gray-500 text-xs">HP</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-orange-400 font-bold">{boss.minDamage}-{boss.maxDamage}</div>
                    <div className="text-gray-500 text-xs">Damage</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-blue-400 font-bold">{boss.defense}</div>
                    <div className="text-gray-500 text-xs">Defense</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-yellow-400 font-bold">Lv {boss.requiredLevel}+</div>
                    <div className="text-gray-500 text-xs">Required</div>
                  </div>
                </div>

                {/* Rewards Preview */}
                <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-500 mb-1">Rewards:</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-cyan-400">+{boss.expReward.toLocaleString()} EXP</span>
                    <span className="text-yellow-400">+{boss.zenReward.toLocaleString()} Zen</span>
                  </div>
                  <div className="text-xs text-green-400 mt-1">
                    + 3 Items +5~+9 with Options
                  </div>
                </div>

                {/* Daily Limit */}
                <div className="flex justify-between items-center mb-4 text-sm">
                  <span className="text-gray-400">Daily Kills:</span>
                  <span className={killsUsed >= boss.dailyLimit ? 'text-red-400' : 'text-green-400'}>
                    {killsUsed} / {boss.dailyLimit}
                  </span>
                </div>

                {/* Fight Button */}
                {levelLocked ? (
                  <button
                    disabled
                    className="w-full py-3 bg-gray-700 text-gray-500 rounded-lg font-bold cursor-not-allowed"
                  >
                    Requires Level {boss.requiredLevel}
                  </button>
                ) : killsUsed >= boss.dailyLimit ? (
                  <button
                    disabled
                    className="w-full py-3 bg-red-900/50 text-red-400 rounded-lg font-bold cursor-not-allowed"
                  >
                    Daily Limit Reached
                  </button>
                ) : (
                  <button
                    onClick={() => startBattle(boss)}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-all text-white"
                  >
                    Challenge Boss
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-lg font-bold text-purple-400 mb-2">Boss Zone Info</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>Each boss can be killed 2 times per day</li>
            <li>Bosses drop 3 items with +5 to +9 enhancement and special options</li>
            <li>You need 3 empty inventory slots to receive boss drops</li>
            <li>If you die, you lose the attempt - be prepared!</li>
            <li>Daily limits reset at midnight</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-50px);
          }
        }
      `}</style>
    </div>
  );
}
