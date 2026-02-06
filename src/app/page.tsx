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
  zenLevel: number;
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
  burstCooldownEnd: string | null;
  // Ascension system
  ascensionPoints: number;
  ascDamage: number;
  ascCritical: number;
  ascHealth: number;
  ascLifeSteal: number;
  ascZen: number;
  ascExp: number;
  ascPoison: number;
  ascExcellent: number;
  // Helpers system
  helperAttackerLevel: number;
  helperBufferLevel: number;
}

interface UpgradeCosts {
  dmg: string;
  def: string;
  speed: string;
  hp: string;
  zen: string;
}

interface GameStats {
  minDamage: number;
  maxDamage: number;
  physicalDefense: number;
  attackSpeed: number;
  maxHp: number;
  criticalRate: number;
  excellentChance: number;
  poisonChance: number;
}

interface GameData {
  character: CharacterData;
  stats: GameStats;
}

// Local upgrade cost calculation (mirrors server logic)
function calculateUpgradeCost(currentLevel: number, amount: number): bigint {
  const BASE_COST = 50n;
  let totalCost = 0n;

  for (let i = 0; i < amount; i++) {
    const level = currentLevel + i;
    const cost = BASE_COST * BigInt(Math.floor(Math.pow(level, 1.5)));
    totalCost += cost;
  }

  return totalCost;
}

function calculateMaxUpgrades(currentLevel: number, availableZen: bigint): number {
  let upgrades = 0;
  let totalCost = 0n;

  while (upgrades < 10000) {
    const nextCost = calculateUpgradeCost(currentLevel + upgrades, 1);
    if (totalCost + nextCost > availableZen) break;
    totalCost += nextCost;
    upgrades++;
  }

  return upgrades;
}

// Helper upgrade cost calculation - exponential scaling (very expensive)
function calculateHelperUpgradeCost(currentLevel: number, helperType: 'attacker' | 'buffer'): bigint {
  const baseCost = helperType === 'attacker' ? 100000n : 50000n;
  const multiplier = Math.floor(Math.pow(currentLevel + 1, 2.5));
  return baseCost * BigInt(multiplier);
}

