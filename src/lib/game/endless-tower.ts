// Endless Tower monster definitions
// Monsters are grouped by floor ranges, scaling with +5% HP/DMG per floor

export interface TowerMonster {
  name: string;
  emoji: string;
  baseHp: number;
  baseMinDamage: number;
  baseMaxDamage: number;
  baseExp: number;
  baseZen: number;
}

// Monsters grouped by floor tiers
export const TOWER_MONSTERS: { floors: [number, number]; monsters: TowerMonster[] }[] = [
  {
    floors: [1, 10],
    monsters: [
      { name: 'Spider', emoji: '🕷️', baseHp: 100, baseMinDamage: 5, baseMaxDamage: 10, baseExp: 50, baseZen: 100 },
      { name: 'Skeleton', emoji: '💀', baseHp: 120, baseMinDamage: 8, baseMaxDamage: 15, baseExp: 60, baseZen: 120 },
      { name: 'Goblin', emoji: '👺', baseHp: 150, baseMinDamage: 10, baseMaxDamage: 18, baseExp: 75, baseZen: 150 },
    ],
  },
  {
    floors: [11, 25],
    monsters: [
      { name: 'Orc Warrior', emoji: '👹', baseHp: 300, baseMinDamage: 20, baseMaxDamage: 35, baseExp: 150, baseZen: 300 },
      { name: 'Dark Knight', emoji: '🗡️', baseHp: 400, baseMinDamage: 25, baseMaxDamage: 45, baseExp: 200, baseZen: 400 },
      { name: 'Cursed Mage', emoji: '🧙', baseHp: 250, baseMinDamage: 35, baseMaxDamage: 55, baseExp: 180, baseZen: 350 },
    ],
  },
  {
    floors: [26, 50],
    monsters: [
      { name: 'Lich', emoji: '☠️', baseHp: 800, baseMinDamage: 50, baseMaxDamage: 80, baseExp: 400, baseZen: 800 },
      { name: 'Demon Guard', emoji: '👿', baseHp: 1000, baseMinDamage: 60, baseMaxDamage: 100, baseExp: 500, baseZen: 1000 },
      { name: 'Blood Knight', emoji: '🩸', baseHp: 900, baseMinDamage: 70, baseMaxDamage: 110, baseExp: 550, baseZen: 1100 },
    ],
  },
  {
    floors: [51, 100],
    monsters: [
      { name: 'Shadow Lord', emoji: '🌑', baseHp: 2000, baseMinDamage: 100, baseMaxDamage: 160, baseExp: 1000, baseZen: 2000 },
      { name: 'Flame Demon', emoji: '🔥', baseHp: 2500, baseMinDamage: 120, baseMaxDamage: 200, baseExp: 1200, baseZen: 2500 },
      { name: 'Ice Titan', emoji: '🧊', baseHp: 3000, baseMinDamage: 100, baseMaxDamage: 180, baseExp: 1500, baseZen: 3000 },
    ],
  },
  {
    floors: [101, 200],
    monsters: [
      { name: 'Void Walker', emoji: '🌀', baseHp: 5000, baseMinDamage: 200, baseMaxDamage: 350, baseExp: 3000, baseZen: 6000 },
      { name: 'Death Knight', emoji: '⚔️', baseHp: 6000, baseMinDamage: 250, baseMaxDamage: 400, baseExp: 3500, baseZen: 7000 },
      { name: 'Chaos Mage', emoji: '💜', baseHp: 4500, baseMinDamage: 300, baseMaxDamage: 500, baseExp: 4000, baseZen: 8000 },
    ],
  },
  {
    floors: [201, 500],
    monsters: [
      { name: 'Ancient Dragon', emoji: '🐉', baseHp: 15000, baseMinDamage: 500, baseMaxDamage: 800, baseExp: 10000, baseZen: 20000 },
      { name: 'Demon Lord', emoji: '😈', baseHp: 20000, baseMinDamage: 600, baseMaxDamage: 1000, baseExp: 15000, baseZen: 30000 },
      { name: 'Fallen Angel', emoji: '👼', baseHp: 18000, baseMinDamage: 700, baseMaxDamage: 1100, baseExp: 12000, baseZen: 25000 },
    ],
  },
  {
    floors: [501, Infinity],
    monsters: [
      { name: 'Kundun', emoji: '👑', baseHp: 50000, baseMinDamage: 1000, baseMaxDamage: 1500, baseExp: 50000, baseZen: 100000 },
      { name: 'Selupan', emoji: '🦂', baseHp: 60000, baseMinDamage: 1200, baseMaxDamage: 1800, baseExp: 60000, baseZen: 120000 },
      { name: 'Nightmare', emoji: '💀', baseHp: 75000, baseMinDamage: 1500, baseMaxDamage: 2200, baseExp: 75000, baseZen: 150000 },
    ],
  },
];

// Get monster for a specific floor
export function getMonsterForFloor(floor: number): TowerMonster {
  const tier = TOWER_MONSTERS.find(t => floor >= t.floors[0] && floor <= t.floors[1]);
  if (!tier) {
    // Fallback to highest tier
    const lastTier = TOWER_MONSTERS[TOWER_MONSTERS.length - 1];
    return lastTier.monsters[Math.floor(Math.random() * lastTier.monsters.length)];
  }
  return tier.monsters[Math.floor(Math.random() * tier.monsters.length)];
}

// Calculate scaled stats for a floor
export function getScaledMonsterStats(monster: TowerMonster, floor: number) {
  const scaleFactor = 1 + (floor - 1) * 0.05; // +5% per floor

  return {
    name: monster.name,
    emoji: monster.emoji,
    hp: Math.floor(monster.baseHp * scaleFactor),
    minDamage: Math.floor(monster.baseMinDamage * scaleFactor),
    maxDamage: Math.floor(monster.baseMaxDamage * scaleFactor),
    exp: Math.floor(monster.baseExp * scaleFactor),
    zen: Math.floor(monster.baseZen * scaleFactor),
  };
}

export const MAX_DAILY_ENTRIES = 2;
