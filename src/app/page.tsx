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
  bufferActiveUntil: string | null;
  bufferCooldownEnd: string | null;
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

  // Track pending quest progress (kills and exp since last save)
  const pendingKillsRef = useRef(0);
  const pendingExpRef = useRef(0);

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'hunt' | 'character' | 'inventory'>('hunt');

  // Mobile menu dropdown
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ascension panel visibility
  const [showAscensionPanel, setShowAscensionPanel] = useState(false);

  // Daily Quests panel visibility
  const [showQuestsPanel, setShowQuestsPanel] = useState(false);
  const [quests, setQuests] = useState<Array<{
    id: string;
    name: string;
    description: string;
    target: number;
    type: string;
    rewards: { zen?: number; jewelOfBless?: number; jewelOfSoul?: number; jewelOfLife?: number; jewelOfChaos?: number; bloodCastleTicket?: number; devilSquareTicket?: number };
    icon: string;
    color: string;
    progress: number;
    completed: boolean;
    claimed: boolean;
  }>>([]);

  // Achievements panel visibility
  const [showAchievementsPanel, setShowAchievementsPanel] = useState(false);
  const [achievements, setAchievements] = useState<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    requirement: { type: string; value: number };
    rewards: { zen?: number; jewelOfBless?: number; jewelOfSoul?: number; jewelOfLife?: number; jewelOfChaos?: number };
    icon: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    currentValue: number;
    unlocked: boolean;
    claimed: boolean;
  }>>([]);

  // Endless Tower
  const [showTowerPanel, setShowTowerPanel] = useState(false);
  const [towerState, setTowerState] = useState<{
    floor: number;
    maxFloor: number;
    entriesToday: number;
    maxEntries: number;
    inProgress: boolean;
    monster: { name: string; emoji: string; hp: number; minDamage: number; maxDamage: number; exp: number; zen: number } | null;
    monsterCurrentHp: number;
    playerCurrentHp: number;
    isRunning: boolean;
    floatingDamages: { id: number; damage: number; type: 'player' | 'monster' | 'heal'; x: number; y: number }[];
    lastRewards: { exp: number; zen: number } | null;
  }>({
    floor: 1,
    maxFloor: 0,
    entriesToday: 0,
    maxEntries: 2,
    inProgress: false,
    monster: null,
    monsterCurrentHp: 0,
    playerCurrentHp: 0,
    isRunning: false,
    floatingDamages: [],
    lastRewards: null,
  });
  const towerDamageIdRef = useRef(0);
  const towerCombatRef = useRef<NodeJS.Timeout | null>(null);

  // Buffer cooldown and active timers
  const [bufferCooldownRemaining, setBufferCooldownRemaining] = useState(0);
  const [bufferActiveRemaining, setBufferActiveRemaining] = useState(0);

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
        // Capture pending quest data before reset
        const killsToSend = pendingKillsRef.current;
        const expToSend = pendingExpRef.current;

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
            // Quest tracking
            kills_gained: killsToSend,
            exp_gained: expToSend,
          }),
        });

        // Reset pending quest data after successful save
        pendingKillsRef.current = 0;
        pendingExpRef.current = 0;

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
        // Quest tracking
        kills_gained: pendingKillsRef.current,
        exp_gained: pendingExpRef.current,
      };
      navigator.sendBeacon('/api/game/progress', JSON.stringify(data));
      // Reset pending quest data
      pendingKillsRef.current = 0;
      pendingExpRef.current = 0;
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

  // Buffer cooldown and active timer
  useEffect(() => {
    if (!gameData) return;

    const updateBufferTimers = () => {
      const now = Date.now();

      // Update cooldown remaining
      if (gameData.character.bufferCooldownEnd) {
        const cooldownEnd = new Date(gameData.character.bufferCooldownEnd).getTime();
        const remaining = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));
        setBufferCooldownRemaining(remaining);
      } else {
        setBufferCooldownRemaining(0);
      }

      // Update active remaining
      if (gameData.character.bufferActiveUntil) {
        const activeEnd = new Date(gameData.character.bufferActiveUntil).getTime();
        const remaining = Math.max(0, Math.ceil((activeEnd - now) / 1000));
        setBufferActiveRemaining(remaining);
      } else {
        setBufferActiveRemaining(0);
      }
    };

    // Update immediately
    updateBufferTimers();

    // Update every second
    const interval = setInterval(updateBufferTimers, 1000);

    return () => clearInterval(interval);
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

    // Track exp for quests
    pendingExpRef.current += Number(exp);

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

    // Check for level up (quadratic formula: level² × 2.8125 exp needed - reduced 25%)
    // Max level is 400
    const MAX_LEVEL = 400;
    let newLevel = gameData.character.level;
    let remainingExp = newExp;
    let levelsGained = 0;

    while (remainingExp >= BigInt(Math.floor(newLevel * newLevel * 2.8125)) && newLevel < MAX_LEVEL) {
      remainingExp -= BigInt(Math.floor(newLevel * newLevel * 2.8125));
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
    pendingKillsRef.current += 1;
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

  const handleActivateBuffer = async () => {
    if (!gameData) return;

    try {
      const response = await fetch('/api/character/helpers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character.id,
          action: 'activate_buffer',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setGameData({
          ...gameData,
          character: {
            ...gameData.character,
            bufferActiveUntil: data.activeUntil,
            bufferCooldownEnd: data.cooldownEnd,
          },
        });
      } else {
        console.error('Activate buffer failed:', data.message);
      }
    } catch (err) {
      console.error('Activate buffer failed:', err);
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

  // Load daily quests
  const loadQuests = useCallback(async () => {
    if (!gameData) return;
    try {
      const response = await fetch(`/api/quests?characterId=${gameData.character.id}`);
      const data = await response.json();
      if (data.success) {
        setQuests(data.quests);
      }
    } catch (err) {
      console.error('Failed to load quests:', err);
    }
  }, [gameData]);

  // Claim quest reward
  const handleClaimQuest = async (questId: string) => {
    if (!gameData) return;
    try {
      const response = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: gameData.character.id,
          questId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        showInfo({ title: 'Quest Complete!', message: data.message, color: 'green' });
        await loadQuests();
        await loadGameData(); // Reload to get updated jewels/zen
      } else {
        showInfo({ title: 'Error', message: data.error || 'Failed to claim quest', color: 'red' });
      }
    } catch (err) {
      console.error('Failed to claim quest:', err);
    }
  };

  // Load achievements
  const loadAchievements = useCallback(async () => {
    if (!gameData) return;
    try {
      const response = await fetch(`/api/achievements?characterId=${gameData.character.id}`);
      const data = await response.json();
      if (data.success) {
        setAchievements(data.achievements);
      }
    } catch (err) {
      console.error('Failed to load achievements:', err);
    }
  }, [gameData]);

  // Claim achievement reward
  const handleClaimAchievement = async (achievementId: string) => {
    if (!gameData) return;
    try {
      const response = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: gameData.character.id,
          achievementId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        showInfo({ title: 'Achievement Claimed!', message: data.message, color: 'green' });
        await loadAchievements();
        await loadGameData();
      } else {
        showInfo({ title: 'Error', message: data.error || 'Failed to claim achievement', color: 'red' });
      }
    } catch (err) {
      console.error('Failed to claim achievement:', err);
    }
  };

  // Load achievements when panel opens
  useEffect(() => {
    if (showAchievementsPanel && gameData) {
      loadAchievements();
    }
  }, [showAchievementsPanel, gameData, loadAchievements]);

  // Endless Tower functions
  const loadTowerStatus = useCallback(async () => {
    if (!gameData) return;
    try {
      const response = await fetch(`/api/endless-tower?characterId=${gameData.character.id}`);
      const data = await response.json();
      if (data.success) {
        setTowerState(prev => ({
          ...prev,
          floor: data.currentFloor,
          maxFloor: data.maxFloor,
          entriesToday: data.entriesToday,
          maxEntries: data.maxEntries,
          inProgress: data.inProgress,
        }));
      }
    } catch (err) {
      console.error('Failed to load tower status:', err);
    }
  }, [gameData]);

  const startTowerRun = async () => {
    if (!gameData) return;
    try {
      const response = await fetch('/api/endless-tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: gameData.character.id, action: 'start' }),
      });
      const data = await response.json();
      if (data.success) {
        setTowerState(prev => ({
          ...prev,
          floor: data.floor,
          inProgress: true,
          monster: data.monster,
          monsterCurrentHp: data.monster.hp,
          playerCurrentHp: currentHp,
          isRunning: true,
          entriesToday: prev.maxEntries - data.entriesRemaining,
        }));
      } else {
        showInfo({ title: 'Error', message: data.error || 'Failed to start tower', color: 'red' });
      }
    } catch (err) {
      console.error('Failed to start tower:', err);
    }
  };

  const addTowerFloatingDamage = useCallback((damage: number, type: 'player' | 'monster' | 'heal') => {
    towerDamageIdRef.current += 1;
    const x = type === 'monster' ? 30 + Math.random() * 40 : 30 + Math.random() * 40;
    const y = type === 'monster' ? 20 + Math.random() * 20 : 55 + Math.random() * 20;

    const newDamage = { id: towerDamageIdRef.current, damage, type, x, y };
    setTowerState(prev => ({
      ...prev,
      floatingDamages: [...prev.floatingDamages, newDamage],
    }));

    setTimeout(() => {
      setTowerState(prev => ({
        ...prev,
        floatingDamages: prev.floatingDamages.filter(d => d.id !== newDamage.id),
      }));
    }, 1000);
  }, []);

  const performTowerCombat = useCallback(async () => {
    if (!gameData || !towerState.monster || !towerState.isRunning) return;

    const { monster, monsterCurrentHp, playerCurrentHp } = towerState;
    const { character, stats } = gameData;

    // Calculate combat stats inline
    const isBufferActive = character.bufferActiveUntil
      ? new Date(character.bufferActiveUntil) > new Date()
      : false;
    const bufferBonus = isBufferActive ? character.helperBufferLevel * 0.1 : 0;
    const combatStats = {
      minDamage: Math.floor((stats.minDamage + (equipmentBonuses.damage_min || 0)) * (1 + bufferBonus / 100)),
      maxDamage: Math.floor((stats.maxDamage + (equipmentBonuses.damage_max || 0)) * (1 + bufferBonus / 100)),
      defense: Math.floor((stats.physicalDefense + (equipmentBonuses.defense || 0)) * (1 + bufferBonus / 100)),
    };

    // Player attacks
    const playerDamage = Math.floor(Math.random() * (combatStats.maxDamage - combatStats.minDamage + 1)) + combatStats.minDamage;
    const newMonsterHp = Math.max(0, monsterCurrentHp - playerDamage);
    addTowerFloatingDamage(playerDamage, 'player');

    // Monster defeated
    if (newMonsterHp <= 0) {
      // Complete floor
      try {
        const response = await fetch('/api/endless-tower', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: gameData.character.id, action: 'complete_floor' }),
        });
        const data = await response.json();
        if (data.success) {
          // Heal 10% HP between floors
          const healAmount = Math.floor(stats.maxHp * 0.1);
          const newPlayerHp = Math.min(stats.maxHp, playerCurrentHp + healAmount);
          handleHpChange(newPlayerHp);

          setTowerState(prev => ({
            ...prev,
            floor: data.nextFloor,
            monster: data.nextMonster,
            monsterCurrentHp: data.nextMonster.hp,
            playerCurrentHp: newPlayerHp,
            maxFloor: data.newMaxFloor || prev.maxFloor,
            lastRewards: data.rewards,
          }));
        }
      } catch (err) {
        console.error('Failed to complete floor:', err);
      }
      return;
    }

    // Monster attacks back
    const monsterDamage = Math.max(1, Math.floor(
      Math.random() * (monster.maxDamage - monster.minDamage + 1) + monster.minDamage
    ) - Math.floor(combatStats.defense / 4));
    const newPlayerHp = Math.max(0, playerCurrentHp - monsterDamage);
    addTowerFloatingDamage(monsterDamage, 'monster');

    setTowerState(prev => ({
      ...prev,
      monsterCurrentHp: newMonsterHp,
      playerCurrentHp: newPlayerHp,
    }));
    handleHpChange(newPlayerHp);

    // Player defeated
    if (newPlayerHp <= 0) {
      if (towerCombatRef.current) {
        clearInterval(towerCombatRef.current);
        towerCombatRef.current = null;
      }

      try {
        const response = await fetch('/api/endless-tower', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: gameData.character.id, action: 'defeat' }),
        });
        const data = await response.json();
        if (data.success) {
          setTowerState(prev => ({
            ...prev,
            isRunning: false,
            inProgress: false,
            monster: null,
            entriesToday: prev.maxEntries - data.entriesRemaining,
          }));
          showInfo({
            title: 'Defeated!',
            message: `You reached floor ${data.finalFloor}. Your max floor: ${data.maxFloor}`,
            color: 'red',
          });
        }
      } catch (err) {
        console.error('Failed to record defeat:', err);
      }
    }
  }, [gameData, towerState, equipmentBonuses, addTowerFloatingDamage, handleHpChange, showInfo]);

  const exitTower = async () => {
    if (!gameData) return;
    if (towerCombatRef.current) {
      clearInterval(towerCombatRef.current);
      towerCombatRef.current = null;
    }

    try {
      const response = await fetch('/api/endless-tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: gameData.character.id, action: 'exit' }),
      });
      const data = await response.json();
      if (data.success) {
        setTowerState(prev => ({
          ...prev,
          isRunning: false,
          inProgress: false,
          monster: null,
        }));
        showInfo({
          title: 'Tower Exited',
          message: data.message,
          color: 'yellow',
        });
      }
    } catch (err) {
      console.error('Failed to exit tower:', err);
    }
  };

  // Tower combat loop
  useEffect(() => {
    if (towerState.isRunning && towerState.monster && showTowerPanel && gameData) {
      const attackSpeed = Math.min(350, gameData.stats.attackSpeed + (equipmentBonuses.attack_speed || 0));
      const interval = Math.max(150, 2000 - attackSpeed * 10);
      towerCombatRef.current = setInterval(performTowerCombat, interval);
    } else {
      if (towerCombatRef.current) {
        clearInterval(towerCombatRef.current);
        towerCombatRef.current = null;
      }
    }

    return () => {
      if (towerCombatRef.current) {
        clearInterval(towerCombatRef.current);
      }
    };
  }, [towerState.isRunning, towerState.monster, showTowerPanel, gameData, equipmentBonuses.attack_speed, performTowerCombat]);

  // Load tower status when panel opens
  useEffect(() => {
    if (showTowerPanel && gameData) {
      loadTowerStatus();
    }
  }, [showTowerPanel, gameData, loadTowerStatus]);

  // Resume tower run if in progress
  useEffect(() => {
    if (showTowerPanel && gameData && towerState.inProgress && !towerState.monster) {
      // Fetch current monster
      fetch('/api/endless-tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: gameData.character.id, action: 'get_monster' }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTowerState(prev => ({
              ...prev,
              floor: data.floor,
              monster: data.monster,
              monsterCurrentHp: data.monster.hp,
              playerCurrentHp: currentHp,
              isRunning: true,
            }));
          }
        })
        .catch(err => console.error('Failed to resume tower:', err));
    }
  }, [showTowerPanel, gameData, towerState.inProgress, towerState.monster, currentHp]);

  // Load quests when panel opens and refresh every 5 seconds
  useEffect(() => {
    if (showQuestsPanel && gameData) {
      // Save progress first to update quest tracking in DB
      const saveAndRefresh = async () => {
        const killsToSend = pendingKillsRef.current;
        const expToSend = pendingExpRef.current;

        if (killsToSend > 0 || expToSend > 0) {
          try {
            await fetch('/api/game/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                character_id: gameData.character.id,
                experience: gameData.character.experience,
                zen: gameData.character.zen,
                level: gameData.character.level,
                kills_gained: killsToSend,
                exp_gained: expToSend,
                update_heartbeat: false,
              }),
            });
            pendingKillsRef.current = 0;
            pendingExpRef.current = 0;
          } catch (err) {
            console.error('Failed to save quest progress:', err);
          }
        }
        await loadQuests();
      };

      saveAndRefresh();
      const interval = setInterval(saveAndRefresh, 5000);
      return () => clearInterval(interval);
    }
  }, [showQuestsPanel, gameData, loadQuests]);

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

  // Buffer is active only when bufferActiveUntil is in the future
  const isBufferActive = character.bufferActiveUntil
    ? new Date(character.bufferActiveUntil) > new Date()
    : false;

  // Buffer bonus: +0.1% DMG & DEF per level (only when active)
  const bufferBonus = isBufferActive ? character.helperBufferLevel * 0.1 : 0;

  const totalStats = {
    minDamage: Math.floor((stats.minDamage + (equipmentBonuses.damage_min || 0)) * (1 + bufferBonus / 100)),
    maxDamage: Math.floor((stats.maxDamage + (equipmentBonuses.damage_max || 0)) * (1 + bufferBonus / 100)),
    defense: Math.floor((stats.physicalDefense + (equipmentBonuses.defense || 0)) * (1 + bufferBonus / 100)),
    attackSpeed: Math.min(350, stats.attackSpeed + (equipmentBonuses.attack_speed || 0)),
  };

  // EXP calculation helper (formula: level² × 2.8125 - reduced 25%)
  const currentExp = BigInt(character.experience);
  const expNeeded = BigInt(Math.floor(character.level * character.level * 2.8125));
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
            {/* Mobile: Logo and name */}
            <div className="flex items-center gap-2 lg:hidden">
              <h1 className="text-lg font-bold text-yellow-400">MU Idle</h1>
              <span className="hidden sm:inline text-gray-400 text-sm">| {character.name}</span>
            </div>
            {/* Desktop: Ascension and Quests buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setShowAscensionPanel(true)}
                className="px-3 py-1.5 bg-purple-600 rounded-lg hover:bg-purple-500 text-sm flex items-center gap-1.5 font-medium"
              >
                ⭐ Ascension
                {character.ascensionPoints > 0 && (
                  <span className="bg-yellow-500 text-black text-xs px-1.5 rounded-full font-bold">
                    {character.ascensionPoints}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowQuestsPanel(true)}
                className="px-3 py-1.5 bg-amber-600 rounded-lg hover:bg-amber-500 text-sm flex items-center gap-1.5 font-medium"
              >
                📋 Daily Quests
                {quests.filter(q => q.completed && !q.claimed).length > 0 && (
                  <span className="bg-green-500 text-white text-xs px-1.5 rounded-full font-bold">
                    {quests.filter(q => q.completed && !q.claimed).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowAchievementsPanel(true)}
                className="px-3 py-1.5 bg-indigo-600 rounded-lg hover:bg-indigo-500 text-sm flex items-center gap-1.5 font-medium"
              >
                🏆 Achievements
                {achievements.filter(a => a.unlocked && !a.claimed).length > 0 && (
                  <span className="bg-yellow-500 text-black text-xs px-1.5 rounded-full font-bold">
                    {achievements.filter(a => a.unlocked && !a.claimed).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowTowerPanel(true)}
                className="px-3 py-1.5 bg-rose-600 rounded-lg hover:bg-rose-500 text-sm flex items-center gap-1.5 font-medium"
              >
                🗼 Tower
                {towerState.maxFloor > 0 && (
                  <span className="bg-black/30 text-white text-xs px-1.5 rounded-full">
                    F{towerState.maxFloor}
                  </span>
                )}
              </button>
            </div>
            {/* Desktop Navigation - hidden on lg (uses global menu) */}
            <div className="hidden sm:flex lg:hidden items-center gap-2">
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
              <button
                onClick={() => setShowQuestsPanel(true)}
                className="px-3 py-1 bg-amber-700 rounded hover:bg-amber-600 text-sm flex items-center gap-1"
              >
                📋 Quests
                {quests.filter(q => q.completed && !q.claimed).length > 0 && (
                  <span className="bg-green-500 text-white text-xs px-1 rounded-full font-bold">
                    {quests.filter(q => q.completed && !q.claimed).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowAchievementsPanel(true)}
                className="px-3 py-1 bg-indigo-700 rounded hover:bg-indigo-600 text-sm flex items-center gap-1"
              >
                🏆
                {achievements.filter(a => a.unlocked && !a.claimed).length > 0 && (
                  <span className="bg-yellow-500 text-black text-xs px-1 rounded-full font-bold">
                    {achievements.filter(a => a.unlocked && !a.claimed).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowTowerPanel(true)}
                className="px-3 py-1 bg-rose-700 rounded hover:bg-rose-600 text-sm flex items-center gap-1"
              >
                🗼
              </button>
              <Link href="/events" className="px-3 py-1 bg-orange-700 rounded hover:bg-orange-600 text-sm">
                Events
              </Link>
              <Link href="/boss-zone" className="px-3 py-1 bg-red-700 rounded hover:bg-red-600 text-sm">
                Boss Zone
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
                href="/boss-zone"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 bg-red-900/30 hover:bg-red-700/40 rounded-xl transition-colors border border-red-700/30"
              >
                <span className="text-2xl">👹</span>
                <div>
                  <div className="font-medium text-red-400">Boss Zone</div>
                  <div className="text-[10px] text-gray-400">Daily Bosses</div>
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
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAscensionPanel(true);
                }}
                className="flex items-center gap-3 p-3 bg-purple-900/30 hover:bg-purple-700/40 rounded-xl transition-colors border border-purple-700/30"
              >
                <span className="text-2xl">⭐</span>
                <div>
                  <div className="font-medium text-purple-400 flex items-center gap-2">
                    Ascension
                    {character.ascensionPoints > 0 && (
                      <span className="bg-yellow-500 text-black text-[10px] px-1.5 rounded-full font-bold">
                        {character.ascensionPoints}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">Skill Tree</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowQuestsPanel(true);
                }}
                className="flex items-center gap-3 p-3 bg-amber-900/30 hover:bg-amber-700/40 rounded-xl transition-colors border border-amber-700/30"
              >
                <span className="text-2xl">📋</span>
                <div>
                  <div className="font-medium text-amber-400 flex items-center gap-2">
                    Quests
                    {quests.filter(q => q.completed && !q.claimed).length > 0 && (
                      <span className="bg-green-500 text-white text-[10px] px-1.5 rounded-full font-bold">
                        {quests.filter(q => q.completed && !q.claimed).length}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">Daily Tasks</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAchievementsPanel(true);
                }}
                className="flex items-center gap-3 p-3 bg-indigo-900/30 hover:bg-indigo-700/40 rounded-xl transition-colors border border-indigo-700/30"
              >
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="font-medium text-indigo-400 flex items-center gap-2">
                    Achievements
                    {achievements.filter(a => a.unlocked && !a.claimed).length > 0 && (
                      <span className="bg-yellow-500 text-black text-[10px] px-1.5 rounded-full font-bold">
                        {achievements.filter(a => a.unlocked && !a.claimed).length}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">Rewards</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowTowerPanel(true);
                }}
                className="flex items-center gap-3 p-3 bg-rose-900/30 hover:bg-rose-700/40 rounded-xl transition-colors border border-rose-700/30"
              >
                <span className="text-2xl">🗼</span>
                <div>
                  <div className="font-medium text-rose-400 flex items-center gap-2">
                    Endless Tower
                    {towerState.maxFloor > 0 && (
                      <span className="bg-black/30 text-white text-[10px] px-1.5 rounded-full">
                        F{towerState.maxFloor}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">Challenge</div>
                </div>
              </button>
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
              lifeSteal={(equipmentBonuses.life_steal || 0) + character.ascLifeSteal * 0.1}
              reflectDamage={equipmentBonuses.reflect_damage}
              expBonus={equipmentBonuses.exp_bonus}
              zenBonus={character.zenLevel}
              resetCount={character.resetCount}
              burstCooldownEnd={character.burstCooldownEnd}
              excellentChance={stats.excellentChance}
              poisonChance={stats.poisonChance}
              helperAttackerLevel={character.helperAttackerLevel}
              helperBufferLevel={character.helperBufferLevel}
              helperAttackerDamage={50 + character.helperAttackerLevel * 20}
              helperBufferBonus={bufferBonus}
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
                      <div><span className="text-emerald-400">Buffer:</span> +0.1% DMG & DEF per level (2min active, 10min cooldown)</div>
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
                    DMG: <span className="text-white font-bold">{50 + character.helperAttackerLevel * 20}</span> (2x/sec)
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
                <div className={`bg-gray-900/50 rounded-lg p-3 border ${isBufferActive ? 'border-emerald-500 bg-emerald-900/20' : 'border-gray-700/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">✨</span>
                    <div>
                      <div className="text-emerald-400 font-bold">Buffer</div>
                      <div className="text-xs text-gray-400">Level {character.helperBufferLevel}/100</div>
                    </div>
                    {isBufferActive && (
                      <span className="ml-auto text-xs bg-emerald-600 text-white px-2 py-0.5 rounded animate-pulse">ACTIVE</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-300 mb-2">
                    Bonus: <span className="text-emerald-400 font-bold">+{(character.helperBufferLevel * 0.1).toFixed(1)}%</span> DMG & DEF
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpgradeHelper('buffer')}
                      disabled={character.helperBufferLevel >= 100 || BigInt(character.zen) < calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer')}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        character.helperBufferLevel < 100 && BigInt(character.zen) >= calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer')
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {character.helperBufferLevel >= 100 ? 'MAX' : formatNumber(calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer'))}
                  </button>
                    {(() => {
                      const isOnCooldown = bufferCooldownRemaining > 0;
                      const canActivate = character.helperBufferLevel > 0 && !isBufferActive && !isOnCooldown;
                      const formatCooldown = (s: number) => {
                        const m = Math.floor(s / 60);
                        const sec = s % 60;
                        return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
                      };
                      return (
                        <button
                          onClick={handleActivateBuffer}
                          disabled={!canActivate}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            canActivate
                              ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isBufferActive
                            ? `✓ ${formatCooldown(bufferActiveRemaining)}`
                            : isOnCooldown
                              ? formatCooldown(bufferCooldownRemaining)
                              : 'Activate'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Equipment Panel - Desktop */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-yellow-400 mb-3">Equipment</h2>
            <EquipmentPanel equipment={equipment} onUnequip={handleUnequipItem} />
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs">
              <div className="text-gray-400 mb-2 font-semibold">All Bonuses</div>

              {/* Equipment Bonuses */}
              <div className="mb-2">
                <div className="text-gray-500 text-[10px] mb-1">Equipment:</div>
                <div className="grid grid-cols-2 gap-x-2">
                  {equipmentBonuses.damage_min > 0 && <div className="text-red-400">+{equipmentBonuses.damage_min}-{equipmentBonuses.damage_max} DMG</div>}
                  {equipmentBonuses.defense > 0 && <div className="text-blue-400">+{equipmentBonuses.defense} DEF</div>}
                  {equipmentBonuses.attack_speed > 0 && <div className="text-yellow-400">+{equipmentBonuses.attack_speed} Speed</div>}
                  {equipmentBonuses.critical_rate > 0 && <div className="text-cyan-400">+{equipmentBonuses.critical_rate}% Crit</div>}
                  {equipmentBonuses.critical_damage > 0 && <div className="text-orange-400">+{equipmentBonuses.critical_damage}% Crit DMG</div>}
                  {equipmentBonuses.life_steal > 0 && <div className="text-pink-400">+{equipmentBonuses.life_steal}% Life Steal</div>}
                  {equipmentBonuses.exp_bonus > 0 && <div className="text-purple-400">+{equipmentBonuses.exp_bonus}% EXP</div>}
                  {equipmentBonuses.zen_bonus > 0 && <div className="text-amber-400">+{equipmentBonuses.zen_bonus}% Zen</div>}
                  {equipmentBonuses.max_hp > 0 && <div className="text-green-400">+{equipmentBonuses.max_hp}% HP</div>}
                  {equipmentBonuses.hp_recovery > 0 && <div className="text-emerald-400">+{equipmentBonuses.hp_recovery}% HP Regen</div>}
                  {equipmentBonuses.damage_percent > 0 && <div className="text-red-300">+{equipmentBonuses.damage_percent}% DMG</div>}
                  {equipmentBonuses.defense_percent > 0 && <div className="text-blue-300">+{equipmentBonuses.defense_percent}% DEF</div>}
                  {equipmentBonuses.attack_speed_percent > 0 && <div className="text-yellow-300">+{equipmentBonuses.attack_speed_percent}% Speed</div>}
                  {equipmentBonuses.excellent_damage > 0 && <div className="text-indigo-400">+{equipmentBonuses.excellent_damage}% Exc DMG</div>}
                  {equipmentBonuses.damage_decrease > 0 && <div className="text-teal-400">-{equipmentBonuses.damage_decrease}% DMG Taken</div>}
                  {equipmentBonuses.reflect_damage > 0 && <div className="text-rose-400">+{equipmentBonuses.reflect_damage}% Reflect</div>}
                </div>
              </div>

              {/* Ascension Bonuses */}
              {(character.ascDamage > 0 || character.ascCritical > 0 || character.ascHealth > 0 || character.ascLifeSteal > 0 || character.ascZen > 0 || character.ascExp > 0 || character.ascPoison > 0 || character.ascExcellent > 0) && (
                <div className="mb-2">
                  <div className="text-gray-500 text-[10px] mb-1">Ascension:</div>
                  <div className="grid grid-cols-2 gap-x-2">
                    {character.ascDamage > 0 && <div className="text-red-400">+{(character.ascDamage * 0.2).toFixed(1)}% DMG</div>}
                    {character.ascCritical > 0 && <div className="text-yellow-400">+{(character.ascCritical * 0.2).toFixed(1)}% Crit</div>}
                    {character.ascHealth > 0 && <div className="text-green-400">+{(character.ascHealth * 0.2).toFixed(1)}% HP</div>}
                    {character.ascLifeSteal > 0 && <div className="text-pink-400">+{(character.ascLifeSteal * 0.1).toFixed(1)}% LS</div>}
                    {character.ascZen > 0 && <div className="text-amber-400">+{(character.ascZen * 0.5).toFixed(1)}% Zen</div>}
                    {character.ascExp > 0 && <div className="text-cyan-400">+{(character.ascExp * 0.5).toFixed(1)}% EXP</div>}
                    {character.ascPoison > 0 && <div className="text-lime-400">+{(character.ascPoison * 0.2).toFixed(1)}% Poison</div>}
                    {character.ascExcellent > 0 && <div className="text-indigo-400">+{(character.ascExcellent * 0.25).toFixed(2)}% Exc</div>}
                  </div>
                </div>
              )}

              {/* Reset Bonuses */}
              {character.resetCount > 0 && (
                <div>
                  <div className="text-gray-500 text-[10px] mb-1">Reset ({character.resetCount}x):</div>
                  <div className="grid grid-cols-2 gap-x-2">
                    <div className="text-red-400">+{character.resetCount * 5} DMG</div>
                    <div className="text-blue-400">+{character.resetCount * 3} DEF</div>
                    <div className="text-green-400">+{character.resetCount * 50} HP</div>
                    <div className="text-yellow-400">+{character.resetCount * 2} Speed</div>
                  </div>
                </div>
              )}
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
                    { key: 'damage', label: 'Damage Mastery', value: character.ascDamage, bonus: '+0.2%', desc: 'Increases all damage dealt', color: 'from-red-600 to-red-800', borderColor: 'border-red-500', icon: '⚔️', total: `${(character.ascDamage * 0.2).toFixed(1)}% DMG` },
                    { key: 'critical', label: 'Critical Eye', value: character.ascCritical, bonus: '+0.2%', desc: 'Increases critical hit chance', color: 'from-yellow-600 to-orange-700', borderColor: 'border-yellow-500', icon: '💥', total: `${(character.ascCritical * 0.2).toFixed(1)}% Crit` },
                    { key: 'health', label: 'Vitality', value: character.ascHealth, bonus: '+0.2%', desc: 'Increases maximum HP', color: 'from-green-600 to-emerald-800', borderColor: 'border-green-500', icon: '❤️', total: `${(character.ascHealth * 0.2).toFixed(1)}% HP` },
                    { key: 'lifeSteal', label: 'Vampirism', value: character.ascLifeSteal, bonus: '+0.1%', desc: 'Steal HP on each hit', color: 'from-pink-600 to-rose-800', borderColor: 'border-pink-500', icon: '🩸', total: `${(character.ascLifeSteal * 0.1).toFixed(1)}% LS` },
                    { key: 'zen', label: 'Wealth', value: character.ascZen, bonus: '+0.5%', desc: 'Increases zen drops', color: 'from-amber-500 to-yellow-700', borderColor: 'border-amber-400', icon: '💰', total: `${(character.ascZen * 0.5).toFixed(1)}% Zen` },
                    { key: 'exp', label: 'Wisdom', value: character.ascExp, bonus: '+0.5%', desc: 'Increases experience gain', color: 'from-cyan-500 to-blue-700', borderColor: 'border-cyan-400', icon: '📈', total: `${(character.ascExp * 0.5).toFixed(1)}% EXP` },
                    { key: 'poison', label: 'Venom Strike', value: character.ascPoison, bonus: '+0.2%', desc: 'Chance to poison (10% current HP)', color: 'from-lime-600 to-green-900', borderColor: 'border-lime-500', icon: '🧪', total: `${(character.ascPoison * 0.2).toFixed(1)}% chance` },
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

        {/* Daily Quests Modal */}
        {showQuestsPanel && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowQuestsPanel(false)}>
            <div
              className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-2 border-amber-600/50 shadow-2xl shadow-amber-900/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-amber-900/90 via-amber-800/90 to-amber-900/90 backdrop-blur p-4 border-b border-amber-500/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📋</span>
                  <div>
                    <h2 className="text-2xl font-bold text-amber-300">Daily Quests</h2>
                    <p className="text-sm text-amber-400/70">Complete quests for valuable rewards</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-amber-600/30 rounded-full px-4 py-2 border border-amber-500/50">
                    <span className="text-amber-300 text-sm">Completed:</span>
                    <span className="ml-2 text-2xl font-bold text-yellow-400">
                      {quests.filter(q => q.completed).length}/{quests.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowQuestsPanel(false)}
                    className="w-10 h-10 rounded-full bg-gray-700/50 hover:bg-red-600/50 transition-colors flex items-center justify-center text-xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Quest List */}
              <div className="p-6">
                {/* Info Banner */}
                <div className="mb-6 p-3 bg-amber-900/30 rounded-lg border border-amber-500/30 text-center">
                  <span className="text-amber-300 text-sm">
                    Quests reset daily at <span className="text-yellow-400 font-bold">midnight UTC</span>
                  </span>
                </div>

                {/* Quests Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quests.map((quest) => (
                    <div
                      key={quest.id}
                      className={`relative rounded-xl border-2 p-4 transition-all ${
                        quest.claimed
                          ? 'bg-gray-800/50 border-gray-600/50 opacity-60'
                          : quest.completed
                          ? 'bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/50 shadow-lg shadow-green-900/30'
                          : 'bg-gray-800/80 border-gray-600/50 hover:border-amber-500/30'
                      }`}
                    >
                      {/* Quest Icon and Name */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{quest.icon}</span>
                        <div className="flex-1">
                          <h3 className={`font-bold ${quest.completed ? 'text-green-300' : 'text-white'}`}>
                            {quest.name}
                          </h3>
                          <p className="text-sm text-gray-400">{quest.description}</p>
                        </div>
                        {quest.claimed && (
                          <span className="bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-full">Claimed</span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className={quest.completed ? 'text-green-400' : 'text-gray-400'}>Progress</span>
                          <span className={quest.completed ? 'text-green-400 font-bold' : 'text-gray-300'}>
                            {quest.type === 'exp'
                              ? `${formatNumber(quest.progress)}/${formatNumber(quest.target)}`
                              : `${quest.progress}/${quest.target}`
                            }
                          </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              quest.completed ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-amber-600 to-yellow-500'
                            }`}
                            style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Rewards */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {quest.rewards.zen && (
                          <span className="bg-amber-900/50 text-amber-300 text-xs px-2 py-1 rounded-full border border-amber-600/30">
                            💰 {formatNumber(quest.rewards.zen)} Zen
                          </span>
                        )}
                        {quest.rewards.jewelOfBless && (
                          <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-600/30">
                            💎 {quest.rewards.jewelOfBless} Bless
                          </span>
                        )}
                        {quest.rewards.jewelOfSoul && (
                          <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded-full border border-purple-600/30">
                            💜 {quest.rewards.jewelOfSoul} Soul
                          </span>
                        )}
                        {quest.rewards.jewelOfLife && (
                          <span className="bg-green-900/50 text-green-300 text-xs px-2 py-1 rounded-full border border-green-600/30">
                            💚 {quest.rewards.jewelOfLife} Life
                          </span>
                        )}
                        {quest.rewards.jewelOfChaos && (
                          <span className="bg-red-900/50 text-red-300 text-xs px-2 py-1 rounded-full border border-red-600/30">
                            ❤️ {quest.rewards.jewelOfChaos} Chaos
                          </span>
                        )}
                        {quest.rewards.bloodCastleTicket && (
                          <span className="bg-rose-900/50 text-rose-300 text-xs px-2 py-1 rounded-full border border-rose-600/30">
                            🏰 {quest.rewards.bloodCastleTicket} BC Ticket
                          </span>
                        )}
                        {quest.rewards.devilSquareTicket && (
                          <span className="bg-violet-900/50 text-violet-300 text-xs px-2 py-1 rounded-full border border-violet-600/30">
                            👹 {quest.rewards.devilSquareTicket} DS Ticket
                          </span>
                        )}
                      </div>

                      {/* Claim Button */}
                      {!quest.claimed && (
                        <button
                          onClick={() => handleClaimQuest(quest.id)}
                          disabled={!quest.completed}
                          className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${
                            quest.completed
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/50'
                              : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
                          }`}
                        >
                          {quest.completed ? '🎁 Claim Reward' : 'In Progress...'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Empty State */}
                {quests.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <span className="text-4xl block mb-2">📋</span>
                    <p>Loading quests...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Achievements Modal */}
        {showAchievementsPanel && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowAchievementsPanel(false)}>
            <div
              className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-2 border-indigo-600/50 shadow-2xl shadow-indigo-900/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-900/90 via-indigo-800/90 to-indigo-900/90 backdrop-blur p-4 border-b border-indigo-500/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏆</span>
                  <div>
                    <h2 className="text-2xl font-bold text-indigo-300">Achievements</h2>
                    <p className="text-sm text-indigo-400/70">Complete challenges for permanent rewards</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600/30 rounded-full px-4 py-2 border border-indigo-500/50">
                    <span className="text-indigo-300 text-sm">Unlocked:</span>
                    <span className="ml-2 text-2xl font-bold text-yellow-400">
                      {achievements.filter(a => a.unlocked).length}/{achievements.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAchievementsPanel(false)}
                    className="w-10 h-10 rounded-full bg-gray-700/50 hover:bg-red-600/50 transition-colors flex items-center justify-center text-xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Achievement List */}
              <div className="p-6">
                {/* Category Tabs - simplified */}
                <div className="mb-6 text-center">
                  <span className="text-gray-400 text-sm">
                    Achievements are permanent - complete them once and claim your rewards!
                  </span>
                </div>

                {/* Achievements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => {
                    const rarityColors: Record<string, string> = {
                      common: 'from-gray-600 to-gray-800 border-gray-500',
                      uncommon: 'from-green-700 to-green-900 border-green-500',
                      rare: 'from-blue-700 to-blue-900 border-blue-500',
                      epic: 'from-purple-700 to-purple-900 border-purple-500',
                      legendary: 'from-yellow-600 to-orange-700 border-yellow-500',
                    };
                    const rarityLabels: Record<string, string> = {
                      common: 'Common',
                      uncommon: 'Uncommon',
                      rare: 'Rare',
                      epic: 'Epic',
                      legendary: 'Legendary',
                    };
                    return (
                      <div
                        key={achievement.id}
                        className={`relative rounded-xl border-2 p-4 transition-all ${
                          achievement.claimed
                            ? 'bg-gray-800/50 border-gray-600/50 opacity-60'
                            : achievement.unlocked
                            ? `bg-gradient-to-r ${rarityColors[achievement.rarity]} shadow-lg`
                            : 'bg-gray-800/80 border-gray-600/50'
                        }`}
                      >
                        {/* Rarity Badge */}
                        <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          achievement.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                          achievement.rarity === 'epic' ? 'bg-purple-500 text-white' :
                          achievement.rarity === 'rare' ? 'bg-blue-500 text-white' :
                          achievement.rarity === 'uncommon' ? 'bg-green-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {rarityLabels[achievement.rarity]}
                        </div>

                        {/* Achievement Icon and Name */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`text-3xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                            {achievement.icon}
                          </span>
                          <div className="flex-1">
                            <h3 className={`font-bold ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`}>
                              {achievement.name}
                            </h3>
                            <p className="text-sm text-gray-400">{achievement.description}</p>
                          </div>
                          {achievement.claimed && (
                            <span className="bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-full">Claimed</span>
                          )}
                          {achievement.unlocked && !achievement.claimed && (
                            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">Ready!</span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className={achievement.unlocked ? 'text-green-400' : 'text-gray-400'}>Progress</span>
                            <span className={achievement.unlocked ? 'text-green-400 font-bold' : 'text-gray-300'}>
                              {formatNumber(achievement.currentValue)}/{formatNumber(achievement.requirement.value)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                achievement.unlocked
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                  : 'bg-gradient-to-r from-indigo-600 to-purple-500'
                              }`}
                              style={{ width: `${Math.min(100, (achievement.currentValue / achievement.requirement.value) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Rewards */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {achievement.rewards.zen && (
                            <span className="bg-amber-900/50 text-amber-300 text-xs px-2 py-1 rounded-full border border-amber-600/30">
                              💰 {formatNumber(achievement.rewards.zen)} Zen
                            </span>
                          )}
                          {achievement.rewards.jewelOfBless && (
                            <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-600/30">
                              💎 {achievement.rewards.jewelOfBless} Bless
                            </span>
                          )}
                          {achievement.rewards.jewelOfSoul && (
                            <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded-full border border-purple-600/30">
                              💜 {achievement.rewards.jewelOfSoul} Soul
                            </span>
                          )}
                          {achievement.rewards.jewelOfLife && (
                            <span className="bg-green-900/50 text-green-300 text-xs px-2 py-1 rounded-full border border-green-600/30">
                              💚 {achievement.rewards.jewelOfLife} Life
                            </span>
                          )}
                          {achievement.rewards.jewelOfChaos && (
                            <span className="bg-red-900/50 text-red-300 text-xs px-2 py-1 rounded-full border border-red-600/30">
                              ❤️ {achievement.rewards.jewelOfChaos} Chaos
                            </span>
                          )}
                        </div>

                        {/* Claim Button */}
                        {!achievement.claimed && (
                          <button
                            onClick={() => handleClaimAchievement(achievement.id)}
                            disabled={!achievement.unlocked}
                            className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${
                              achievement.unlocked
                                ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white shadow-lg shadow-yellow-900/50'
                                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
                            }`}
                          >
                            {achievement.unlocked ? '🎁 Claim Reward' : 'Locked'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Empty State */}
                {achievements.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <span className="text-4xl block mb-2">🏆</span>
                    <p>Loading achievements...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Endless Tower Modal */}
        {showTowerPanel && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => !towerState.isRunning && setShowTowerPanel(false)}>
            <div
              className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-2 border-rose-600/50 shadow-2xl shadow-rose-900/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-rose-900/90 via-rose-800/90 to-rose-900/90 backdrop-blur p-4 border-b border-rose-500/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🗼</span>
                  <div>
                    <h2 className="text-2xl font-bold text-rose-300">Endless Tower</h2>
                    <p className="text-sm text-rose-400/70">Climb as high as you can!</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-rose-600/30 rounded-full px-4 py-2 border border-rose-500/50">
                    <span className="text-rose-300 text-sm">Max Floor:</span>
                    <span className="ml-2 text-2xl font-bold text-yellow-400">
                      {towerState.maxFloor}
                    </span>
                  </div>
                  {!towerState.isRunning && (
                    <button
                      onClick={() => setShowTowerPanel(false)}
                      className="w-10 h-10 rounded-full bg-gray-700/50 hover:bg-red-600/50 transition-colors flex items-center justify-center text-xl"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Tower Content */}
              <div className="p-6">
                {/* Entry Info */}
                <div className="mb-6 p-3 bg-rose-900/30 rounded-lg border border-rose-500/30 text-center">
                  <span className="text-rose-300 text-sm">
                    Daily Entries: <span className="text-yellow-400 font-bold">{towerState.entriesToday}/{towerState.maxEntries}</span>
                    {towerState.entriesToday >= towerState.maxEntries && (
                      <span className="ml-2 text-red-400">(Come back tomorrow!)</span>
                    )}
                  </span>
                </div>

                {!towerState.isRunning ? (
                  /* Start Screen */
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🗼</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Ready to Climb?</h3>
                    <p className="text-gray-400 mb-6">
                      Monsters get +5% stronger each floor.<br />
                      How high can you go?
                    </p>
                    {towerState.inProgress ? (
                      <button
                        onClick={() => {
                          fetch('/api/endless-tower', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ characterId: gameData?.character.id, action: 'get_monster' }),
                          })
                            .then(res => res.json())
                            .then(data => {
                              if (data.success) {
                                setTowerState(prev => ({
                                  ...prev,
                                  floor: data.floor,
                                  monster: data.monster,
                                  monsterCurrentHp: data.monster.hp,
                                  playerCurrentHp: currentHp,
                                  isRunning: true,
                                }));
                              }
                            });
                        }}
                        className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 rounded-xl font-bold text-lg shadow-lg shadow-yellow-900/50"
                      >
                        Resume Run (Floor {towerState.floor})
                      </button>
                    ) : (
                      <button
                        onClick={startTowerRun}
                        disabled={towerState.entriesToday >= towerState.maxEntries}
                        className={`px-8 py-3 rounded-xl font-bold text-lg ${
                          towerState.entriesToday >= towerState.maxEntries
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-900/50'
                        }`}
                      >
                        {towerState.entriesToday >= towerState.maxEntries ? 'No Entries Left' : 'Enter Tower'}
                      </button>
                    )}
                  </div>
                ) : (
                  /* Combat Screen */
                  <div className="space-y-6">
                    {/* Floor Indicator */}
                    <div className="text-center">
                      <span className="bg-rose-600 px-6 py-2 rounded-full text-lg font-bold">
                        Floor {towerState.floor}
                      </span>
                      {towerState.lastRewards && (
                        <div className="mt-2 text-sm text-green-400">
                          +{formatNumber(towerState.lastRewards.exp)} EXP, +{formatNumber(towerState.lastRewards.zen)} Zen
                        </div>
                      )}
                    </div>

                    {/* Combat Area */}
                    <div className="bg-gray-900/80 rounded-xl p-6 relative min-h-[300px] overflow-hidden">
                      {/* Floating Damages */}
                      {towerState.floatingDamages.map((fd) => (
                        <div
                          key={fd.id}
                          className={`absolute text-xl font-bold pointer-events-none animate-float-up z-30 ${
                            fd.type === 'player' ? 'text-yellow-400' :
                            fd.type === 'heal' ? 'text-green-400' :
                            'text-red-500'
                          }`}
                          style={{
                            left: `${fd.x}%`,
                            top: `${fd.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          {fd.type === 'monster' ? `-${fd.damage}` : fd.type === 'heal' ? `+${fd.damage}` : fd.damage}
                        </div>
                      ))}

                      {/* Monster */}
                      {towerState.monster && (
                        <div className="text-center mb-8">
                          <div className="text-6xl mb-2">{towerState.monster.emoji}</div>
                          <div className="text-lg font-bold text-white">{towerState.monster.name}</div>
                          <div className="text-sm text-gray-400 mb-2">
                            DMG: {towerState.monster.minDamage}-{towerState.monster.maxDamage}
                          </div>
                          {/* Monster HP Bar */}
                          <div className="max-w-xs mx-auto">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">HP</span>
                              <span className="text-red-400">
                                {towerState.monsterCurrentHp.toLocaleString()} / {towerState.monster.hp.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-200"
                                style={{ width: `${(towerState.monsterCurrentHp / towerState.monster.hp) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VS Divider */}
                      <div className="text-center text-2xl font-bold text-gray-600 my-4">⚔️</div>

                      {/* Player HP Bar */}
                      <div className="max-w-xs mx-auto">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Your HP</span>
                          <span className="text-green-400">
                            {Math.max(0, towerState.playerCurrentHp).toLocaleString()} / {stats.maxHp.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-200"
                            style={{ width: `${Math.max(0, (towerState.playerCurrentHp / stats.maxHp) * 100)}%` }}
                          />
                        </div>
                        <div className="text-center text-xs text-gray-500 mt-1">
                          DMG: {totalStats.minDamage}-{totalStats.maxDamage} | DEF: {totalStats.defense}
                        </div>
                      </div>
                    </div>

                    {/* Exit Button */}
                    <div className="text-center">
                      <button
                        onClick={exitTower}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium"
                      >
                        🚪 Exit Tower (Keep Progress)
                      </button>
                    </div>
                  </div>
                )}
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
                lifeSteal={(equipmentBonuses.life_steal || 0) + character.ascLifeSteal * 0.1}
                reflectDamage={equipmentBonuses.reflect_damage}
                expBonus={equipmentBonuses.exp_bonus}
                zenBonus={character.zenLevel}
                resetCount={character.resetCount}
                burstCooldownEnd={character.burstCooldownEnd}
                excellentChance={stats.excellentChance}
                poisonChance={stats.poisonChance}
                helperAttackerLevel={character.helperAttackerLevel}
                helperBufferLevel={character.helperBufferLevel}
                helperAttackerDamage={50 + character.helperAttackerLevel * 20}
                helperBufferBonus={bufferBonus}
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
                          DMG: {50 + character.helperAttackerLevel * 20} (2x/sec)
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
                  <div className={`text-xs rounded-lg px-3 py-2 border ${isBufferActive ? 'bg-emerald-900/30 border-emerald-500' : 'bg-gray-800/60 border-gray-700/50'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <div>
                          <span className="text-emerald-400 font-bold">Buffer</span>
                          <span className="text-gray-400 ml-2">Lv.{character.helperBufferLevel}/100</span>
                          {isBufferActive && <span className="ml-2 text-emerald-400 text-[10px] animate-pulse">ACTIVE</span>}
                          <div className="text-[10px] text-gray-500">
                            +{(character.helperBufferLevel * 0.1).toFixed(1)}% DMG & DEF
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleUpgradeHelper('buffer')}
                        disabled={character.helperBufferLevel >= 100 || BigInt(character.zen) < calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer')}
                        className={`flex-1 px-2 py-1 rounded text-[10px] font-bold ${
                          character.helperBufferLevel < 100 && BigInt(character.zen) >= calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer')
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                      >
                        {character.helperBufferLevel >= 100 ? 'MAX' : formatNumber(calculateHelperUpgradeCost(character.helperBufferLevel, 'buffer'))}
                      </button>
                      {(() => {
                        const isOnCooldown = bufferCooldownRemaining > 0;
                        const canActivate = character.helperBufferLevel > 0 && !isBufferActive && !isOnCooldown;
                        const formatCooldown = (s: number) => {
                          const m = Math.floor(s / 60);
                          const sec = s % 60;
                          return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
                        };
                        return (
                          <button
                            onClick={handleActivateBuffer}
                            disabled={!canActivate}
                            className={`flex-1 px-2 py-1 rounded text-[10px] font-bold ${
                              canActivate ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-500'
                            }`}
                          >
                            {isBufferActive
                              ? `✓ ${formatCooldown(bufferActiveRemaining)}`
                              : isOnCooldown
                                ? formatCooldown(bufferCooldownRemaining)
                                : 'Activate'}
                          </button>
                        );
                      })()}
                    </div>
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
                          <div><span className="text-red-400">Damage:</span> +0.2% DMG per point</div>
                          <div><span className="text-yellow-400">Critical:</span> +0.2% Crit per point</div>
                          <div><span className="text-green-400">Vitality:</span> +0.2% HP per point</div>
                          <div><span className="text-pink-400">Life Steal:</span> +0.1% LS per point</div>
                          <div><span className="text-amber-400">Wealth:</span> +0.5% Zen per point</div>
                          <div><span className="text-cyan-400">Wisdom:</span> +0.5% EXP per point</div>
                          <div><span className="text-lime-400">Venom:</span> +0.2% chance (10% HP dmg)</div>
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
                      { key: 'lifeSteal', label: 'Life Steal', value: character.ascLifeSteal, bonus: '+0.1% LS', color: 'text-pink-400', icon: '🩸' },
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
                <div className="mt-3 pt-3 border-t border-gray-700 text-xs">
                  <div className="text-gray-400 mb-2 font-semibold">All Bonuses</div>

                  {/* Equipment */}
                  <div className="mb-2">
                    <div className="text-gray-500 text-[10px] mb-1">Equipment:</div>
                    <div className="grid grid-cols-2 gap-x-2">
                      {equipmentBonuses.damage_min > 0 && <div className="text-red-400">+{equipmentBonuses.damage_min}-{equipmentBonuses.damage_max} DMG</div>}
                      {equipmentBonuses.defense > 0 && <div className="text-blue-400">+{equipmentBonuses.defense} DEF</div>}
                      {equipmentBonuses.attack_speed > 0 && <div className="text-yellow-400">+{equipmentBonuses.attack_speed} Spd</div>}
                      {equipmentBonuses.critical_rate > 0 && <div className="text-cyan-400">+{equipmentBonuses.critical_rate}% Crit</div>}
                      {equipmentBonuses.life_steal > 0 && <div className="text-pink-400">+{equipmentBonuses.life_steal}% LS</div>}
                      {equipmentBonuses.exp_bonus > 0 && <div className="text-purple-400">+{equipmentBonuses.exp_bonus}% EXP</div>}
                      {equipmentBonuses.zen_bonus > 0 && <div className="text-amber-400">+{equipmentBonuses.zen_bonus}% Zen</div>}
                      {equipmentBonuses.max_hp > 0 && <div className="text-green-400">+{equipmentBonuses.max_hp}% HP</div>}
                      {equipmentBonuses.damage_percent > 0 && <div className="text-red-300">+{equipmentBonuses.damage_percent}% DMG</div>}
                      {equipmentBonuses.defense_percent > 0 && <div className="text-blue-300">+{equipmentBonuses.defense_percent}% DEF</div>}
                    </div>
                  </div>

                  {/* Ascension */}
                  {(character.ascDamage > 0 || character.ascCritical > 0 || character.ascHealth > 0 || character.ascLifeSteal > 0) && (
                    <div className="mb-2">
                      <div className="text-gray-500 text-[10px] mb-1">Ascension:</div>
                      <div className="grid grid-cols-2 gap-x-2">
                        {character.ascDamage > 0 && <div className="text-red-400">+{(character.ascDamage * 0.2).toFixed(1)}% DMG</div>}
                        {character.ascCritical > 0 && <div className="text-yellow-400">+{(character.ascCritical * 0.2).toFixed(1)}% Crit</div>}
                        {character.ascHealth > 0 && <div className="text-green-400">+{(character.ascHealth * 0.2).toFixed(1)}% HP</div>}
                        {character.ascLifeSteal > 0 && <div className="text-pink-400">+{(character.ascLifeSteal * 0.1).toFixed(1)}% LS</div>}
                        {character.ascZen > 0 && <div className="text-amber-400">+{(character.ascZen * 0.5).toFixed(1)}% Zen</div>}
                        {character.ascExp > 0 && <div className="text-cyan-400">+{(character.ascExp * 0.5).toFixed(1)}% EXP</div>}
                        {character.ascPoison > 0 && <div className="text-lime-400">+{(character.ascPoison * 0.2).toFixed(1)}% Psn</div>}
                        {character.ascExcellent > 0 && <div className="text-indigo-400">+{(character.ascExcellent * 0.25).toFixed(2)}% Exc</div>}
                      </div>
                    </div>
                  )}

                  {/* Reset */}
                  {character.resetCount > 0 && (
                    <div>
                      <div className="text-gray-500 text-[10px] mb-1">Reset ({character.resetCount}x):</div>
                      <div className="grid grid-cols-2 gap-x-2">
                        <div className="text-red-400">+{character.resetCount * 5} DMG</div>
                        <div className="text-blue-400">+{character.resetCount * 3} DEF</div>
                        <div className="text-green-400">+{character.resetCount * 50} HP</div>
                        <div className="text-yellow-400">+{character.resetCount * 2} Spd</div>
                      </div>
                    </div>
                  )}
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