// Format large numbers with alphabet notation (idle game style)
// K, M, B, T, then a-z, aa-az, ba-bz, etc.
function formatNumber(num: bigint | number): string {
  const n = typeof num === 'bigint' ? Number(num) : num;

  if (n < 1_000) return Math.floor(n).toString();
  if (n < 1_000_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n < 1_000_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n < 1_000_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';

  // After T (10^15+), use alphabet notation: a, b, c... aa, ab...
  // Each letter represents x1000
  // a = 10^15, b = 10^18, c = 10^21... z = 10^90
  // aa = 10^93, ab = 10^96...
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let exp = Math.floor(Math.log10(n));

  // Starting from 10^15 (a), each suffix is 3 more (x1000)
  // suffix index: 0=a (10^15), 1=b (10^18), 25=z (10^90), 26=aa (10^93)...
  const suffixIndex = Math.floor((exp - 15) / 3);
  const divisorExp = 15 + suffixIndex * 3;
  const divisor = Math.pow(10, divisorExp);
  const value = n / divisor;

  // Generate suffix from index
  let suffix = '';
  let idx = suffixIndex;
  if (idx < 26) {
    // Single letter: a-z
    suffix = alphabet[idx];
  } else {
    // Multiple letters: aa, ab... ba, bb... aaa, aab...
    idx -= 26; // Now 0 = aa
    const letters: string[] = [];
    do {
      letters.unshift(alphabet[idx % 26]);
      idx = Math.floor(idx / 26) - 1;
    } while (idx >= 0);
    // Prefix with 'a' to make aa, ab format
    if (letters.length === 1) {
      suffix = 'a' + letters[0];
    } else {
      suffix = letters.join('');
    }
  }

  return value.toFixed(1).replace(/\.0$/, '') + suffix;
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
  const [upgradeCosts, setUpgradeCosts] = useState<UpgradeCosts>({ dmg: '0', def: '0', speed: '0', hp: '0', zen: '0' });
  const [upgradeMultiplier, setUpgradeMultiplier] = useState<1 | 5 | 10 | 100 | 'max'>(1);
  const [helperCosts, setHelperCosts] = useState<{ attacker: string; buffer: string }>({ attacker: '100000', buffer: '50000' });

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

  // Ascension panel visibility
  const [showAscensionPanel, setShowAscensionPanel] = useState(false);

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
            // Only send exp/zen per second if they're positive (don't overwrite with 0)
            exp_per_second: expPerSecond > 0 ? expPerSecond : undefined,
            zen_per_second: zenPerSecond > 0 ? zenPerSecond : undefined,
            update_heartbeat: updateHeartbeat,
          }),
        });
        console.log('Progress saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    };

    // Use sendBeacon for reliable saves on page close
    const saveProgressBeacon = () => {
      const data = {
        character_id: gameData.character.id,
        experience: gameData.character.experience,
        zen: gameData.character.zen,
        level: gameData.character.level,
        monsters_killed: localMonstersKilled,
        deaths: localDeaths,
        exp_per_second: expPerSecond > 0 ? expPerSecond : undefined,
        zen_per_second: zenPerSecond > 0 ? zenPerSecond : undefined,
        update_heartbeat: false,
      };
      navigator.sendBeacon('/api/game/progress', JSON.stringify(data));
    };

    const saveInterval = setInterval(saveProgress, 30000);

    // Also save on page unload using sendBeacon for reliability
    const handleBeforeUnload = () => {
      saveProgressBeacon();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Mobile: save on visibility change (when user switches apps or tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgressBeacon();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Mobile: save on page hide (iOS Safari)
    const handlePageHide = () => {
      saveProgressBeacon();
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
    let newZen = BigInt(gameData.character.zen) + zen;

    // Track EXP and Zen per second
    const now = Date.now();
    if (lastExpUpdate) {
      const timeDiff = (now - lastExpUpdate.time) / 1000;
      if (timeDiff > 0 && timeDiff < 10) {
        const expDiff = Number(newExp - lastExpUpdate.exp);
        const zenDiff = Number(newZen - lastExpUpdate.zen);
        const newExpPerSec = expDiff / timeDiff;
        const newZenPerSec = zenDiff / timeDiff;
        // Faster smoothing (50/50) for quicker convergence
        setExpPerSecond(prev => prev === 0 ? newExpPerSec : (prev * 0.5 + newExpPerSec * 0.5));
        setZenPerSecond(prev => prev === 0 ? newZenPerSec : (prev * 0.5 + newZenPerSec * 0.5));
      }
    }
    setLastExpUpdate({ exp: newExp, zen: newZen, time: now });

    // Check for level up (quadratic formula: level² × 3.75 exp needed)
    // Max level is 400
    const MAX_LEVEL = 400;
    let newLevel = gameData.character.level;
    let remainingExp = newExp;
    let levelsGained = 0;

    while (remainingExp >= BigInt(Math.floor(newLevel * newLevel * 3.75)) && newLevel < MAX_LEVEL) {
      remainingExp -= BigInt(Math.floor(newLevel * newLevel * 3.75));
      newLevel++;
      levelsGained++;
    }

    // At max level, cap experience at 0 (no more exp needed)
    if (newLevel >= MAX_LEVEL) {
      remainingExp = 0n;
    }

    // Add 50,000 zen per level gained
    if (levelsGained > 0) {
      newZen = newZen + BigInt(50000 * levelsGained);
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
    if (levelsGained > 0) {
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
            excellentChance: data.stats.excellentChance ?? 5,
            poisonChance: data.stats.poisonChance ?? 0,
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

  const handleUpgradeStat = async (statName: 'dmg' | 'def' | 'speed' | 'hp' | 'zen') => {
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
          zen: 'zenLevel',
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
            excellentChance: data.stats.excellentChance ?? gameData.stats.excellentChance,
            poisonChance: data.stats.poisonChance ?? gameData.stats.poisonChance,
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

  const handleUpgradeHelper = async (helperType: 'attacker' | 'buffer') => {
    if (!gameData) return;

    try {
      const response = await fetch('/api/character/helpers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
          helper_type: helperType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const fieldName = helperType === 'attacker' ? 'helperAttackerLevel' : 'helperBufferLevel';
        setGameData({
          ...gameData,
          character: {
            ...gameData.character,
            [fieldName]: data.newLevel,
            zen: data.zen,
          },
        });

        // Update helper costs
        setHelperCosts({
          ...helperCosts,
          [helperType]: data.nextUpgradeCost,
        });
      } else {
        console.error('Upgrade helper failed:', data.message);
      }
    } catch (err) {
      console.error('Upgrade helper failed:', err);
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

  const handleAscensionUpgrade = async (skill: string) => {
    if (!gameData || gameData.character.ascensionPoints <= 0) return;

    try {
      const response = await fetch('/api/character/ascension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
          skill,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Reload all game data to get updated stats
        await loadGameData();
      }
    } catch (err) {
      console.error('Ascension upgrade failed:', err);
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
  // Buffer helper bonus: +0.1% DMG per level
  const bufferBonus = character.helperBufferLevel * 0.1;

  const totalStats = {
    minDamage: Math.floor((stats.minDamage + (equipmentBonuses.damage_min || 0)) * (1 + bufferBonus / 100)),
    maxDamage: Math.floor((stats.maxDamage + (equipmentBonuses.damage_max || 0)) * (1 + bufferBonus / 100)),
    defense: stats.physicalDefense + (equipmentBonuses.defense || 0),
    attackSpeed: Math.min(350, stats.attackSpeed + (equipmentBonuses.attack_speed || 0)),
  };

  // EXP calculation helper (formula: level² × 3.75)
  const currentExp = BigInt(character.experience);
  const expNeeded = BigInt(Math.floor(character.level * character.level * 3.75));
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
              <button
                onClick={() => setShowAscensionPanel(true)}
                className="px-3 py-1 bg-purple-700 rounded hover:bg-purple-600 text-sm flex items-center gap-1"
              >
                ⭐ Ascension
                {character.ascensionPoints > 0 && (
                  <span className="bg-yellow-500 text-black text-xs px-1.5 rounded-full font-bold">
                    {character.ascensionPoints}
                  </span>
                )}
              </button>
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

            {/* Mobile Menu Button - hidden since menu is in bottom nav */}
            <div className="sm:hidden">
              {/* This space can show character name on mobile */}
              <span className="text-sm text-gray-400">{character.name}</span>
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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu Panel */}
          <div className="absolute bottom-16 left-0 right-0 bg-gray-800 border-t border-gray-700 rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            <div className="p-3 border-b border-gray-700">
              <div className="text-xs text-gray-400 font-medium">Navigation</div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              <Link
                href="/events"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 bg-orange-900/30 hover:bg-orange-700/40 rounded-xl transition-colors border border-orange-700/30"
              >
                <span className="text-2xl">🏰</span>
                <div>
                  <div className="font-medium text-orange-400">Events</div>
                  <div className="text-[10px] text-gray-400">BC & DS</div>
                </div>
              </Link>
              <Link
                href="/chaos-machine"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 bg-purple-900/30 hover:bg-purple-700/40 rounded-xl transition-colors border border-purple-700/30"
              >
                <span className="text-2xl">🔮</span>
                <div>
                  <div className="font-medium text-purple-400">Chaos</div>
                  <div className="text-[10px] text-gray-400">Crafting</div>
                </div>
              </Link>
              <Link
                href="/vault"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 bg-amber-900/30 hover:bg-amber-700/40 rounded-xl transition-colors border border-amber-700/30"
              >
                <span className="text-2xl">🏦</span>
                <div>
                  <div className="font-medium text-amber-400">Vault</div>
                  <div className="text-[10px] text-gray-400">Storage</div>
                </div>
              </Link>
              <Link
                href="/characters"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-colors border border-gray-600/30"
              >
                <span className="text-2xl">👤</span>
                <div>
                  <div className="font-medium">Characters</div>
                  <div className="text-[10px] text-gray-400">Heroes</div>
                </div>
              </Link>
              <Link
                href="/wiki"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-colors border border-gray-600/30"
              >
                <span className="text-2xl">📖</span>
                <div>
                  <div className="font-medium">Wiki</div>
                  <div className="text-[10px] text-gray-400">Guide</div>
                </div>
              </Link>
              <Link
                href="/ranking"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-colors border border-gray-600/30"
              >
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="font-medium">Ranking</div>
                  <div className="text-[10px] text-gray-400">Top 50</div>
                </div>
              </Link>
            </div>
            <div className="p-3 border-t border-gray-700">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: '/login' });
                }}
                className="flex items-center justify-center gap-2 w-full p-3 bg-red-900/30 hover:bg-red-700/40 rounded-xl transition-colors border border-red-700/30"
              >
                <span className="text-xl">🚪</span>
                <span className="font-medium text-red-400">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-700 safe-area-bottom">
        <div className="flex">
          {[
            { id: 'hunt', label: 'Hunt', icon: '⚔️' },
            { id: 'character', label: 'Stats', icon: '👤' },
            { id: 'inventory', label: 'Items', icon: '🎒' },
            { id: 'menu', label: 'Menu', icon: '☰' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'menu') {
                  setMobileMenuOpen(!mobileMenuOpen);
                } else {
                  setActiveTab(tab.id as typeof activeTab);
                  setMobileMenuOpen(false);
                }
              }}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
                tab.id === 'menu'
                  ? mobileMenuOpen
                    ? 'text-yellow-400 bg-gray-800'
                    : 'text-gray-400'
                  : activeTab === tab.id
                  ? 'text-yellow-400 bg-gray-800'
                  : 'text-gray-400'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-2 lg:p-4 pb-20 lg:pb-4">
        {/* Desktop Layout - Grid */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_1.4fr_1fr] gap-4">
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
                <span className="text-green-400">{formatNumber(BigInt(character.zen))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monsters Killed:</span>
                <span className="text-orange-400">{localMonstersKilled.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deaths:</span>
                <span className="text-red-400">{localDeaths.toLocaleString()}</span>
              </div>
              {character.resetCount > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <div className="text-xs text-yellow-400 font-semibold mb-1">Reset Bonuses ({character.resetCount}x)</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">EXP Bonus:</span>
                    <span className="text-purple-400">+{(character.resetCount * 0.1).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Zen Bonus:</span>
                    <span className="text-green-400">+{(character.resetCount * 0.1).toFixed(1)}%</span>
                  </div>
                </div>
              )}
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
                        <div><span className="text-yellow-400">Zen%:</span> +1% zen drop per level</div>
                        <div><span className="text-orange-400">Crit:</span> 5% base + 1% per 50 levels</div>
                        <div className="text-gray-400 mt-1 text-xs">Cost: 50 × level^1.5 zen</div>
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
                { key: 'dmg' as const, label: 'DMG', value: character.dmgLevel, color: 'text-red-400', icon: '⚔️' },
                { key: 'def' as const, label: 'DEF', value: character.defLevel, color: 'text-blue-400', icon: '🛡️' },
                { key: 'speed' as const, label: 'Speed', value: character.speedLevel, color: 'text-cyan-400', icon: '💨' },
                { key: 'hp' as const, label: 'HP', value: character.hpLevel, color: 'text-green-400', icon: '❤️' },
                { key: 'zen' as const, label: 'Zen%', value: character.zenLevel, color: 'text-yellow-400', icon: '💰' },
              ].map(({ key, label, value, color, icon }) => {
                const zen = BigInt(character.zen);
                const amount = upgradeMultiplier === 'max'
                  ? calculateMaxUpgrades(value, zen)
                  : upgradeMultiplier;
                const cost = amount > 0 ? calculateUpgradeCost(value, amount) : 0n;
                const isSpeedMaxed = key === 'speed' && totalStats.attackSpeed >= 350;
                const canAfford = amount > 0 && zen >= cost && !isSpeedMaxed;

                return (
                  <div key={key} className="flex justify-between items-center text-xs mb-1.5 bg-gray-800/60 rounded-lg px-3 py-1.5 border border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <span className={`${color} font-bold w-12`}>{label}</span>
                      <span className="text-white font-mono bg-gray-700/50 px-1.5 py-0.5 rounded text-[11px]">Lv.{value}</span>
                      {isSpeedMaxed && <span className="text-green-400 text-[10px]">(MAX)</span>}
                    </div>
                    <button
                      onClick={() => handleUpgradeStat(key)}
                      disabled={!canAfford}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 ${
                        canAfford
                          ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-sm shadow-green-500/20'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isSpeedMaxed ? 'MAX' : amount > 0 ? `${formatNumber(cost)}` : 'Max'}
                    </button>
                  </div>
                );
              })}
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
                      <div><span className="text-cyan-400">ATK Speed:</span> Speed level + weapon (max 350)</div>
                      <div><span className="text-green-400">Max HP:</span> 50 + HP level × 10</div>
                      <div><span className="text-orange-400">Crit:</span> 5% base + 1% per 50 levels + equipment</div>
                    </div>
                  }
                />
              </h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div><span className="text-gray-500">Attack:</span><span className="ml-1 text-red-400">{totalStats.minDamage}-{totalStats.maxDamage}</span></div>
                <div><span className="text-gray-500">Defense:</span><span className="ml-1 text-blue-400">{totalStats.defense}</span></div>
                <div><span className="text-gray-500">HP:</span><span className="ml-1 text-green-400">{stats.maxHp}</span></div>
                <div><span className="text-gray-500">Crit:</span><span className="ml-1 text-yellow-400">{stats.criticalRate}%</span></div>
                <div><span className="text-gray-500">ATK Speed:</span><span className="ml-1 text-cyan-400">{totalStats.attackSpeed}{totalStats.attackSpeed >= 350 && <span className="text-green-400 ml-1">(max)</span>}</span></div>
              </div>
            </div>

            {/* Crafting Materials - Desktop */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                Crafting Materials
                <InfoTooltip
                  color="purple"
                  content={
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-purple-400 mb-1">Drop Rates (Lv41+ mobs):</div>
                      <div><span className="text-purple-300">💎 Bless:</span> 0.8%</div>
                      <div><span className="text-pink-400">💎 Soul:</span> 0.8%</div>
                      <div><span className="text-orange-400">💎 Life:</span> 0.8%</div>
                      <div><span className="text-yellow-400">💎 Chaos:</span> 0.4%</div>
                      <div><span className="text-cyan-400">📜 Scroll:</span> 0.8%</div>
                      <div><span className="text-red-400">🦴 Bone:</span> 0.8%</div>
                      <div><span className="text-amber-400">🗝️ Key:</span> 0.8%</div>
                      <div><span className="text-green-400">👁️ Eye:</span> 0.8%</div>
                      <div className="pt-1 border-t border-gray-600">
                        <span className="text-emerald-400">🪶 Feather:</span> 0.1% (Lv81+)
                      </div>
                    </div>
                  }
                />
              </h3>
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
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
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
              zenBonus={character.zenLevel}
              resetCount={character.resetCount}
              burstCooldownEnd={character.burstCooldownEnd}
              excellentChance={stats.excellentChance}
              poisonChance={stats.poisonChance}
              helperAttackerLevel={character.helperAttackerLevel}
              helperBufferLevel={character.helperBufferLevel}
              helperAttackerDamage={5 + character.helperAttackerLevel * 2}
              helperBufferBonus={character.helperBufferLevel * 0.1}
              onHpChange={handleHpChange}
              onExpGain={handleExpGain}
              onItemDrop={handleItemDrop}
              onJewelDrop={handleJewelDrop}
              onDeath={handleDeath}
              onMonsterKill={handleMonsterKill}
            />

            {/* Helpers - Desktop */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                🤖 Helpers
                <InfoTooltip
                  color="yellow"
                  content={
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-yellow-400 mb-1">Helpers assist you in hunting:</div>
                      <div><span className="text-amber-400">Attacker:</span> Deals DMG 2x per second</div>
                      <div><span className="text-emerald-400">Buffer:</span> Increases your DMG by 0.1% per level (max 10%)</div>
                    </div>
                  }
                />
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Attacker Helper */}
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⚔️</span>
                    <div>
                      <div className="text-amber-400 font-bold">Attacker</div>
                      <div className="text-xs text-gray-400">Level {character.helperAttackerLevel}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-300 mb-2">
                    DMG: <span className="text-amber-400 font-bold">{5 + character.helperAttackerLevel * 2}</span> (2x/sec)
                  </div>
                  <button
                    onClick={() => handleUpgradeHelper('attacker')}
                    disabled={BigInt(character.zen) < calculateHelperUpgradeCost(character.helperAttackerLevel, 'attacker')}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      BigInt(character.zen) >= calculateHelperUpgradeCost(character.helperAttackerLevel, 'attacker')
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Upgrade: {formatNumber(calculateHelperUpgradeCost(character.helperAttackerLevel, 'attacker'))}
                  </button>
                </div>
                {/* Buffer Helper */}
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">✨</span>
                    <div>
                      <div className="text-emerald-400 font-bold">Buffer</div>
                      <div className="text-xs text-gray-400">Level {character.helperBufferLevel}/100</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-300 mb-2">
                    Bonus: <span className="text-emerald-400 font-bold">+{(character.helperBufferLevel * 0.1).toFixed(1)}%</span> DMG
                  </div>
                  <button
                    onClick={() => handleUpgradeHelper('buffer')}
                    disabled={character.helperBufferLevel >= 100 || BigInt(character.zen) < calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer')}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      character.helperBufferLevel < 100 && BigInt(character.zen) >= calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer')
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {character.helperBufferLevel >= 100 ? 'MAX LEVEL' : `Upgrade: ${formatNumber(calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer'))}`}
                  </button>
                </div>
              </div>
            </div>
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

          {/* Inventory + Crafting - Desktop */}
          <div className="lg:col-span-3 flex gap-4">
            {/* Inventory */}
            <div className={`bg-gray-800/50 rounded-lg p-4 border border-gray-700 ${craftingItem ? 'flex-1' : 'w-full'}`}>
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

            {/* Crafting Panel - Desktop Inline */}
            {craftingItem && (
              <div className="w-72 flex-shrink-0">
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

        </div>

        {/* Ascension Skill Tree Modal */}
        {showAscensionPanel && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowAscensionPanel(false)}>
            <div
              className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-2 border-purple-600/50 shadow-2xl shadow-purple-900/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-900/90 via-purple-800/90 to-purple-900/90 backdrop-blur p-4 border-b border-purple-500/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <h2 className="text-2xl font-bold text-purple-300">Ascension Tree</h2>
                    <p className="text-sm text-purple-400/70">Unlock powerful bonuses with reset points</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-purple-600/30 rounded-full px-4 py-2 border border-purple-500/50">
                    <span className="text-purple-300 text-sm">Available Points:</span>
                    <span className="ml-2 text-2xl font-bold text-yellow-400">{character.ascensionPoints}</span>
                  </div>
                  <button
                    onClick={() => setShowAscensionPanel(false)}
                    className="w-10 h-10 rounded-full bg-gray-700/50 hover:bg-red-600/50 transition-colors flex items-center justify-center text-xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Skill Tree Content */}
              <div className="p-6">
                {/* Info Banner */}
                <div className="mb-6 p-3 bg-purple-900/30 rounded-lg border border-purple-500/30 text-center">
                  <span className="text-purple-300 text-sm">
                    Earn <span className="text-yellow-400 font-bold">+1 Ascension Point</span> each time you reset at level 400
                  </span>
                </div>

                {/* Skill Tree Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'damage', label: 'Damage Mastery', value: character.ascDamage, bonus: '+2%', desc: 'Increases all damage dealt', color: 'from-red-600 to-red-800', borderColor: 'border-red-500', icon: '⚔️', total: `${(character.ascDamage * 2)}% DMG` },
                    { key: 'critical', label: 'Critical Eye', value: character.ascCritical, bonus: '+1%', desc: 'Increases critical hit chance', color: 'from-yellow-600 to-orange-700', borderColor: 'border-yellow-500', icon: '💥', total: `${character.ascCritical}% Crit` },
                    { key: 'health', label: 'Vitality', value: character.ascHealth, bonus: '+5%', desc: 'Increases maximum HP', color: 'from-green-600 to-emerald-800', borderColor: 'border-green-500', icon: '❤️', total: `${(character.ascHealth * 5)}% HP` },
                    { key: 'lifeSteal', label: 'Vampirism', value: character.ascLifeSteal, bonus: '+0.5%', desc: 'Steal HP on each hit', color: 'from-pink-600 to-rose-800', borderColor: 'border-pink-500', icon: '🩸', total: `${(character.ascLifeSteal * 0.5).toFixed(1)}% LS` },
                    { key: 'zen', label: 'Wealth', value: character.ascZen, bonus: '+3%', desc: 'Increases zen drops', color: 'from-amber-500 to-yellow-700', borderColor: 'border-amber-400', icon: '💰', total: `${(character.ascZen * 3)}% Zen` },
                    { key: 'exp', label: 'Wisdom', value: character.ascExp, bonus: '+2%', desc: 'Increases experience gain', color: 'from-cyan-500 to-blue-700', borderColor: 'border-cyan-400', icon: '📈', total: `${(character.ascExp * 2)}% EXP` },
                    { key: 'poison', label: 'Venom Strike', value: character.ascPoison, bonus: '+0.5%', desc: 'Chance to poison (10% current HP)', color: 'from-lime-600 to-green-900', borderColor: 'border-lime-500', icon: '🧪', total: `${(character.ascPoison * 0.5).toFixed(1)}% chance` },
                    { key: 'excellent', label: 'Excellence', value: character.ascExcellent, bonus: '+0.25%', desc: 'Chance for excellent damage (2x)', color: 'from-indigo-500 to-violet-800', borderColor: 'border-indigo-400', icon: '✨', total: `${(character.ascExcellent * 0.25).toFixed(2)}% chance` },
                  ].map(({ key, label, value, bonus, desc, color, borderColor, icon, total }) => (
                    <div
                      key={key}
                      className={`relative bg-gradient-to-b ${color} rounded-xl border-2 ${borderColor} p-4 transform transition-all hover:scale-105 hover:shadow-lg`}
                    >
                      {/* Level Badge */}
                      <div className="absolute -top-2 -right-2 bg-gray-900 border-2 border-gray-600 rounded-full w-8 h-8 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{value}</span>
                      </div>

                      {/* Icon */}
                      <div className="text-4xl mb-2 text-center">{icon}</div>

                      {/* Title */}
                      <h3 className="text-white font-bold text-center text-sm mb-1">{label}</h3>

                      {/* Bonus per point */}
                      <div className="text-center text-xs text-white/70 mb-2">{bonus} per point</div>

                      {/* Total bonus */}
                      <div className="bg-black/30 rounded-lg py-1 px-2 text-center mb-3">
                        <span className="text-white font-mono text-sm">{total}</span>
                      </div>

                      {/* Description */}
                      <p className="text-white/60 text-xs text-center mb-3">{desc}</p>

                      {/* Upgrade Button */}
                      <button
                        onClick={() => handleAscensionUpgrade(key)}
                        disabled={character.ascensionPoints <= 0}
                        className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${
                          character.ascensionPoints > 0
                            ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
                        }`}
                      >
                        {character.ascensionPoints > 0 ? '+ Upgrade' : 'No Points'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Reset Info */}
                <div className="mt-6 text-center">
                  <p className="text-gray-500 text-sm">
                    Total Resets: <span className="text-purple-400 font-bold">{character.resetCount}</span>
                    {character.level < 400 && (
                      <span className="ml-2 text-gray-600">
                        (Next reset at level 400 - currently {character.level})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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
                zenBonus={character.zenLevel}
                resetCount={character.resetCount}
                burstCooldownEnd={character.burstCooldownEnd}
                excellentChance={stats.excellentChance}
                poisonChance={stats.poisonChance}
                helperAttackerLevel={character.helperAttackerLevel}
                helperBufferLevel={character.helperBufferLevel}
                helperAttackerDamage={5 + character.helperAttackerLevel * 2}
                helperBufferBonus={character.helperBufferLevel * 0.1}
                onHpChange={handleHpChange}
                onExpGain={handleExpGain}
                onItemDrop={handleItemDrop}
                onJewelDrop={handleJewelDrop}
                onDeath={handleDeath}
                onMonsterKill={handleMonsterKill}
              />
            </div>

            {/* Upgrade Stats - Mobile (in Hunt tab) */}
            <div className="mt-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-yellow-400 flex items-center gap-1">
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
                        <div><span className="text-yellow-400">Zen%:</span> +1% zen drop per level</div>
                        <div><span className="text-orange-400">Crit:</span> 5% base + 1% per 50 levels</div>
                        <div className="text-gray-400 mt-1 text-xs">Cost: 50 × level^1.5 zen</div>
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
                { key: 'dmg' as const, label: 'DMG', value: character.dmgLevel, color: 'text-red-400', icon: '⚔️' },
                { key: 'def' as const, label: 'DEF', value: character.defLevel, color: 'text-blue-400', icon: '🛡️' },
                { key: 'speed' as const, label: 'Speed', value: character.speedLevel, color: 'text-cyan-400', icon: '💨' },
                { key: 'hp' as const, label: 'HP', value: character.hpLevel, color: 'text-green-400', icon: '❤️' },
                { key: 'zen' as const, label: 'Zen%', value: character.zenLevel, color: 'text-yellow-400', icon: '💰' },
              ].map(({ key, label, value, color, icon }) => {
                const zen = BigInt(character.zen);
                const amount = upgradeMultiplier === 'max'
                  ? calculateMaxUpgrades(value, zen)
                  : upgradeMultiplier;
                const cost = amount > 0 ? calculateUpgradeCost(value, amount) : 0n;
                const isSpeedMaxed = key === 'speed' && totalStats.attackSpeed >= 350;
                const canAfford = amount > 0 && zen >= cost && !isSpeedMaxed;

                return (
                  <div key={key} className="flex justify-between items-center py-2 bg-gray-800/60 rounded-lg px-3 mb-1.5 border border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <span className={`${color} font-bold w-14`}>{label}</span>
                      <span className="text-white font-mono text-sm bg-gray-700/50 px-2 py-0.5 rounded">Lv.{value}</span>
                      {isSpeedMaxed && <span className="text-green-400 text-xs">(MAX)</span>}
                    </div>
                    <button
                      onClick={() => handleUpgradeStat(key)}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all transform active:scale-95 ${
                        canAfford
                          ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-md shadow-green-500/20'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isSpeedMaxed ? 'MAX' : amount > 0 ? `${formatNumber(cost)}` : 'Max'}
                    </button>
                  </div>
                );
              })}

              {/* Helpers - Mobile */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 mb-2">🤖 Helpers</h3>
                <div className="space-y-2">
                  {/* Attacker Helper */}
                  <div className="flex justify-between items-center text-xs bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚔️</span>
                      <div>
                        <span className="text-amber-400 font-bold">Attacker</span>
                        <span className="text-gray-400 ml-2">Lv.{character.helperAttackerLevel}</span>
                        <div className="text-[10px] text-gray-500">
                          DMG: {5 + character.helperAttackerLevel * 2} (2x/sec)
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpgradeHelper('attacker')}
                      disabled={BigInt(character.zen) < calculateHelperUpgradeCost(character.helperAttackerLevel, 'attacker')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        BigInt(character.zen) >= calculateHelperUpgradeCost(character.helperAttackerLevel, 'attacker')
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {formatNumber(calculateHelperUpgradeCost(character.helperAttackerLevel, 'attacker'))}
                    </button>
                  </div>
                  {/* Buffer Helper */}
                  <div className="flex justify-between items-center text-xs bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      <div>
                        <span className="text-emerald-400 font-bold">Buffer</span>
                        <span className="text-gray-400 ml-2">Lv.{character.helperBufferLevel}/100</span>
                        <div className="text-[10px] text-gray-500">
                          +{(character.helperBufferLevel * 0.1).toFixed(1)}% DMG
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpgradeHelper('buffer')}
                      disabled={character.helperBufferLevel >= 100 || BigInt(character.zen) < calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        character.helperBufferLevel < 100 && BigInt(character.zen) >= calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer')
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {character.helperBufferLevel >= 100 ? 'MAX' : formatNumber(calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer'))}
                    </button>
                  </div>
                </div>
              </div>

              {/* Combat Stats - Mobile */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 mb-2">Combat Stats</h3>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <div className="bg-gray-800/60 rounded px-2 py-1.5 text-center">
                    <div className="text-red-400 font-bold">{totalStats.minDamage}-{totalStats.maxDamage}</div>
                    <div className="text-gray-500 text-[10px]">Attack</div>
                  </div>
                  <div className="bg-gray-800/60 rounded px-2 py-1.5 text-center">
                    <div className="text-blue-400 font-bold">{totalStats.defense}</div>
                    <div className="text-gray-500 text-[10px]">Defense</div>
                  </div>
                  <div className="bg-gray-800/60 rounded px-2 py-1.5 text-center">
                    <div className="text-green-400 font-bold">{stats.maxHp}</div>
                    <div className="text-gray-500 text-[10px]">HP</div>
                  </div>
                  <div className="bg-gray-800/60 rounded px-2 py-1.5 text-center">
                    <div className="text-yellow-400 font-bold">{stats.criticalRate}%</div>
                    <div className="text-gray-500 text-[10px]">Crit</div>
                  </div>
                  <div className="bg-gray-800/60 rounded px-2 py-1.5 text-center col-span-2">
                    <div className="text-cyan-400 font-bold">{totalStats.attackSpeed}{totalStats.attackSpeed >= 350 && <span className="text-green-400 ml-1">(max)</span>}</div>
                    <div className="text-gray-500 text-[10px]">ATK Speed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Crafting Materials - Mobile */}
            <div className="mt-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-1">
                Crafting Materials
                <InfoTooltip
                  color="purple"
                  content={
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-purple-400 mb-1">Drop Rates (Lv41+ mobs):</div>
                      <div><span className="text-purple-300">💎 Bless:</span> 0.8%</div>
                      <div><span className="text-pink-400">💎 Soul:</span> 0.8%</div>
                      <div><span className="text-orange-400">💎 Life:</span> 0.8%</div>
                      <div><span className="text-yellow-400">💎 Chaos:</span> 0.4%</div>
                      <div><span className="text-cyan-400">📜 Scroll:</span> 0.8%</div>
                      <div><span className="text-red-400">🦴 Bone:</span> 0.8%</div>
                      <div><span className="text-amber-400">🗝️ Key:</span> 0.8%</div>
                      <div><span className="text-green-400">👁️ Eye:</span> 0.8%</div>
                      <div className="pt-1 border-t border-gray-600">
                        <span className="text-emerald-400">🪶 Feather:</span> 0.1% (Lv81+)
                      </div>
                    </div>
                  }
                />
              </h3>
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
                    <div className="text-green-400 font-bold">{formatNumber(BigInt(character.zen))}</div>
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

                {/* Reset Bonuses */}
                {character.resetCount > 0 && (
                  <div className="mt-2 bg-yellow-900/20 rounded p-2 border border-yellow-700/30">
                    <div className="text-xs text-yellow-400 font-semibold mb-1">Reset Bonuses ({character.resetCount}x)</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">EXP:</span>
                        <span className="text-purple-400">+{(character.resetCount * 0.1).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Zen:</span>
                        <span className="text-green-400">+{(character.resetCount * 0.1).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reset Character Button (when level 400) */}
                {character.level >= 400 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <button
                      onClick={handleReset}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded text-lg font-bold animate-pulse"
                    >
                      ⭐ RESET CHARACTER ⭐
                    </button>
                  </div>
                )}

                {/* Ascension Skill Tree */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                    ⭐ Ascension Skills
                    <InfoTooltip
                      color="purple"
                      content={
                        <div className="space-y-1">
                          <div className="font-bold text-purple-400 mb-1">Ascension Bonuses:</div>
                          <div><span className="text-red-400">Damage:</span> +2% DMG per point</div>
                          <div><span className="text-yellow-400">Critical:</span> +1% Crit per point</div>
                          <div><span className="text-green-400">Health:</span> +5% HP per point</div>
                          <div><span className="text-pink-400">Life Steal:</span> +0.5% LS per point</div>
                          <div><span className="text-amber-400">Zen:</span> +3% Zen per point</div>
                          <div><span className="text-cyan-400">Experience:</span> +2% EXP per point</div>
                          <div><span className="text-lime-400">Poison:</span> +0.5% chance (10% HP dmg)</div>
                          <div><span className="text-indigo-400">Excellent:</span> +0.25% chance (2x dmg)</div>
                          <div className="text-gray-400 mt-1 text-xs">+1 point per reset</div>
                        </div>
                      }
                    />
                    <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">
                      {character.ascensionPoints} pts
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: 'damage', label: 'Damage', value: character.ascDamage, bonus: '+2% DMG', color: 'text-red-400', icon: '⚔️' },
                      { key: 'critical', label: 'Critical', value: character.ascCritical, bonus: '+1% Crit', color: 'text-yellow-400', icon: '💥' },
                      { key: 'health', label: 'Health', value: character.ascHealth, bonus: '+5% HP', color: 'text-green-400', icon: '❤️' },
                      { key: 'lifeSteal', label: 'Life Steal', value: character.ascLifeSteal, bonus: '+0.5% LS', color: 'text-pink-400', icon: '🩸' },
                      { key: 'zen', label: 'Zen', value: character.ascZen, bonus: '+3% Zen', color: 'text-amber-400', icon: '💰' },
                      { key: 'exp', label: 'Experience', value: character.ascExp, bonus: '+2% EXP', color: 'text-cyan-400', icon: '📈' },
                      { key: 'poison', label: 'Poison', value: character.ascPoison, bonus: '+0.5%', color: 'text-lime-400', icon: '🧪' },
                      { key: 'excellent', label: 'Excellent', value: character.ascExcellent, bonus: '+0.25%', color: 'text-indigo-400', icon: '✨' },
                    ].map(({ key, label, value, bonus, color, icon }) => (
                      <div key={key} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700/50">
                        <div className="flex items-center gap-2">
                          <span>{icon}</span>
                          <div>
                            <span className={`${color} font-medium text-sm`}>{label}</span>
                            <span className="text-gray-500 text-xs ml-2">{bonus}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono bg-gray-700/50 px-2 py-0.5 rounded text-sm">{value}</span>
                          <button
                            onClick={() => handleAscensionUpgrade(key)}
                            disabled={character.ascensionPoints <= 0}
                            className={`w-8 h-8 rounded-lg text-lg font-bold transition-all transform active:scale-95 ${
                              character.ascensionPoints > 0
                                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {character.ascensionPoints === 0 && character.resetCount === 0 && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Resetuj postać (lvl 400) aby zdobyć punkty ascension
                    </p>
                  )}
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
                    +{formatNumber(offlineRewards.zen)} Zen
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-4">
                (5% of normal production, max 8h)
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
