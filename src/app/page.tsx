'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGameStore } from '@/store/gameStore';
import HuntingPanel from '@/components/game/HuntingPanel';
import EquipmentPanel from '@/components/game/EquipmentPanel';
import InventorySlot from '@/components/game/InventorySlot';
import CraftingPanel from '@/components/game/CraftingPanel';
import { Item, EquipmentSlotKey } from '@/types/game';
import { useConfirmModal, useInfoModal } from '@/components/ui/ConfirmModal';
import InfoTooltip from '@/components/ui/InfoTooltip';

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
  deaths: number;
  jewelOfBless: number;
  jewelOfSoul: number;
  jewelOfLife: number;
  jewelOfChaos: number;
  scrollOfArchangel: number;
  bloodBone: number;
  devilsKey: number;
  devilsEye: number;
  bloodCastleTicket: number;
  devilSquareTicket: number;
  bloodCastleEntriesToday: number;
  devilSquareEntriesToday: number;
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
  const [expPerSecond, setExpPerSecond] = useState(0);
  const [zenPerSecond, setZenPerSecond] = useState(0);
  const [lastExpUpdate, setLastExpUpdate] = useState<{ exp: bigint; zen: bigint; time: number } | null>(null);
  const [offlineRewards, setOfflineRewards] = useState<{ exp: number; zen: number; seconds: number } | null>(null);
  const [craftingItem, setCraftingItem] = useState<{ item: Item; slotIndex: number } | null>(null);

  const {
    inventory,
    equipment,
    equipmentBonuses,
    loadAllData,
    equipItem,
    unequipItem,
    destroyItem,
    clearInventory,
  } = useGameStore();

  // Track monsters killed and deaths locally for live updates
  const [localMonstersKilled, setLocalMonstersKilled] = useState(0);
  const [localDeaths, setLocalDeaths] = useState(0);

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'hunt' | 'character' | 'inventory'>('hunt');

  // Confirm modal
  const { showConfirm, ConfirmModal } = useConfirmModal();
  const { showInfo, InfoModal } = useInfoModal();


  const loadGameData = useCallback(async () => {
    try {
      const response = await fetch('/api/game/data');
      const data = await response.json();

      if (data.success) {
        setGameData(data);
        setCurrentHp(data.character.currentHp ?? data.stats.maxHp);
        setLocalMonstersKilled(data.character.monstersKilled || 0);
        setLocalDeaths(data.character.deaths || 0);
        // Load inventory and equipment
        await loadAllData(data.character.id);
        // Show offline rewards modal if any
        if (data.offlineRewards) {
          setOfflineRewards(data.offlineRewards);
        }
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

    const saveProgress = async (updateHeartbeat = true) => {
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
            monsters_killed: localMonstersKilled,
            deaths: localDeaths,
            exp_per_second: expPerSecond,
            zen_per_second: zenPerSecond,
            update_heartbeat: updateHeartbeat,
          }),
        });
        console.log('Progress saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    };

    const saveInterval = setInterval(saveProgress, 30000);

    // Also save on page unload (without updating heartbeat for offline tracking)
    const handleBeforeUnload = () => {
      saveProgress(false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameData, localMonstersKilled, localDeaths, expPerSecond, zenPerSecond]);

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

    // Track EXP and Zen per second
    const now = Date.now();
    if (lastExpUpdate) {
      const timeDiff = (now - lastExpUpdate.time) / 1000;
      if (timeDiff > 0 && timeDiff < 10) {
        const expDiff = Number(newExp - lastExpUpdate.exp);
        const zenDiff = Number(newZen - lastExpUpdate.zen);
        const newExpPerSec = expDiff / timeDiff;
        const newZenPerSec = zenDiff / timeDiff;
        // Smooth average
        setExpPerSecond(prev => prev === 0 ? newExpPerSec : (prev * 0.7 + newExpPerSec * 0.3));
        setZenPerSecond(prev => prev === 0 ? newZenPerSec : (prev * 0.7 + newZenPerSec * 0.3));
      }
    }
    setLastExpUpdate({ exp: newExp, zen: newZen, time: now });

    // Check for level up (simple formula: level * 100 exp needed)
    let newLevel = gameData.character.level;
    let remainingExp = newExp;
    let newPoints = gameData.character.levelupPoints;
    let leveledUp = false;

    while (remainingExp >= BigInt(newLevel * 100)) {
      remainingExp -= BigInt(newLevel * 100);
      newLevel++;
      newPoints += 5; // 5 points per level
      leveledUp = true;
    }

    let newCharacterData = {
      ...gameData.character,
      experience: remainingExp.toString(),
      zen: newZen.toString(),
      level: newLevel,
      levelupPoints: newPoints,
    };

    // Calculate new maxHp for new level (same formula as stats.service.ts)
    // HP = 100 + (vitality * 5) + (level * 3)
    const newMaxHp = leveledUp
      ? Math.floor(100 + gameData.character.vitality * 5 + newLevel * 3)
      : gameData.stats.maxHp;

    const newStats = leveledUp
      ? { ...gameData.stats, maxHp: newMaxHp }
      : gameData.stats;

    // Update state
    setGameData({
      ...gameData,
      character: newCharacterData,
      stats: newStats,
    });

    // On level up: restore HP to full and save progress
    if (leveledUp) {
      setCurrentHp(newMaxHp);

      try {
        await fetch('/api/game/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character_id: gameData.character.id,
            experience: remainingExp.toString(),
            zen: newZen.toString(),
            level: newLevel,
            levelup_points: newPoints,
          }),
        });
      } catch (err) {
        console.error('Failed to save level up:', err);
      }
    }
  };

  const handleItemDrop = async (monsterLevel: number) => {
    if (!gameData) return;

    try {
      const response = await fetch('/api/items/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
          monster_level: monsterLevel,
        }),
      });

      const data = await response.json();
      if (data.success && data.added) {
        await loadAllData(gameData.character.id);
      }
    } catch (err) {
      console.error('Item drop failed:', err);
    }
  };

  const handleDeath = () => {
    setLocalDeaths((prev) => prev + 1);
  };

  // Refresh stats after equipment changes
  const refreshStats = async () => {
    if (!gameData) return;
    try {
      const response = await fetch(`/api/character/stats?character_id=${gameData.character.id}`);
      const data = await response.json();
      if (data.success) {
        setGameData({
          ...gameData,
          stats: {
            minDamage: data.stats.minDamage,
            maxDamage: data.stats.maxDamage,
            physicalDefense: data.stats.physicalDefense,
            attackSpeed: data.stats.attackSpeed,
            maxHp: data.stats.maxHp,
            criticalRate: data.stats.criticalRate,
          },
        });
      }
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  };

  const handleEquipItem = async (item: Item, slotIndex: number) => {
    if (!gameData) return;
    const success = await equipItem(item, slotIndex, gameData.character.id);
    if (success) await refreshStats();
  };

  const handleUnequipItem = async (slot: EquipmentSlotKey) => {
    if (!gameData) return;
    const success = await unequipItem(slot, gameData.character.id);
    if (success) await refreshStats();
  };

  const handleDestroyItem = async (slotIndex: number) => {
    if (!gameData) return;
    const item = inventory.find((s) => s.slotIndex === slotIndex)?.item;
    const itemName = item ? `${item.name}${item.enhancementLevel ? ` +${item.enhancementLevel}` : ''}` : 'this item';
    const confirmed = await showConfirm({
      title: 'Destroy Item',
      message: `Are you sure you want to destroy ${itemName}?`,
      confirmText: 'Destroy',
      cancelText: 'Keep',
      confirmColor: 'red',
    });
    if (confirmed) {
      await destroyItem(slotIndex, gameData.character.id);
    }
  };

  const handleClearInventory = async () => {
    if (!gameData) return;
    const confirmed = await showConfirm({
      title: 'Clear Inventory',
      message: 'Are you sure you want to destroy ALL items in your inventory? This cannot be undone.',
      confirmText: 'Destroy All',
      cancelText: 'Cancel',
      confirmColor: 'red',
    });
    if (confirmed) {
      await clearInventory(gameData.character.id);
    }
  };

  const handleMonsterKill = () => {
    setLocalMonstersKilled((prev) => prev + 1);
  };

  const handleJewelDrop = async (type: 'bless' | 'soul' | 'life' | 'chaos' | 'archangel' | 'bloodbone' | 'devilskey' | 'devilseye') => {
    if (!gameData) return;

    try {
      const response = await fetch('/api/character/jewels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
          jewel_type: type,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setGameData({
          ...gameData,
          character: {
            ...gameData.character,
            jewelOfBless: data.jewels.bless,
            jewelOfSoul: data.jewels.soul,
            jewelOfLife: data.jewels.life,
            jewelOfChaos: data.jewels.chaos,
            scrollOfArchangel: data.materials?.archangel ?? gameData.character.scrollOfArchangel,
            bloodBone: data.materials?.bloodbone ?? gameData.character.bloodBone,
            devilsKey: data.materials?.devilskey ?? gameData.character.devilsKey,
            devilsEye: data.materials?.devilseye ?? gameData.character.devilsEye,
          },
        });
      }
    } catch (err) {
      console.error('Jewel drop failed:', err);
    }
  };

  const handleAddStat = async (statName: string, amount: number = 1) => {
    if (!gameData || gameData.character.levelupPoints <= 0) return;

    try {
      const response = await fetch('/api/character/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
          stat_name: statName,
          amount,
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

  const handleRebuild = async () => {
    if (!gameData) return;

    const confirmed = await showConfirm({
      title: 'Rebuild Stats',
      message: 'Reset all stats to 25 and get back all spent points? Cost: 1,000,000 Zen',
      confirmText: 'Rebuild',
      cancelText: 'Cancel',
      confirmColor: 'yellow',
    });

    if (!confirmed) return;

    try {
      const response = await fetch('/api/character/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Reload all game data to get fresh stats
        await loadGameData();
        await showInfo({
          title: 'Rebuild Complete!',
          message: `Your stats have been reset to 25. You received ${data.pointsReturned} stat points to redistribute.`,
          buttonText: 'Great!',
          color: 'yellow',
        });
      } else {
        await showInfo({
          title: 'Rebuild Failed',
          message: data.message || 'Something went wrong',
          buttonText: 'OK',
          color: 'red',
        });
      }
    } catch (err) {
      console.error('Rebuild failed:', err);
      await showInfo({
        title: 'Error',
        message: 'Failed to rebuild stats. Please try again.',
        buttonText: 'OK',
        color: 'red',
      });
    }
  };

  const handleCraftItem = (item: Item, slotIndex: number) => {
    setCraftingItem({ item, slotIndex });
  };

  const handleCraftAction = async (action: 'bless' | 'soul' | 'life'): Promise<{ success: boolean; message: string; newItem?: Item }> => {
    if (!gameData || !craftingItem) {
      return { success: false, message: 'No item selected' };
    }

    try {
      const response = await fetch('/api/crafting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
          inventory_slot: craftingItem.slotIndex,
          action,
        }),
      });

      const data = await response.json();

      if (data.success !== undefined) {
        // Update jewel counts
        setGameData({
          ...gameData,
          character: {
            ...gameData.character,
            jewelOfBless: data.jewels.bless,
            jewelOfSoul: data.jewels.soul,
            jewelOfLife: data.jewels.life,
          },
        });

        // Update crafting item if successful
        if (data.item) {
          const updatedItem: Item = {
            ...craftingItem.item, // Keep id and type from original
            name: data.item.name,
            emoji: data.item.emoji,
            rarity: data.item.rarity,
            level: data.item.level,
            damage_min: data.item.damageMin || 0,
            damage_max: data.item.damageMax || 0,
            defense: data.item.defense || 0,
            attack_speed: data.item.attackSpeed || 0,
            category: data.item.category,
            enhancementLevel: data.item.enhancementLevel || 0,
            options: data.item.options || undefined,
          };
          setCraftingItem({ item: updatedItem, slotIndex: craftingItem.slotIndex });
        }

        // Refresh inventory
        await loadAllData(gameData.character.id);

        return { success: data.success, message: data.message };
      }

      return { success: false, message: data.message || 'Crafting failed' };
    } catch (err) {
      console.error('Crafting failed:', err);
      return { success: false, message: 'Server error' };
    }
  };

  const handleCloseCrafting = () => {
    setCraftingItem(null);
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

  // EXP calculation helper
  const currentExp = BigInt(character.experience);
  const expNeeded = BigInt(character.level * 100);
  const expPercentage = Number((currentExp * 100n) / expNeeded);
  const expRemaining = Number(expNeeded - currentExp);
  const timeToLevel = expPerSecond > 0 ? Math.ceil(expRemaining / expPerSecond) : null;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Mobile Header - Compact */}
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-700 p-2 lg:p-4">
        <div className="max-w-7xl mx-auto">
          {/* Top row - Logo and menu */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-2xl font-bold text-yellow-400">MU Idle</h1>
              <span className="hidden sm:inline text-gray-400 text-sm">| {character.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/events" className="p-2 lg:px-3 lg:py-1 bg-orange-700 rounded hover:bg-orange-600 text-xs lg:text-sm">
                <span className="hidden sm:inline">Events</span>
                <span className="sm:hidden">🏰</span>
              </Link>
              <Link href="/chaos-machine" className="p-2 lg:px-3 lg:py-1 bg-purple-700 rounded hover:bg-purple-600 text-xs lg:text-sm">
                <span className="hidden sm:inline">Chaos Machine</span>
                <span className="sm:hidden">🔮</span>
              </Link>
              <Link href="/characters" className="p-2 lg:px-3 lg:py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs lg:text-sm">
                <span className="hidden sm:inline">Characters</span>
                <span className="sm:hidden">👤</span>
              </Link>
              <Link href="/wiki" className="p-2 lg:px-3 lg:py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs lg:text-sm">
                <span className="hidden sm:inline">Wiki</span>
                <span className="sm:hidden">📖</span>
              </Link>
              <Link href="/ranking" className="p-2 lg:px-3 lg:py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs lg:text-sm">
                <span className="hidden sm:inline">Ranking</span>
                <span className="sm:hidden">🏆</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 lg:px-3 lg:py-1 bg-red-700 rounded hover:bg-red-600 text-xs lg:text-sm"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">🚪</span>
              </button>
            </div>
          </div>

          {/* Mobile Quick Stats Bar */}
          <div className="lg:hidden mt-2 grid grid-cols-4 gap-2 text-xs">
            <div className="bg-gray-800 rounded p-1.5 text-center">
              <div className="text-gray-400">Lv</div>
              <div className="text-yellow-400 font-bold">{character.level}</div>
            </div>
            <div className="bg-gray-800 rounded p-1.5 text-center">
              <div className="text-gray-400">HP</div>
              <div className="text-red-400 font-bold">{currentHp}/{stats.maxHp}</div>
            </div>
            <div className="bg-gray-800 rounded p-1.5 text-center">
              <div className="text-gray-400">ATK</div>
              <div className="text-orange-400 font-bold">{totalStats.minDamage}-{totalStats.maxDamage}</div>
            </div>
            <div className="bg-gray-800 rounded p-1.5 text-center">
              <div className="text-gray-400">DEF</div>
              <div className="text-blue-400 font-bold">{totalStats.defense}</div>
            </div>
          </div>

          {/* Mobile EXP Bar */}
          <div className="lg:hidden mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-purple-400">{expPercentage.toFixed(1)}%</span>
              {timeToLevel !== null && <span className="text-gray-500">~{formatTime(timeToLevel)}</span>}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(expPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <nav className="lg:hidden sticky top-[88px] z-20 bg-gray-800 border-b border-gray-700">
        <div className="flex">
          {[
            { id: 'hunt', label: '⚔️ Hunt', icon: '⚔️' },
            { id: 'character', label: '👤 Stats', icon: '👤' },
            { id: 'inventory', label: '🎒 Items', icon: '🎒' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-700/50'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-2 lg:p-4">
        {/* Desktop Layout - Grid */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4">
          {/* Character Panel - Desktop */}
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
              <div className="flex justify-between">
                <span className="text-gray-400">Reset:</span>
                <span className={character.resetCount > 0 ? "text-purple-400" : "text-gray-600"}>{character.resetCount}</span>
              </div>
              {/* EXP Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">EXP:</span>
                  <span>{currentExp.toLocaleString()} / {expNeeded.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(expPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-400">{expPercentage.toFixed(1)}%</span>
                  {timeToLevel !== null && <span className="text-gray-500">~{formatTime(timeToLevel)}</span>}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Zen:</span>
                <span className="text-green-400">{BigInt(character.zen).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monsters Killed:</span>
                <span className="text-orange-400">{localMonstersKilled.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deaths:</span>
                <span className="text-red-400">{localDeaths.toLocaleString()}</span>
              </div>
              {/* Jewels */}
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="text-xs text-gray-500 mb-1">Jewels</div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-purple-300">💎 {character.jewelOfBless}</span>
                    <span className="text-gray-500 text-[10px]">Bless</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-pink-400">💎 {character.jewelOfSoul}</span>
                    <span className="text-gray-500 text-[10px]">Soul</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-orange-400">💎 {character.jewelOfLife}</span>
                    <span className="text-gray-500 text-[10px]">Life</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-400">💎 {character.jewelOfChaos}</span>
                    <span className="text-gray-500 text-[10px]">Chaos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Base Stats */}
            <div className="mt-4 pt-3 border-t border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-300 flex items-center gap-1">
                  Stats
                  <InfoTooltip
                    color="blue"
                    content={
                      <div className="space-y-1">
                        <div className="font-bold text-yellow-400 mb-1">Stat Formulas:</div>
                        <div><span className="text-red-400">Strength:</span> +1.1x min dmg, +1.6x max dmg</div>
                        <div><span className="text-blue-400">Agility:</span> +0.5x defense, +0.15x atk speed</div>
                        <div><span className="text-green-400">Vitality:</span> +5 HP per point</div>
                      </div>
                    }
                  />
                </span>
                <span className="text-xs text-blue-400">Points: {character.levelupPoints}</span>
              </div>
              {[
                { key: 'damage', label: 'STR', value: character.damage },
                { key: 'defense', label: 'AGI', value: character.defense },
                { key: 'vitality', label: 'VIT', value: character.vitality },
              ].map(({ key, label, value }) => (
                <div key={key} className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-400">{label}:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-8 text-right">{value}</span>
                    {character.levelupPoints >= 5 && (
                      <>
                        <button
                          onClick={() => handleAddStat(key, 5)}
                          className="px-1 h-5 bg-green-600 hover:bg-green-500 rounded text-xs font-bold"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => handleAddStat(key, 10)}
                          disabled={character.levelupPoints < 10}
                          className="px-1 h-5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:opacity-50 rounded text-xs font-bold"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleAddStat(key, 50)}
                          disabled={character.levelupPoints < 50}
                          className="px-1 h-5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:opacity-50 rounded text-xs font-bold"
                        >
                          +50
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={handleRebuild}
                disabled={BigInt(character.zen) < 1000000n}
                className="w-full mt-2 py-1 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:opacity-50 rounded text-xs font-bold"
              >
                Rebuild (1M Zen)
              </button>
            </div>

            {/* Combat Stats */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                Combat
                <InfoTooltip
                  color="yellow"
                  content={
                    <div className="space-y-1">
                      <div className="font-bold text-yellow-400 mb-1">Combat Formulas:</div>
                      <div><span className="text-red-400">Attack:</span> STR × 1.1-1.6 + weapon</div>
                      <div><span className="text-blue-400">Defense:</span> AGI × 0.5 + armor</div>
                      <div><span className="text-cyan-400">Crit Rate:</span> 1% + level/40 + STR/200</div>
                      <div><span className="text-orange-400">ATK Speed:</span> AGI × 0.15 + weapon</div>
                    </div>
                  }
                />
              </h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div><span className="text-gray-500">Attack:</span><span className="ml-1 text-red-400">{totalStats.minDamage}-{totalStats.maxDamage}</span></div>
                <div><span className="text-gray-500">Defense:</span><span className="ml-1 text-blue-400">{totalStats.defense}</span></div>
                <div><span className="text-gray-500">HP:</span><span className="ml-1 text-red-400">{stats.maxHp}</span></div>
                <div><span className="text-gray-500">Crit:</span><span className="ml-1">{stats.criticalRate}%</span></div>
                <div><span className="text-gray-500">ATK Speed:</span><span className="ml-1 text-orange-400">{totalStats.attackSpeed}</span></div>
              </div>
            </div>
          </div>

          {/* Hunting Panel - Desktop */}
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
              lifeSteal={equipmentBonuses.life_steal}
              reflectDamage={equipmentBonuses.reflect_damage}
              onHpChange={handleHpChange}
              onExpGain={handleExpGain}
              onItemDrop={handleItemDrop}
              onJewelDrop={handleJewelDrop}
              onDeath={handleDeath}
              onMonsterKill={handleMonsterKill}
            />
          </div>

          {/* Equipment Panel - Desktop */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-yellow-400 mb-3">Equipment</h2>
            <EquipmentPanel equipment={equipment} onUnequip={handleUnequipItem} />
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs">
              <div className="text-gray-400 mb-1 flex items-center gap-1">
                Bonuses
                <InfoTooltip
                  color="green"
                  content={
                    <div className="space-y-1">
                      <div className="font-bold text-green-400 mb-1">Equipment Bonuses:</div>
                      <div><span className="text-red-400">DMG:</span> From weapons</div>
                      <div><span className="text-blue-400">DEF:</span> From armor pieces</div>
                      <div><span className="text-cyan-400">Crit:</span> From item options</div>
                      <div><span className="text-pink-400">LS:</span> Life Steal from options</div>
                      <div><span className="text-purple-400">EXP:</span> EXP bonus from options</div>
                    </div>
                  }
                />
              </div>
              {equipmentBonuses.damage_min > 0 && <div className="text-red-400">+{equipmentBonuses.damage_min}-{equipmentBonuses.damage_max} DMG</div>}
              {equipmentBonuses.defense > 0 && <div className="text-blue-400">+{equipmentBonuses.defense} DEF</div>}
              {equipmentBonuses.critical_rate > 0 && <div className="text-cyan-400">+{equipmentBonuses.critical_rate}% Crit</div>}
              {equipmentBonuses.life_steal > 0 && <div className="text-pink-400">+{equipmentBonuses.life_steal}% LS</div>}
              {equipmentBonuses.exp_bonus > 0 && <div className="text-purple-400">+{equipmentBonuses.exp_bonus}% EXP</div>}
              {equipmentBonuses.max_hp > 0 && <div className="text-red-400">+{equipmentBonuses.max_hp}% HP</div>}
            </div>
          </div>

          {/* Inventory - Desktop */}
          <div className={`bg-gray-800/50 rounded-lg p-4 border border-gray-700 ${craftingItem ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-yellow-400">Inventory</h2>
              <button onClick={handleClearInventory} className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs font-semibold">Clear All</button>
            </div>
            <div className={`grid ${craftingItem ? 'grid-cols-8' : 'grid-cols-12'} gap-1`}>
              {inventory.map((slot) => (
                <InventorySlot key={slot.slotIndex} item={slot.item} slotIndex={slot.slotIndex} equipment={equipment} onEquip={handleEquipItem} onDestroy={handleDestroyItem} onCraft={handleCraftItem} />
              ))}
            </div>
          </div>

          {/* Crafting Panel - Desktop */}
          {craftingItem && (
            <div className="lg:col-span-1">
              <CraftingPanel
                item={craftingItem.item}
                jewelOfBless={character.jewelOfBless}
                jewelOfSoul={character.jewelOfSoul}
                jewelOfLife={character.jewelOfLife}
                onCraft={handleCraftAction}
                onClose={handleCloseCrafting}
              />
            </div>
          )}
        </div>

        {/* Mobile Layout - Tabs */}
        <div className="lg:hidden">
          {/* Hunt Tab - Always rendered, hidden with CSS to preserve state */}
          <div className={activeTab === 'hunt' ? '' : 'hidden'}>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
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
                lifeSteal={equipmentBonuses.life_steal}
                reflectDamage={equipmentBonuses.reflect_damage}
                onHpChange={handleHpChange}
                onExpGain={handleExpGain}
                onItemDrop={handleItemDrop}
                onJewelDrop={handleJewelDrop}
                onDeath={handleDeath}
                onMonsterKill={handleMonsterKill}
              />
            </div>
          </div>

          {/* Character Tab */}
          {activeTab === 'character' && (
            <div className="space-y-3">
              {/* Stats Panel */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold text-yellow-400">{character.name}</h2>
                  <span className="text-xs text-gray-400">{character.class}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-gray-400 text-xs">Reset</div>
                    <div className={character.resetCount > 0 ? "text-purple-400 font-bold" : "text-gray-600 font-bold"}>{character.resetCount}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-gray-400 text-xs">Zen</div>
                    <div className="text-green-400 font-bold">{BigInt(character.zen).toLocaleString()}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-gray-400 text-xs">Monsters</div>
                    <div className="text-orange-400 font-bold">{localMonstersKilled.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-gray-400 text-xs">Deaths</div>
                    <div className="text-red-400 font-bold">{localDeaths.toLocaleString()}</div>
                  </div>
                </div>

                {/* Jewels */}
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-lg text-purple-300">💎</div>
                    <div className="text-purple-300 font-bold text-sm">{character.jewelOfBless}</div>
                    <div className="text-gray-500 text-xs">Bless</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-lg text-pink-400">💎</div>
                    <div className="text-pink-400 font-bold text-sm">{character.jewelOfSoul}</div>
                    <div className="text-gray-500 text-xs">Soul</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-lg text-orange-400">💎</div>
                    <div className="text-orange-400 font-bold text-sm">{character.jewelOfLife}</div>
                    <div className="text-gray-500 text-xs">Life</div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2">
                    <div className="text-lg text-yellow-400">💎</div>
                    <div className="text-yellow-400 font-bold text-sm">{character.jewelOfChaos}</div>
                    <div className="text-gray-500 text-xs">Chaos</div>
                  </div>
                </div>

                {/* Stat Points */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold flex items-center gap-1">
                      Stats
                      <InfoTooltip
                        color="blue"
                        content={
                          <div className="space-y-1">
                            <div className="font-bold text-yellow-400 mb-1">Stat Formulas:</div>
                            <div><span className="text-red-400">Strength:</span> +1.1x min dmg, +1.6x max dmg</div>
                            <div><span className="text-blue-400">Agility:</span> +0.5x defense, +0.15x atk speed</div>
                            <div><span className="text-green-400">Vitality:</span> +5 HP per point</div>
                          </div>
                        }
                      />
                    </span>
                    <span className="text-blue-400 font-bold">Points: {character.levelupPoints}</span>
                  </div>
                  {[
                    { key: 'damage', label: 'STR', value: character.damage },
                    { key: 'defense', label: 'AGI', value: character.defense },
                    { key: 'vitality', label: 'VIT', value: character.vitality },
                  ].map(({ key, label, value }) => (
                    <div key={key} className="flex justify-between items-center py-1">
                      <span className="text-gray-400">{label}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono w-10 text-right">{value}</span>
                        {character.levelupPoints >= 5 && (
                          <>
                            <button onClick={() => handleAddStat(key, 5)} className="px-2 h-7 bg-green-600 hover:bg-green-500 rounded text-sm font-bold">+5</button>
                            <button onClick={() => handleAddStat(key, 10)} disabled={character.levelupPoints < 10} className="px-2 h-7 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:opacity-50 rounded text-sm font-bold">+10</button>
                            <button onClick={() => handleAddStat(key, 50)} disabled={character.levelupPoints < 50} className="px-2 h-7 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:opacity-50 rounded text-sm font-bold">+50</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleRebuild}
                    disabled={BigInt(character.zen) < 1000000n}
                    className="w-full mt-2 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:opacity-50 rounded text-sm font-bold"
                  >
                    Rebuild (1M Zen)
                  </button>
                </div>

                {/* Combat Stats */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-1">
                    Combat
                    <InfoTooltip
                      color="yellow"
                      content={
                        <div className="space-y-1">
                          <div className="font-bold text-yellow-400 mb-1">Combat Formulas:</div>
                          <div><span className="text-red-400">Attack:</span> STR × 1.1-1.6 + weapon</div>
                          <div><span className="text-blue-400">Defense:</span> AGI × 0.5 + armor</div>
                          <div><span className="text-cyan-400">Crit Rate:</span> 1% + level/40 + STR/200</div>
                          <div><span className="text-orange-400">ATK Speed:</span> AGI × 0.15 + weapon</div>
                        </div>
                      }
                    />
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-700/50 rounded p-2">
                      <span className="text-gray-500">Attack:</span>
                      <span className="ml-1 text-red-400 font-bold">{totalStats.minDamage}-{totalStats.maxDamage}</span>
                    </div>
                    <div className="bg-gray-700/50 rounded p-2">
                      <span className="text-gray-500">Defense:</span>
                      <span className="ml-1 text-blue-400 font-bold">{totalStats.defense}</span>
                    </div>
                    <div className="bg-gray-700/50 rounded p-2">
                      <span className="text-gray-500">HP:</span>
                      <span className="ml-1 text-red-400 font-bold">{stats.maxHp}</span>
                    </div>
                    <div className="bg-gray-700/50 rounded p-2">
                      <span className="text-gray-500">Crit:</span>
                      <span className="ml-1 text-cyan-400 font-bold">{stats.criticalRate}%</span>
                    </div>
                    <div className="bg-gray-700/50 rounded p-2 col-span-2">
                      <span className="text-gray-500">ATK Speed:</span>
                      <span className="ml-1 text-orange-400 font-bold">{totalStats.attackSpeed}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-3">
              {/* Equipment Panel */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <h2 className="text-lg font-semibold text-yellow-400 mb-3">Equipment</h2>
                <EquipmentPanel equipment={equipment} onUnequip={handleUnequipItem} />
                <div className="mt-3 pt-3 border-t border-gray-700 text-xs grid grid-cols-2 gap-1">
                  {equipmentBonuses.damage_min > 0 && <div className="text-red-400">+{equipmentBonuses.damage_min}-{equipmentBonuses.damage_max} DMG</div>}
                  {equipmentBonuses.defense > 0 && <div className="text-blue-400">+{equipmentBonuses.defense} DEF</div>}
                  {equipmentBonuses.critical_rate > 0 && <div className="text-cyan-400">+{equipmentBonuses.critical_rate}% Crit</div>}
                  {equipmentBonuses.life_steal > 0 && <div className="text-pink-400">+{equipmentBonuses.life_steal}% LS</div>}
                  {equipmentBonuses.exp_bonus > 0 && <div className="text-purple-400">+{equipmentBonuses.exp_bonus}% EXP</div>}
                  {equipmentBonuses.max_hp > 0 && <div className="text-red-400">+{equipmentBonuses.max_hp}% HP</div>}
                </div>
              </div>

              {/* Inventory */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold text-yellow-400">Inventory</h2>
                  <button onClick={handleClearInventory} className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs font-semibold">Clear</button>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {inventory.map((slot) => (
                    <InventorySlot key={slot.slotIndex} item={slot.item} slotIndex={slot.slotIndex} equipment={equipment} onEquip={handleEquipItem} onDestroy={handleDestroyItem} onCraft={handleCraftItem} />
                  ))}
                </div>
              </div>

              {/* Crafting Panel - Mobile */}
              {craftingItem && (
                <CraftingPanel
                  item={craftingItem.item}
                  jewelOfBless={character.jewelOfBless}
                  jewelOfSoul={character.jewelOfSoul}
                  jewelOfLife={character.jewelOfLife}
                  onCraft={handleCraftAction}
                  onClose={handleCloseCrafting}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Confirm Modal */}
      {ConfirmModal}

      {/* Info Modal */}
      {InfoModal}

      {/* Offline Rewards Modal */}
      {offlineRewards && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 border border-yellow-500/50 shadow-2xl">
            <div className="text-center">
              <div className="text-5xl mb-4">💰</div>
              <h2 className="text-xl font-bold text-yellow-400 mb-2">
                Offline Rewards!
              </h2>
              <p className="text-gray-400 mb-4">
                While you were away for{' '}
                <span className="text-white font-semibold">
                  {offlineRewards.seconds >= 3600
                    ? `${Math.floor(offlineRewards.seconds / 3600)}h ${Math.floor((offlineRewards.seconds % 3600) / 60)}min`
                    : offlineRewards.seconds >= 60
                    ? `${Math.floor(offlineRewards.seconds / 60)} min`
                    : `${offlineRewards.seconds} sec`}
                </span>
                , you earned:
              </p>
              <div className="space-y-2 mb-6">
                {offlineRewards.exp > 0 && (
                  <div className="text-2xl font-bold text-purple-400">
                    +{offlineRewards.exp.toLocaleString()} EXP
                  </div>
                )}
                {offlineRewards.zen > 0 && (
                  <div className="text-2xl font-bold text-green-400">
                    +{offlineRewards.zen.toLocaleString()} Zen
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-4">
                (20% of normal production, max 8h)
              </p>
              <button
                onClick={() => setOfflineRewards(null)}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-lg transition-colors"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
