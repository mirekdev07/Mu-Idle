'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  // Stat levels (for upgrades)
  dmgLevel: number;
  defLevel: number;
  speedLevel: number;
  hpLevel: number;
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
  feather: number;
  bloodCastleTicket: number;
  devilSquareTicket: number;
  bloodCastleEntriesToday: number;
  devilSquareEntriesToday: number;
}

interface UpgradeCosts {
  dmg: string;
  def: string;
  speed: string;
  hp: string;
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
  const [upgradeCosts, setUpgradeCosts] = useState<UpgradeCosts>({ dmg: '0', def: '0', speed: '0', hp: '0' });
  const [upgradeMultiplier, setUpgradeMultiplier] = useState<1 | 5 | 10 | 100 | 'max'>(1);

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

  // Mobile menu dropdown
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Crafting panel ref for mobile scroll
  const craftingPanelRef = useRef<HTMLDivElement>(null);

  // Confirm modal
  const { showConfirm, ConfirmModal } = useConfirmModal();
  const { showInfo, InfoModal } = useInfoModal();


  const loadGameData = useCallback(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const characterId = urlParams.get('character_id');
      const url = characterId ? `/api/game/data?character_id=${characterId}` : '/api/game/data';
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setGameData(data);
        setCurrentHp(data.character.currentHp ?? data.stats.maxHp);
        setLocalMonstersKilled(data.character.monstersKilled || 0);
        setLocalDeaths(data.character.deaths || 0);
        // Set upgrade costs
        if (data.upgradeCosts) {
          setUpgradeCosts(data.upgradeCosts);
        }
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

    // Mobile: save on visibility change (when user switches apps or tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgress(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Mobile: save on page hide (iOS Safari)
    const handlePageHide = () => {
      saveProgress(false);
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
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
    // Max level is 400
    const MAX_LEVEL = 400;
    let newLevel = gameData.character.level;
    let remainingExp = newExp;
    let leveledUp = false;

    while (remainingExp >= BigInt(newLevel * 100) && newLevel < MAX_LEVEL) {
      remainingExp -= BigInt(newLevel * 100);
      newLevel++;
      leveledUp = true;
    }

    // At max level, cap experience at 0 (no more exp needed)
    if (newLevel >= MAX_LEVEL) {
      remainingExp = 0n;
    }

    const newCharacterData = {
      ...gameData.character,
      experience: remainingExp.toString(),
      zen: newZen.toString(),
      level: newLevel,
    };

    // Update state
    setGameData({
      ...gameData,
      character: newCharacterData,
    });

    // On level up: save progress
    if (leveledUp) {
      try {
        await fetch('/api/game/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character_id: gameData.character.id,
            experience: remainingExp.toString(),
            zen: newZen.toString(),
            level: newLevel,
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

  const handleDepositItem = async (slotIndex: number) => {
    if (!gameData) return;
    try {
      const response = await fetch('/api/vault/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_slot: slotIndex }),
      });
      const data = await response.json();
      if (data.success) {
        await loadAllData(gameData.character.id);
      }
    } catch (err) {
      console.error('Deposit error:', err);
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

  const handleJewelDrop = async (type: 'bless' | 'soul' | 'life' | 'chaos' | 'archangel' | 'bloodbone' | 'devilskey' | 'devilseye' | 'feather') => {
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
            feather: data.materials?.feather ?? gameData.character.feather,
          },
        });
      }
    } catch (err) {
      console.error('Jewel drop failed:', err);
    }
  };

  const handleUpgradeStat = async (statName: 'dmg' | 'def' | 'speed' | 'hp') => {
    if (!gameData) return;

    const amount = upgradeMultiplier === 'max' ? 'max' : upgradeMultiplier;

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
        // Map stat names to character fields
        const statFieldMap: Record<string, keyof CharacterData> = {
          dmg: 'dmgLevel',
          def: 'defLevel',
          speed: 'speedLevel',
          hp: 'hpLevel',
        };

        setGameData({
          ...gameData,
          character: {
            ...gameData.character,
            [statFieldMap[statName]]: data.newLevel,
            zen: data.zen,
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

        // Update upgrade costs
        if (data.upgradeCosts) {
          setUpgradeCosts(data.upgradeCosts);
        }
      } else {
        console.error('Upgrade stat failed:', data.message);
      }
    } catch (err) {
      console.error('Upgrade stat failed:', err);
    }
  };

  const handleReset = async () => {
    if (!gameData || gameData.character.level < 400) return;

    const nextResetNumber = gameData.character.resetCount + 1;

    const confirmed = await showConfirm({
      title: 'Reset Character',
      message: `Reset to level 1? (Reset #${nextResetNumber}) Your Zen, stats, items, and equipment will be kept.`,
      confirmText: 'Reset',
      cancelText: 'Cancel',
      confirmColor: 'yellow',
    });

    if (!confirmed) return;

    try {
      const response = await fetch('/api/character/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadGameData();
        await showInfo({
          title: 'Reset Complete!',
          message: `Your character has been reset to level 1. Your stats and items are preserved!`,
          buttonText: 'Continue',
          color: 'yellow',
        });
      } else {
        alert(data.message || 'Reset failed');
      }
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  const handleCraftItem = (item: Item, slotIndex: number) => {
    setCraftingItem({ item, slotIndex });
    // Scroll to crafting panel on mobile after a short delay to let it render
    setTimeout(() => {
      craftingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCraftAction = async (action: 'bless' | 'bless_max' | 'soul' | 'life'): Promise<{ success: boolean; message: string; newItem?: Item }> => {
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
    attackSpeed: Math.min(200, stats.attackSpeed + (equipmentBonuses.attack_speed || 0)),
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
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/events" className="px-3 py-1 bg-orange-700 rounded hover:bg-orange-600 text-sm">
                Events
              </Link>
              <Link href="/chaos-machine" className="px-3 py-1 bg-purple-700 rounded hover:bg-purple-600 text-sm">
                Chaos Machine
              </Link>
              <Link href="/vault" className="px-3 py-1 bg-amber-700 rounded hover:bg-amber-600 text-sm">
                Vault
              </Link>
              <Link href="/characters" className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
                Characters
              </Link>
              <Link href="/wiki" className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
                Wiki
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

            {/* Mobile Menu Button */}
            <div className="sm:hidden relative">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              {/* Mobile Dropdown Menu */}
              {mobileMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  {/* Menu */}
                  <div className="absolute right-0 top-12 z-50 w-56 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-gray-700">
                      <div className="text-xs text-gray-400 px-3 py-1">Menu</div>
                    </div>
                    <div className="py-2">
                      <Link
                        href="/events"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-orange-700/30 transition-colors"
                      >
                        <span className="text-xl">🏰</span>
                        <div>
                          <div className="font-medium text-orange-400">Events</div>
                          <div className="text-xs text-gray-400">Blood Castle & Devil Square</div>
                        </div>
                      </Link>
                      <Link
                        href="/chaos-machine"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-purple-700/30 transition-colors"
                      >
                        <span className="text-xl">🔮</span>
                        <div>
                          <div className="font-medium text-purple-400">Chaos Machine</div>
                          <div className="text-xs text-gray-400">Craft items & tickets</div>
                        </div>
                      </Link>
                      <Link
                        href="/vault"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-amber-700/30 transition-colors"
                      >
                        <span className="text-xl">🏦</span>
                        <div>
                          <div className="font-medium text-amber-400">Vault</div>
                          <div className="text-xs text-gray-400">Store your items</div>
                        </div>
                      </Link>
                      <Link
                        href="/characters"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors"
                      >
                        <span className="text-xl">👤</span>
                        <div>
                          <div className="font-medium">Characters</div>
                          <div className="text-xs text-gray-400">Manage your heroes</div>
                        </div>
                      </Link>
                      <Link
                        href="/wiki"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors"
                      >
                        <span className="text-xl">📖</span>
                        <div>
                          <div className="font-medium">Wiki</div>
                          <div className="text-xs text-gray-400">Game guide & info</div>
                        </div>
                      </Link>
                      <Link
                        href="/ranking"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors"
                      >
                        <span className="text-xl">🏆</span>
                        <div>
                          <div className="font-medium">Ranking</div>
                          <div className="text-xs text-gray-400">Top players</div>
                        </div>
                      </Link>
                    </div>
                    <div className="p-2 border-t border-gray-700">
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          signOut({ callbackUrl: '/login' });
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-red-700/30 transition-colors rounded-lg"
                      >
                        <span className="text-xl">🚪</span>
                        <div>
                          <div className="font-medium text-red-400">Logout</div>
                          <div className="text-xs text-gray-400">Sign out of account</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
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
            </div>

            {/* Stat Upgrades */}
            <div className="mt-4 pt-3 border-t border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-300 flex items-center gap-1">
                  Upgrade Stats
                  <InfoTooltip
                    color="blue"
                    content={
                      <div className="space-y-1">
                        <div className="font-bold text-yellow-400 mb-1">Stat Bonuses:</div>
                        <div><span className="text-red-400">DMG:</span> +2 min, +3 max damage per level</div>
                        <div><span className="text-blue-400">DEF:</span> +1 defense per level</div>
                        <div><span className="text-cyan-400">Speed:</span> +1 attack speed per level</div>
                        <div><span className="text-green-400">HP:</span> +10 HP per level</div>
                        <div className="text-gray-400 mt-1 text-xs">Cost: 100 × level^1.5 zen</div>
                      </div>
                    }
                  />
                </span>
              </div>
              {/* Multiplier Toggle */}
              <div className="flex gap-1 mb-2">
                {([1, 5, 10, 100, 'max'] as const).map((mult) => (
                  <button
                    key={mult}
                    onClick={() => setUpgradeMultiplier(mult)}
                    className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${
                      upgradeMultiplier === mult
                        ? 'bg-yellow-500 text-gray-900'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {mult === 'max' ? 'MAX' : `x${mult}`}
                  </button>
                ))}
              </div>
              {/* Stats */}
              {[
                { key: 'dmg' as const, label: 'DMG', value: character.dmgLevel, cost: upgradeCosts.dmg, color: 'text-red-400' },
                { key: 'def' as const, label: 'DEF', value: character.defLevel, cost: upgradeCosts.def, color: 'text-blue-400' },
                { key: 'speed' as const, label: 'Speed', value: character.speedLevel, cost: upgradeCosts.speed, color: 'text-cyan-400' },
                { key: 'hp' as const, label: 'HP', value: character.hpLevel, cost: upgradeCosts.hp, color: 'text-green-400' },
              ].map(({ key, label, value, cost, color }) => (
                <div key={key} className="flex justify-between items-center text-xs mb-1.5 bg-gray-700/30 rounded px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className={`${color} font-bold w-12`}>{label}</span>
                    <span className="text-white font-mono">Lv.{value}</span>
                  </div>
                  <button
                    onClick={() => handleUpgradeStat(key)}
                    disabled={BigInt(character.zen) < BigInt(cost)}
                    className="px-2 py-0.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:opacity-50 rounded text-xs font-bold transition-colors"
                  >
                    {BigInt(cost).toLocaleString()} Zen
                  </button>
                </div>
              ))}
              {character.level >= 400 && (
                <button
                  onClick={handleReset}
                  className="w-full mt-2 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold animate-pulse"
                >
                  ⭐ RESET CHARACTER ⭐
                </button>
              )}
            </div>

            {/* Combat Stats */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                Combat Stats
                <InfoTooltip
                  color="yellow"
                  content={
                    <div className="space-y-1">
                      <div className="font-bold text-yellow-400 mb-1">Combat Values:</div>
                      <div><span className="text-red-400">Attack:</span> DMG level × 2-3 + weapon</div>
                      <div><span className="text-blue-400">Defense:</span> DEF level + armor</div>
                      <div><span className="text-cyan-400">ATK Speed:</span> Speed level + weapon (max 200)</div>
                      <div><span className="text-green-400">Max HP:</span> 50 + HP level × 10</div>
                    </div>
                  }
                />
              </h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div><span className="text-gray-500">Attack:</span><span className="ml-1 text-red-400">{totalStats.minDamage}-{totalStats.maxDamage}</span></div>
                <div><span className="text-gray-500">Defense:</span><span className="ml-1 text-blue-400">{totalStats.defense}</span></div>
                <div><span className="text-gray-500">HP:</span><span className="ml-1 text-green-400">{stats.maxHp}</span></div>
                <div><span className="text-gray-500">Crit:</span><span className="ml-1 text-yellow-400">{stats.criticalRate}%</span></div>
                <div><span className="text-gray-500">ATK Speed:</span><span className="ml-1 text-cyan-400">{totalStats.attackSpeed}{totalStats.attackSpeed >= 200 && <span className="text-green-400 ml-1">(max)</span>}</span></div>
              </div>
            </div>

            {/* Crafting Materials - Desktop */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">Crafting Materials</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center justify-center gap-1 bg-gray-700/30 rounded py-1">
                  <span className="text-purple-300">💎</span>
                  <span className="text-purple-300 font-medium">{character.jewelOfBless}</span>
                  <span className="text-gray-500">Bless</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-gray-700/30 rounded py-1">
                  <span className="text-pink-400">💎</span>
                  <span className="text-pink-400 font-medium">{character.jewelOfSoul}</span>
                  <span className="text-gray-500">Soul</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-gray-700/30 rounded py-1">
                  <span className="text-orange-400">💎</span>
                  <span className="text-orange-400 font-medium">{character.jewelOfLife}</span>
                  <span className="text-gray-500">Life</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-gray-700/30 rounded py-1">
                  <span className="text-yellow-400">💎</span>
                  <span className="text-yellow-400 font-medium">{character.jewelOfChaos}</span>
                  <span className="text-gray-500">Chaos</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-gray-700/30 rounded py-1">
                  <span className="text-cyan-400">📜</span>
                  <span className="text-cyan-400 font-medium">{character.scrollOfArchangel}</span>
                  <span className="text-gray-500">Scroll</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-gray-700/30 rounded py-1">
                  <span className="text-red-400">🦴</span>
                  <span className="text-red-400 font-medium">{character.bloodBone}</span>
                  <span className="text-gray-500">Bone</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-gray-700/30 rounded py-1">
                  <span className="text-amber-400">🗝️</span>
                  <span className="text-amber-400 font-medium">{character.devilsKey}</span>
                  <span className="text-gray-500">Key</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-gray-700/30 rounded py-1">
                  <span className="text-green-400">👁️</span>
                  <span className="text-green-400 font-medium">{character.devilsEye}</span>
                  <span className="text-gray-500">Eye</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-gray-700/30 rounded py-1">
                  <span className="text-emerald-400">🪶</span>
                  <span className="text-emerald-400 font-medium">{character.feather}</span>
                  <span className="text-gray-500">Feather</span>
                </div>
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
              expBonus={equipmentBonuses.exp_bonus}
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
                <InventorySlot key={slot.slotIndex} item={slot.item} slotIndex={slot.slotIndex} equipment={equipment} onEquip={handleEquipItem} onDestroy={handleDestroyItem} onCraft={handleCraftItem} onDeposit={handleDepositItem} />
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
                expBonus={equipmentBonuses.exp_bonus}
                onHpChange={handleHpChange}
                onExpGain={handleExpGain}
                onItemDrop={handleItemDrop}
                onJewelDrop={handleJewelDrop}
                onDeath={handleDeath}
                onMonsterKill={handleMonsterKill}
              />
            </div>

            {/* Crafting Materials - Mobile */}
            <div className="mt-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2">Crafting Materials</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-purple-300">💎 <span className="font-bold">{character.jewelOfBless}</span></div>
                  <div className="text-gray-500 text-[10px]">Bless</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-pink-400">💎 <span className="font-bold">{character.jewelOfSoul}</span></div>
                  <div className="text-gray-500 text-[10px]">Soul</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-orange-400">💎 <span className="font-bold">{character.jewelOfLife}</span></div>
                  <div className="text-gray-500 text-[10px]">Life</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-yellow-400">💎 <span className="font-bold">{character.jewelOfChaos}</span></div>
                  <div className="text-gray-500 text-[10px]">Chaos</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-cyan-400">📜 <span className="font-bold">{character.scrollOfArchangel}</span></div>
                  <div className="text-gray-500 text-[10px]">Scroll</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-red-400">🦴 <span className="font-bold">{character.bloodBone}</span></div>
                  <div className="text-gray-500 text-[10px]">Bone</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-amber-400">🗝️ <span className="font-bold">{character.devilsKey}</span></div>
                  <div className="text-gray-500 text-[10px]">Key</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-green-400">👁️ <span className="font-bold">{character.devilsEye}</span></div>
                  <div className="text-gray-500 text-[10px]">Eye</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-emerald-400">🪶 <span className="font-bold">{character.feather}</span></div>
                  <div className="text-gray-500 text-[10px]">Feather</div>
                </div>
              </div>
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

                {/* Stat Upgrades */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold flex items-center gap-1">
                      Upgrade Stats
                      <InfoTooltip
                        color="blue"
                        content={
                          <div className="space-y-1">
                            <div className="font-bold text-yellow-400 mb-1">Stat Bonuses:</div>
                            <div><span className="text-red-400">DMG:</span> +2 min, +3 max damage per level</div>
                            <div><span className="text-blue-400">DEF:</span> +1 defense per level</div>
                            <div><span className="text-cyan-400">Speed:</span> +1 attack speed per level</div>
                            <div><span className="text-green-400">HP:</span> +10 HP per level</div>
                            <div className="text-gray-400 mt-1 text-xs">Cost: 100 × level^1.5 zen</div>
                          </div>
                        }
                      />
                    </span>
                  </div>
                  {/* Multiplier Toggle */}
                  <div className="flex gap-1 mb-2">
                    {([1, 5, 10, 100, 'max'] as const).map((mult) => (
                      <button
                        key={mult}
                        onClick={() => setUpgradeMultiplier(mult)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${
                          upgradeMultiplier === mult
                            ? 'bg-yellow-500 text-gray-900'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        {mult === 'max' ? 'MAX' : `x${mult}`}
                      </button>
                    ))}
                  </div>
                  {/* Stats */}
                  {[
                    { key: 'dmg' as const, label: 'DMG', value: character.dmgLevel, cost: upgradeCosts.dmg, color: 'text-red-400' },
                    { key: 'def' as const, label: 'DEF', value: character.defLevel, cost: upgradeCosts.def, color: 'text-blue-400' },
                    { key: 'speed' as const, label: 'Speed', value: character.speedLevel, cost: upgradeCosts.speed, color: 'text-cyan-400' },
                    { key: 'hp' as const, label: 'HP', value: character.hpLevel, cost: upgradeCosts.hp, color: 'text-green-400' },
                  ].map(({ key, label, value, cost, color }) => (
                    <div key={key} className="flex justify-between items-center py-1.5 bg-gray-700/30 rounded px-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`${color} font-bold w-12`}>{label}</span>
                        <span className="text-white font-mono">Lv.{value}</span>
                      </div>
                      <button
                        onClick={() => handleUpgradeStat(key)}
                        disabled={BigInt(character.zen) < BigInt(cost)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:opacity-50 rounded text-xs font-bold transition-colors"
                      >
                        {BigInt(cost).toLocaleString()} Zen
                      </button>
                    </div>
                  ))}
                  {character.level >= 400 && (
                    <button
                      onClick={handleReset}
                      className="w-full mt-2 py-3 bg-purple-600 hover:bg-purple-500 rounded text-lg font-bold animate-pulse"
                    >
                      ⭐ RESET CHARACTER ⭐
                    </button>
                  )}
                </div>

                {/* Combat Stats */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-1">
                    Combat Stats
                    <InfoTooltip
                      color="yellow"
                      content={
                        <div className="space-y-1">
                          <div className="font-bold text-yellow-400 mb-1">Combat Values:</div>
                          <div><span className="text-red-400">Attack:</span> DMG level × 2-3 + weapon</div>
                          <div><span className="text-blue-400">Defense:</span> DEF level + armor</div>
                          <div><span className="text-cyan-400">ATK Speed:</span> Speed level + weapon (max 200)</div>
                          <div><span className="text-green-400">Max HP:</span> 50 + HP level × 10</div>
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
                      <span className="ml-1 text-green-400 font-bold">{stats.maxHp}</span>
                    </div>
                    <div className="bg-gray-700/50 rounded p-2">
                      <span className="text-gray-500">Crit:</span>
                      <span className="ml-1 text-yellow-400 font-bold">{stats.criticalRate}%</span>
                    </div>
                    <div className="bg-gray-700/50 rounded p-2 col-span-2">
                      <span className="text-gray-500">ATK Speed:</span>
                      <span className="ml-1 text-cyan-400 font-bold">{totalStats.attackSpeed}</span>
                      {totalStats.attackSpeed >= 200 && <span className="text-green-400 ml-1">(max)</span>}
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
                    <InventorySlot key={slot.slotIndex} item={slot.item} slotIndex={slot.slotIndex} equipment={equipment} onEquip={handleEquipItem} onDestroy={handleDestroyItem} onCraft={handleCraftItem} onDeposit={handleDepositItem} />
                  ))}
                </div>
              </div>

              {/* Crafting Panel - Mobile */}
              {craftingItem && (
                <div ref={craftingPanelRef}>
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
