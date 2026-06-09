export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'progression' | 'wealth' | 'crafting' | 'events';
  requirement: {
    type: 'kills' | 'resets' | 'level' | 'zen' | 'enhancement' | 'deaths' | 'boss_kills' | 'event_entries';
    value: number;
  };
  rewards: {
    zen?: number;
    jewelOfBless?: number;
    jewelOfSoul?: number;
    jewelOfLife?: number;
    jewelOfChaos?: number;
  };
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export const ACHIEVEMENTS: Achievement[] = [
  // Combat - Kills
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Kill your first monster',
    category: 'combat',
    requirement: { type: 'kills', value: 1 },
    rewards: { zen: 1000 },
    icon: '🗡️',
    rarity: 'common',
  },
  {
    id: 'monster_hunter',
    name: 'Monster Hunter',
    description: 'Kill 1,000 monsters',
    category: 'combat',
    requirement: { type: 'kills', value: 1000 },
    rewards: { jewelOfBless: 1 },
    icon: '⚔️',
    rarity: 'common',
  },
  {
    id: 'monster_slayer',
    name: 'Monster Slayer',
    description: 'Kill 10,000 monsters',
    category: 'combat',
    requirement: { type: 'kills', value: 10000 },
    rewards: { jewelOfSoul: 3, jewelOfBless: 3 },
    icon: '💀',
    rarity: 'uncommon',
  },
  {
    id: 'monster_annihilator',
    name: 'Monster Annihilator',
    description: 'Kill 100,000 monsters',
    category: 'combat',
    requirement: { type: 'kills', value: 100000 },
    rewards: { jewelOfLife: 5, jewelOfChaos: 3 },
    icon: '☠️',
    rarity: 'rare',
  },
  {
    id: 'monster_overlord',
    name: 'Monster Overlord',
    description: 'Kill 1,000,000 monsters',
    category: 'combat',
    requirement: { type: 'kills', value: 1000000 },
    rewards: { jewelOfChaos: 10, jewelOfLife: 10 },
    icon: '👑',
    rarity: 'legendary',
  },

  // Progression - Resets
  {
    id: 'reborn',
    name: 'Reborn',
    description: 'Complete your first reset',
    category: 'progression',
    requirement: { type: 'resets', value: 1 },
    rewards: { jewelOfChaos: 1 },
    icon: '🔄',
    rarity: 'uncommon',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Complete 10 resets',
    category: 'progression',
    requirement: { type: 'resets', value: 10 },
    rewards: { jewelOfChaos: 5, zen: 10000000 },
    icon: '🎖️',
    rarity: 'rare',
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Complete 50 resets',
    category: 'progression',
    requirement: { type: 'resets', value: 50 },
    rewards: { jewelOfChaos: 15, jewelOfLife: 10 },
    icon: '🏅',
    rarity: 'epic',
  },
  {
    id: 'immortal',
    name: 'Immortal',
    description: 'Complete 100 resets',
    category: 'progression',
    requirement: { type: 'resets', value: 100 },
    rewards: { jewelOfChaos: 30, jewelOfLife: 20, jewelOfBless: 20, jewelOfSoul: 20 },
    icon: '✨',
    rarity: 'legendary',
  },

  // Progression - Levels
  {
    id: 'apprentice',
    name: 'Apprentice',
    description: 'Reach level 50',
    category: 'progression',
    requirement: { type: 'level', value: 50 },
    rewards: { zen: 50000 },
    icon: '📖',
    rarity: 'common',
  },
  {
    id: 'warrior',
    name: 'Warrior',
    description: 'Reach level 100',
    category: 'progression',
    requirement: { type: 'level', value: 100 },
    rewards: { jewelOfBless: 2 },
    icon: '🛡️',
    rarity: 'common',
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Reach level 200',
    category: 'progression',
    requirement: { type: 'level', value: 200 },
    rewards: { jewelOfSoul: 3 },
    icon: '⚔️',
    rarity: 'uncommon',
  },
  {
    id: 'master',
    name: 'Master',
    description: 'Reach level 300',
    category: 'progression',
    requirement: { type: 'level', value: 300 },
    rewards: { jewelOfLife: 2, zen: 1000000 },
    icon: '🎯',
    rarity: 'rare',
  },
  {
    id: 'grandmaster',
    name: 'Grand Master',
    description: 'Reach level 400',
    category: 'progression',
    requirement: { type: 'level', value: 400 },
    rewards: { jewelOfChaos: 3, jewelOfLife: 3 },
    icon: '👑',
    rarity: 'epic',
  },

  // Wealth
  {
    id: 'rich',
    name: 'Getting Rich',
    description: 'Accumulate 1,000,000 Zen',
    category: 'wealth',
    requirement: { type: 'zen', value: 1000000 },
    rewards: { jewelOfBless: 1 },
    icon: '💰',
    rarity: 'common',
  },
  {
    id: 'wealthy',
    name: 'Wealthy',
    description: 'Accumulate 100,000,000 Zen',
    category: 'wealth',
    requirement: { type: 'zen', value: 100000000 },
    rewards: { jewelOfSoul: 5 },
    icon: '💎',
    rarity: 'rare',
  },
  {
    id: 'billionaire',
    name: 'Billionaire',
    description: 'Accumulate 1,000,000,000 Zen',
    category: 'wealth',
    requirement: { type: 'zen', value: 1000000000 },
    rewards: { jewelOfChaos: 5, jewelOfLife: 5 },
    icon: '🏆',
    rarity: 'epic',
  },

  // Crafting
  {
    id: 'blacksmith',
    name: 'Blacksmith',
    description: 'Enhance an item to +6',
    category: 'crafting',
    requirement: { type: 'enhancement', value: 6 },
    rewards: { jewelOfBless: 2 },
    icon: '🔨',
    rarity: 'common',
  },
  {
    id: 'master_blacksmith',
    name: 'Master Blacksmith',
    description: 'Enhance an item to +9',
    category: 'crafting',
    requirement: { type: 'enhancement', value: 9 },
    rewards: { jewelOfSoul: 5, jewelOfLife: 2 },
    icon: '⚒️',
    rarity: 'rare',
  },

  // Deaths
  {
    id: 'first_death',
    name: 'Learning Experience',
    description: 'Die for the first time',
    category: 'combat',
    requirement: { type: 'deaths', value: 1 },
    rewards: { zen: 500 },
    icon: '💀',
    rarity: 'common',
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    description: 'Die 100 times',
    category: 'combat',
    requirement: { type: 'deaths', value: 100 },
    rewards: { jewelOfBless: 3 },
    icon: '💔',
    rarity: 'uncommon',
  },
  {
    id: 'never_give_up',
    name: 'Never Give Up',
    description: 'Die 1,000 times',
    category: 'combat',
    requirement: { type: 'deaths', value: 1000 },
    rewards: { jewelOfLife: 5 },
    icon: '🔥',
    rarity: 'rare',
  },

  // Events & Bosses
  {
    id: 'event_novice',
    name: 'Event Novice',
    description: 'Enter 10 events',
    category: 'events',
    requirement: { type: 'event_entries', value: 10 },
    rewards: { jewelOfBless: 2 },
    icon: '🏰',
    rarity: 'common',
  },
  {
    id: 'event_veteran',
    name: 'Event Veteran',
    description: 'Enter 100 events',
    category: 'events',
    requirement: { type: 'event_entries', value: 100 },
    rewards: { jewelOfChaos: 3 },
    icon: '🎪',
    rarity: 'rare',
  },
  {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    description: 'Kill 10 bosses',
    category: 'events',
    requirement: { type: 'boss_kills', value: 10 },
    rewards: { jewelOfSoul: 3 },
    icon: '👹',
    rarity: 'uncommon',
  },
  {
    id: 'boss_conqueror',
    name: 'Boss Conqueror',
    description: 'Kill 100 bosses',
    category: 'events',
    requirement: { type: 'boss_kills', value: 100 },
    rewards: { jewelOfChaos: 5, jewelOfLife: 5 },
    icon: '🐉',
    rarity: 'epic',
  },
];

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

export const RARITY_COLORS = {
  common: 'from-gray-500 to-gray-700',
  uncommon: 'from-green-600 to-green-800',
  rare: 'from-blue-600 to-blue-800',
  epic: 'from-purple-600 to-purple-800',
  legendary: 'from-yellow-500 to-orange-600',
};

export const RARITY_BORDER_COLORS = {
  common: 'border-gray-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500',
};
