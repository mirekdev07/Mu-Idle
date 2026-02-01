import { Location, Monster } from '@/types/game';

export const LOCATIONS: Location[] = [
  {
    id: 1,
    name: 'Newbie Valley',
    levelRange: [1, 10],
    monsters: [
      { id: 1, name: 'Spider', level: 2, hp: 40, minDamage: 6, maxDamage: 9, defense: 2, exp: 15, zen: 5 },
      { id: 2, name: 'Goblin', level: 3, hp: 50, minDamage: 8, maxDamage: 11, defense: 4, exp: 20, zen: 8 },
      { id: 3, name: 'Budge Dragon', level: 4, hp: 60, minDamage: 10, maxDamage: 12, defense: 7, exp: 25, zen: 10 },
      { id: 4, name: 'Chain Scorpion', level: 5, hp: 80, minDamage: 13, maxDamage: 16, defense: 8, exp: 30, zen: 12 },
      { id: 5, name: 'Bull Fighter', level: 6, hp: 90, minDamage: 16, maxDamage: 18, defense: 12, exp: 35, zen: 15 },
      { id: 6, name: 'Elite Goblin', level: 8, hp: 130, minDamage: 17, maxDamage: 22, defense: 14, exp: 45, zen: 20 },
      { id: 7, name: 'Hound', level: 9, hp: 160, minDamage: 20, maxDamage: 25, defense: 16, exp: 50, zen: 25 },
      { id: 8, name: 'Beetle Monster', level: 10, hp: 180, minDamage: 22, maxDamage: 27, defense: 20, exp: 55, zen: 28 },
    ],
  },
  {
    id: 2,
    name: 'Forest Entrance',
    levelRange: [11, 20],
    monsters: [
      { id: 9, name: 'Elite Bull Fighter', level: 12, hp: 200, minDamage: 26, maxDamage: 31, defense: 20, exp: 70, zen: 35 },
      { id: 10, name: 'Hunter', level: 13, hp: 220, minDamage: 28, maxDamage: 34, defense: 22, exp: 80, zen: 40 },
      { id: 11, name: 'Lich', level: 14, hp: 250, minDamage: 32, maxDamage: 37, defense: 24, exp: 90, zen: 45 },
      { id: 12, name: 'Forest Monster', level: 15, hp: 270, minDamage: 35, maxDamage: 40, defense: 25, exp: 100, zen: 50 },
      { id: 13, name: 'Agon', level: 16, hp: 300, minDamage: 38, maxDamage: 44, defense: 27, exp: 110, zen: 55 },
      { id: 14, name: 'Giant', level: 17, hp: 320, minDamage: 41, maxDamage: 50, defense: 28, exp: 120, zen: 60 },
      { id: 15, name: 'Stone Golem', level: 18, hp: 350, minDamage: 47, maxDamage: 56, defense: 32, exp: 130, zen: 65 },
      { id: 16, name: 'Skeleton', level: 19, hp: 380, minDamage: 51, maxDamage: 63, defense: 32, exp: 140, zen: 70 },
      { id: 17, name: 'Worm', level: 20, hp: 470, minDamage: 63, maxDamage: 71, defense: 42, exp: 160, zen: 80 },
    ],
  },
  {
    id: 3,
    name: 'Mountain Pass',
    levelRange: [21, 30],
    monsters: [
      { id: 18, name: 'Ice Monster', level: 22, hp: 460, minDamage: 66, maxDamage: 75, defense: 44, exp: 180, zen: 90 },
      { id: 19, name: 'Hommerd', level: 24, hp: 440, minDamage: 69, maxDamage: 79, defense: 48, exp: 200, zen: 100 },
      { id: 20, name: 'Werewolf', level: 24, hp: 460, minDamage: 69, maxDamage: 79, defense: 48, exp: 200, zen: 100 },
      { id: 21, name: 'Larva', level: 25, hp: 460, minDamage: 72, maxDamage: 81, defense: 50, exp: 220, zen: 110 },
      { id: 22, name: 'Assassin', level: 26, hp: 510, minDamage: 75, maxDamage: 88, defense: 52, exp: 240, zen: 120 },
      { id: 23, name: 'Cyclops', level: 28, hp: 570, minDamage: 79, maxDamage: 91, defense: 54, exp: 280, zen: 140 },
      { id: 24, name: 'Yeti', level: 30, hp: 620, minDamage: 81, maxDamage: 94, defense: 58, exp: 320, zen: 160 },
    ],
  },
  {
    id: 4,
    name: 'Dark Forest',
    levelRange: [31, 40],
    monsters: [
      { id: 25, name: 'Ghost', level: 32, hp: 680, minDamage: 85, maxDamage: 100, defense: 64, exp: 360, zen: 180 },
      { id: 26, name: 'Skeleton Archer', level: 34, hp: 790, minDamage: 85, maxDamage: 104, defense: 70, exp: 400, zen: 200 },
      { id: 27, name: 'Elite Yeti', level: 36, hp: 1060, minDamage: 88, maxDamage: 104, defense: 80, exp: 450, zen: 225 },
      { id: 28, name: 'Hell Hound', level: 38, hp: 1170, minDamage: 91, maxDamage: 110, defense: 80, exp: 500, zen: 250 },
      { id: 29, name: 'Hell Spider', level: 40, hp: 1320, minDamage: 94, maxDamage: 113, defense: 90, exp: 550, zen: 275 },
    ],
  },
  {
    id: 5,
    name: 'Haunted Cemetery',
    levelRange: [41, 50],
    monsters: [
      { id: 30, name: 'Bahamut', level: 43, hp: 2210, minDamage: 100, maxDamage: 138, defense: 100, exp: 650, zen: 325 },
      { id: 31, name: 'Thunder Lich', level: 44, hp: 2650, minDamage: 119, maxDamage: 167, defense: 110, exp: 700, zen: 350 },
      { id: 32, name: 'Dark Knight', level: 48, hp: 4410, minDamage: 167, maxDamage: 226, defense: 160, exp: 900, zen: 450 },
      { id: 33, name: 'Poison Shadow', level: 50, hp: 5510, minDamage: 189, maxDamage: 252, defense: 180, exp: 1000, zen: 500 },
    ],
  },
  {
    id: 6,
    name: 'Ice Caverns',
    levelRange: [51, 60],
    monsters: [
      { id: 34, name: 'Ice Queen', level: 52, hp: 6620, minDamage: 198, maxDamage: 270, defense: 180, exp: 1100, zen: 550 },
      { id: 35, name: 'Mino', level: 54, hp: 7720, minDamage: 207, maxDamage: 283, defense: 190, exp: 1200, zen: 600 },
      { id: 36, name: 'Death Cow', level: 57, hp: 9920, minDamage: 220, maxDamage: 299, defense: 190, exp: 1400, zen: 700 },
      { id: 37, name: 'Devil', level: 60, hp: 11030, minDamage: 236, maxDamage: 302, defense: 190, exp: 1600, zen: 800 },
    ],
  },
  {
    id: 7,
    name: 'Cursed Lands',
    levelRange: [61, 80],
    monsters: [
      { id: 38, name: 'Death Knight', level: 62, hp: 12130, minDamage: 245, maxDamage: 312, defense: 200, exp: 1800, zen: 900 },
      { id: 39, name: 'Great Bahamut', level: 66, hp: 14330, minDamage: 264, maxDamage: 333, defense: 200, exp: 2400, zen: 1200 },
      { id: 40, name: 'Lizard King', level: 70, hp: 17640, minDamage: 287, maxDamage: 362, defense: 210, exp: 2800, zen: 1400 },
      { id: 41, name: 'Mutant', level: 72, hp: 22050, minDamage: 302, maxDamage: 371, defense: 220, exp: 3000, zen: 1500 },
      { id: 42, name: 'Splinter Wolf', level: 80, hp: 39700, minDamage: 453, maxDamage: 516, defense: 270, exp: 4000, zen: 2000 },
    ],
  },
  {
    id: 8,
    name: 'Hell Grounds',
    levelRange: [81, 100],
    monsters: [
      { id: 43, name: 'Iron Rider', level: 82, hp: 41900, minDamage: 485, maxDamage: 573, defense: 260, exp: 4200, zen: 2100 },
      { id: 44, name: 'Drakan', level: 86, hp: 50720, minDamage: 520, maxDamage: 579, defense: 270, exp: 5000, zen: 2500 },
      { id: 45, name: 'Gigantis', level: 98, hp: 70600, minDamage: 709, maxDamage: 774, defense: 380, exp: 6600, zen: 3300 },
      { id: 46, name: 'Great Drakan', level: 100, hp: 78750, minDamage: 737, maxDamage: 819, defense: 450, exp: 7000, zen: 3500 },
    ],
  },
  {
    id: 9,
    name: 'End Game',
    levelRange: [101, 180],
    monsters: [
      { id: 47, name: 'Genocider', level: 105, hp: 85990, minDamage: 787, maxDamage: 847, defense: 520, exp: 7600, zen: 3800 },
      { id: 48, name: 'Bloody Witch Queen', level: 120, hp: 114660, minDamage: 1102, maxDamage: 1209, defense: 870, exp: 9600, zen: 4800 },
      { id: 49, name: 'Zombie Fighter', level: 150, hp: 206850, minDamage: 1848, maxDamage: 2082, defense: 1500, exp: 15000, zen: 7500 },
      { id: 50, name: 'Gray Witch Queen', level: 170, hp: 352800, minDamage: 2974, maxDamage: 3132, defense: 1600, exp: 19000, zen: 9500 },
      { id: 51, name: 'Magma Ogre', level: 179, hp: 970200, minDamage: 3578, maxDamage: 3736, defense: 2048, exp: 20800, zen: 10400 },
    ],
  },
];

export function getLocationForLevel(level: number): Location {
  const location = LOCATIONS.find(
    (loc) => level >= loc.levelRange[0] && level <= loc.levelRange[1]
  );
  return location ?? LOCATIONS[0];
}

export function getLocationById(id: number): Location | undefined {
  return LOCATIONS.find((loc) => loc.id === id);
}
