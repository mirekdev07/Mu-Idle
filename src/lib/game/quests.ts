export interface Quest {
  id: string;
  name: string;
  description: string;
  target: number;
  type: 'kills' | 'exp' | 'event' | 'boss' | 'craft' | 'reset';
  rewards: {
    zen?: number;
    jewelOfBless?: number;
    jewelOfSoul?: number;
    jewelOfLife?: number;
    jewelOfChaos?: number;
    bloodCastleTicket?: number;
    devilSquareTicket?: number;
  };
  icon: string;
  color: string;
}

export const DAILY_QUESTS: Quest[] = [
  {
    id: 'kills_1000',
    name: 'Monster Hunter',
    description: 'Kill 1,000 monsters',
    target: 1000,
    type: 'kills',
    rewards: { jewelOfSoul: 5, jewelOfBless: 5 },
    icon: '⚔️',
    color: 'from-red-600 to-red-800',
  },
  {
    id: 'kills_5000',
    name: 'Monster Slayer',
    description: 'Kill 5,000 monsters',
    target: 5000,
    type: 'kills',
    rewards: { jewelOfLife: 3, jewelOfChaos: 2 },
    icon: '💀',
    color: 'from-red-700 to-red-900',
  },
  {
    id: 'kills_20000',
    name: 'Monster Annihilator',
    description: 'Kill 20,000 monsters',
    target: 20000,
    type: 'kills',
    rewards: { jewelOfChaos: 5, jewelOfLife: 5, jewelOfSoul: 10 },
    icon: '☠️',
    color: 'from-red-800 to-black',
  },
  {
    id: 'exp_1m',
    name: 'Experience Seeker',
    description: 'Gain 1,000,000 EXP',
    target: 1000000,
    type: 'exp',
    rewards: { zen: 10000000 },
    icon: '📈',
    color: 'from-cyan-600 to-cyan-800',
  },
  {
    id: 'exp_10m',
    name: 'Experience Master',
    description: 'Gain 10,000,000 EXP',
    target: 10000000,
    type: 'exp',
    rewards: { zen: 100000000 },
    icon: '📊',
    color: 'from-cyan-700 to-blue-800',
  },
  {
    id: 'exp_100m',
    name: 'Experience Legend',
    description: 'Gain 100,000,000 EXP',
    target: 100000000,
    type: 'exp',
    rewards: { zen: 1000000000, jewelOfChaos: 3 },
    icon: '🏆',
    color: 'from-blue-600 to-purple-800',
  },
  {
    id: 'event_enter',
    name: 'Event Participant',
    description: 'Enter any event (Blood Castle or Devil Square)',
    target: 1,
    type: 'event',
    rewards: { bloodCastleTicket: 1, devilSquareTicket: 1 },
    icon: '🏰',
    color: 'from-orange-600 to-orange-800',
  },
  {
    id: 'boss_kill',
    name: 'Boss Hunter',
    description: 'Defeat any boss in Boss Zone',
    target: 1,
    type: 'boss',
    rewards: { jewelOfBless: 5, jewelOfSoul: 5 },
    icon: '👹',
    color: 'from-purple-600 to-purple-800',
  },
  {
    id: 'craft_item',
    name: 'Master Crafter',
    description: 'Successfully enhance an item to +9',
    target: 1,
    type: 'craft',
    rewards: { jewelOfLife: 5 },
    icon: '🔨',
    color: 'from-amber-600 to-amber-800',
  },
  {
    id: 'reset_char',
    name: 'Reborn',
    description: 'Reset your character',
    target: 1,
    type: 'reset',
    rewards: { jewelOfChaos: 5, jewelOfLife: 5, jewelOfBless: 5, jewelOfSoul: 5 },
    icon: '🔄',
    color: 'from-yellow-500 to-yellow-700',
  },
];

export function getQuestById(id: string): Quest | undefined {
  return DAILY_QUESTS.find(q => q.id === id);
}
