'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGameStore } from '@/store/gameStore';
import HuntingPanel from '@/components/game/HuntingPanel';
import EquipmentPanel from '@/components/game/EquipmentPanel';
import InventorySlot from '@/components/game/InventorySlot';
import ItemTooltip from '@/components/game/ItemTooltip';
import { Item, EquipmentSlotKey } from '@/types/game';

interface CharacterData {
  id: number;
  name: string;
  class: string;
  level: number;
  experience: string;
  zen: string;
  damage: number;
  defense: number;
  vitality: number;
  blockStat: number;
  attackSpeedStat: number;
  levelupPoints: number;
  currentHp: number | null;
  resetCount: number;
  monstersKilled: number;
}

interface GameStats {
  minDamage: number;
  maxDamage: number;
  physicalDefense: number;
  attackSpeed: number;
  maxHp: number;
  criticalRate: number;
}

interface GameData {
  character: CharacterData;
  stats: GameStats;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentHp, setCurrentHp] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const {
    inventory,
    equipment,
    equipmentBonuses,
    loadAllData,
    equipItem,
    unequipItem,
    destroyItem,
  } = useGameStore();

  const loadGameData = useCallback(async () => {
    try {
      const response = await fetch('/api/game/data');
      const data = await response.json();

      if (data.success) {
        setGameData(data);
        setCurrentHp(data.character.currentHp ?? data.stats.maxHp);
        // Load inventory and equipment
        await loadAllData(data.character.id);
      } else if (data.message === 'No character found') {
        router.push('/characters');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load game data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, loadAllData]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadGameData();
    }
  }, [status, router, loadGameData]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!gameData) return;

    const saveProgress = async () => {
      try {
        await fetch('/api/game/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character_id: gameData.character.id,
            experience: gameData.character.experience,
            zen: gameData.character.zen,
            level: gameData.character.level,
            levelup_points: gameData.character.levelupPoints,
          }),
        });
        console.log('Progress saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    };

    const saveInterval = setInterval(saveProgress, 30000);

    // Also save on page unload
    const handleBeforeUnload = () => {
      saveProgress();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameData]);

  const handleHpChange = async (newHp: number) => {
    setCurrentHp(newHp);
    if (gameData) {
      try {
        await fetch('/api/character/hp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character_id: gameData.character.id,
            current_hp: newHp,
          }),
        });
      } catch (err) {
        console.error('Failed to save HP:', err);
      }
    }
  };

  const handleExpGain = async (exp: bigint, zen: bigint) => {
    if (!gameData) return;

    const newExp = BigInt(gameData.character.experience) + exp;
    const newZen = BigInt(gameData.character.zen) + zen;

    // Check for level up (simple formula: level * 100 exp needed)
    const expNeeded = BigInt(gameData.character.level * 100);
    let newLevel = gameData.character.level;
    let remainingExp = newExp;
    let newPoints = gameData.character.levelupPoints;

    while (remainingExp >= BigInt(newLevel * 100)) {
      remainingExp -= BigInt(newLevel * 100);
      newLevel++;
      newPoints += 5; // 5 points per level
    }

    setGameData({
      ...gameData,
      character: {
        ...gameData.character,
        experience: remainingExp.toString(),
        zen: newZen.toString(),
        level: newLevel,
        levelupPoints: newPoints,
      },
    });
  };

  const handleItemDrop = async () => {
    if (!gameData) return;

    try {
      const response = await fetch('/api/items/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
          character_level: gameData.character.level,
        }),
      });

      const data = await response.json();
      if (data.success && data.item) {
        await loadAllData(gameData.character.id);
      }
    } catch (err) {
      console.error('Item drop failed:', err);
    }
  };

  const handleDeath = () => {
    // Could implement death penalty here
  };

  const handleEquipItem = async (item: Item, slotIndex: number) => {
    if (!gameData) return;
    await equipItem(item, slotIndex, gameData.character.id);
  };

  const handleUnequipItem = async (slot: EquipmentSlotKey) => {
    if (!gameData) return;
    await unequipItem(slot, gameData.character.id);
  };

  const handleDestroyItem = async (slotIndex: number) => {
    if (!gameData) return;
    await destroyItem(slotIndex, gameData.character.id);
  };

  const handleAddStat = async (statName: string) => {
    if (!gameData || gameData.character.levelupPoints <= 0) return;

    try {
      const response = await fetch('/api/character/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
          stat_name: statName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setGameData({
          ...gameData,
          character: {
            ...gameData.character,
            [statName]: data.newValue,
            levelupPoints: data.remainingPoints,
          },
          stats: {
            ...gameData.stats,
            minDamage: data.stats.minDamage,
            maxDamage: data.stats.maxDamage,
            physicalDefense: data.stats.physicalDefense,
            attackSpeed: data.stats.attackSpeed,
            maxHp: data.stats.maxHp,
            criticalRate: data.stats.criticalRate,
          },
        });
      } else {
        console.error('Add stat failed:', data.message);
      }
    } catch (err) {
      console.error('Add stat failed:', err);
    }
  };

  const handleItemHover = (item: Item | null, position: { x: number; y: number } | null) => {
    setHoveredItem(item);
    setTooltipPos(position);
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yellow-500 text-gray-900 rounded hover:bg-yellow-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No character found</p>
          <Link href="/characters" className="px-4 py-2 bg-yellow-500 text-gray-900 rounded hover:bg-yellow-400">
            Create Character
          </Link>
        </div>
      </div>
    );
  }

  const { character, stats } = gameData;
  const totalStats = {
    minDamage: stats.minDamage + (equipmentBonuses.damage_min || 0),
    maxDamage: stats.maxDamage + (equipmentBonuses.damage_max || 0),
    defense: stats.physicalDefense + (equipmentBonuses.defense || 0),
    attackSpeed: stats.attackSpeed + (equipmentBonuses.attack_speed || 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-yellow-400">MU Idle Adventure</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">
              {session?.user?.username}
            </span>
            <Link href="/characters" className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
              Characters
            </Link>
            <Link href="/ranking" className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
              Ranking
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-3 py-1 bg-red-700 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Character Panel */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">{character.name}</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Class:</span>
              <span>{character.class}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Level:</span>
              <span className="text-yellow-400">{character.level}</span>
            </div>
            {character.resetCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Resets:</span>
                <span className="text-purple-400">{character.resetCount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">EXP:</span>
              <span>{BigInt(character.experience).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Zen:</span>
              <span className="text-green-400">{BigInt(character.zen).toLocaleString()}</span>
            </div>
          </div>

          {/* Base Stats with + buttons */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-300">Stats</span>
              <span className="text-xs text-blue-400">Points: {character.levelupPoints}</span>
            </div>

            {[
              { key: 'damage', label: 'Strength', value: character.damage },
              { key: 'defense', label: 'Agility', value: character.defense },
              { key: 'vitality', label: 'Vitality', value: character.vitality },
            ].map(({ key, label, value }) => (
              <div key={key} className="flex justify-between items-center text-xs mb-1">
                <span className="text-gray-400">{label}:</span>
                <div className="flex items-center gap-2">
                  <span>{value}</span>
                  {character.levelupPoints > 0 && (
                    <button
                      onClick={() => handleAddStat(key)}
                      className="w-5 h-5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Combat Stats */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Combat</h3>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>
                <span className="text-gray-500">Attack:</span>
                <span className="ml-1 text-red-400">{totalStats.minDamage}-{totalStats.maxDamage}</span>
              </div>
              <div>
                <span className="text-gray-500">Defense:</span>
                <span className="ml-1 text-blue-400">{totalStats.defense}</span>
              </div>
              <div>
                <span className="text-gray-500">HP:</span>
                <span className="ml-1 text-red-400">{stats.maxHp}</span>
              </div>
              <div>
                <span className="text-gray-500">Crit:</span>
                <span className="ml-1">{stats.criticalRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hunting Panel */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 lg:col-span-2">
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">Hunting Ground</h2>
          <HuntingPanel
            characterId={character.id}
            characterLevel={character.level}
            minDamage={totalStats.minDamage}
            maxDamage={totalStats.maxDamage}
            defense={totalStats.defense}
            maxHp={stats.maxHp}
            currentHp={currentHp}
            criticalRate={stats.criticalRate}
            attackSpeed={totalStats.attackSpeed}
            onHpChange={handleHpChange}
            onExpGain={handleExpGain}
            onItemDrop={handleItemDrop}
            onDeath={handleDeath}
          />
        </div>

        {/* Equipment Panel */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">Equipment</h2>
          <EquipmentPanel
            equipment={equipment}
            onUnequip={handleUnequipItem}
            onHover={handleItemHover}
          />

          {/* Equipment Bonuses */}
          {(equipmentBonuses.damage_min > 0 || equipmentBonuses.defense > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs">
              <div className="text-gray-400 mb-1">Equipment Bonuses:</div>
              {equipmentBonuses.damage_min > 0 && (
                <div className="text-green-400">+{equipmentBonuses.damage_min}-{equipmentBonuses.damage_max} Damage</div>
              )}
              {equipmentBonuses.defense > 0 && (
                <div className="text-blue-400">+{equipmentBonuses.defense} Defense</div>
              )}
              {equipmentBonuses.attack_speed > 0 && (
                <div className="text-yellow-400">+{equipmentBonuses.attack_speed} Attack Speed</div>
              )}
            </div>
          )}
        </div>

        {/* Inventory */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 lg:col-span-4">
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">Inventory</h2>
          <div className="grid grid-cols-8 sm:grid-cols-12 gap-1">
            {inventory.map((slot) => (
              <InventorySlot
                key={slot.slotIndex}
                item={slot.item}
                slotIndex={slot.slotIndex}
                onEquip={handleEquipItem}
                onDestroy={handleDestroyItem}
                onHover={handleItemHover}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Item Tooltip */}
      {hoveredItem && tooltipPos && (
        <ItemTooltip item={hoveredItem} position={tooltipPos} />
      )}
    </div>
  );
}
