export interface Boss {
  id: number;
  name: string;
  emoji: string;
  level: number;
  hp: number;
  minDamage: number;
  maxDamage: number;
  defense: number;
  expReward: number;
  zenReward: number;
  description: string;
  requiredLevel: number;  // Minimum character level to fight
  dailyLimit: number;     // How many times can be killed per day
  itemDropLevel: number;  // Level of items that drop
}

// Boss 1: Challenging for level 20-40 players
// Boss 2: Challenging for level 60-100 players
export const BOSSES: Boss[] = [
  {
    id: 1,
    name: 'Gorgon the Stone Guardian',
    emoji: '🗿',
    level: 25,
    hp: 75000,
    minDamage: 400,
    maxDamage: 600,
    defense: 180,
    expReward: 50000,
    zenReward: 25000,
    description: 'An ancient stone guardian awakened from the depths. Its petrifying gaze has claimed many adventurers.',
    requiredLevel: 20,
    dailyLimit: 2,
    itemDropLevel: 25,
  },
  {
    id: 2,
    name: 'Kundun the Destroyer',
    emoji: '😈',
    level: 70,
    hp: 750000,
    minDamage: 2000,
    maxDamage: 3000,
    defense: 900,
    expReward: 500000,
    zenReward: 250000,
    description: 'The lord of darkness, Kundun has terrorized the MU continent for centuries. Only the mightiest warriors dare challenge him.',
    requiredLevel: 60,
    dailyLimit: 2,
    itemDropLevel: 70,
  },
];

export function getBossById(id: number): Boss | undefined {
  return BOSSES.find(boss => boss.id === id);
}
