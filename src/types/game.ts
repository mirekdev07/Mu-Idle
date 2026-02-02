// ==================== ITEM TYPES ====================

export interface ItemOption {
  type: string;
  value: number;
  display: string;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;           // unique instance ID
  name: string;
  type: string;         // item type from DB
  category: number;     // 0-11, maps to equipment slot
  level: number;
  damage_min: number;
  damage_max: number;
  attack_speed: number;
  defense: number;
  rarity: ItemRarity;
  enhancementLevel?: number;
  options?: ItemOption[];
  emoji: string;
  image_path?: string;
}

export interface InventorySlot {
  item: Item | null;
  slotIndex: number;
}

// ==================== EQUIPMENT TYPES ====================

export interface Equipment {
  weapon?: Item;      // slot 0
  shield?: Item;      // slot 1
  helm?: Item;        // slot 2
  armor?: Item;       // slot 3
  pants?: Item;       // slot 4
  gloves?: Item;      // slot 5
  boots?: Item;       // slot 6
}

export type EquipmentSlotKey = keyof Equipment;

export interface EquipmentSlotDef {
  key: EquipmentSlotKey;
  name: string;
  icon: string;
  categories: number[]; // which item categories can go here
}

export const EQUIPMENT_SLOTS: EquipmentSlotDef[] = [
  { key: 'weapon', name: 'Weapon', icon: '⚔️', categories: [0, 1, 2, 3, 4, 5] },
  { key: 'shield', name: 'Shield', icon: '🛡️', categories: [6] },
  { key: 'helm', name: 'Helm', icon: '⛑️', categories: [7] },
  { key: 'armor', name: 'Armor', icon: '🦺', categories: [8] },
  { key: 'pants', name: 'Pants', icon: '👖', categories: [9] },
  { key: 'gloves', name: 'Gloves', icon: '🧤', categories: [10] },
  { key: 'boots', name: 'Boots', icon: '🥾', categories: [11] },
];

// ==================== CHARACTER TYPES ====================

export interface CharacterStats {
  damage_min: number;
  damage_max: number;
  attack_speed: number;
  defense: number;
  vitality: number;
  block: number;
  level: number;
}

export interface EquipmentBonuses {
  damage_min: number;
  damage_max: number;
  attack_speed: number;
  defense: number;
  critical_rate: number;
  life_steal: number;
  exp_bonus: number;
  zen_bonus: number;
  attack_speed_percent: number;
  damage_percent: number;
  defense_percent: number;
  excellent_damage: number;
  critical_damage: number;
  hp_recovery: number;
  damage_decrease: number;
  max_hp: number;
  reflect_damage: number;
}

export const DEFAULT_EQUIPMENT_BONUSES: EquipmentBonuses = {
  damage_min: 0,
  damage_max: 0,
  attack_speed: 0,
  defense: 0,
  critical_rate: 0,
  life_steal: 0,
  exp_bonus: 0,
  zen_bonus: 0,
  attack_speed_percent: 0,
  damage_percent: 0,
  defense_percent: 0,
  excellent_damage: 0,
  critical_damage: 0,
  hp_recovery: 0,
  damage_decrease: 0,
  max_hp: 0,
  reflect_damage: 0,
};

export type CharacterClass = 'Dark Knight' | 'Dark Wizard' | 'Elf' | 'Magic Gladiator' | 'Dark Lord';

export interface Character {
  id: number;
  userId: number;
  characterName: string;
  classType: CharacterClass;
  level: number;
  experience: bigint;
  zen: bigint;
  totalPlaytime: number;
  monstersKilled: number;
  damage: number;
  defense: number;
  vitality: number;
  blockStat: number;
  attackSpeedStat: number;
  levelupPoints: number;
  currentHp: number | null;
  resetCount: number;
}

// ==================== GAME STATE ====================

export interface GameState {
  inventory: InventorySlot[];
  equipment: Equipment;
  equipmentBonuses: EquipmentBonuses;
  characterStats: CharacterStats;
  isLoading: boolean;
  error: string | null;
  hoveredItem: Item | null;
  tooltipPosition: { x: number; y: number } | null;
}

// ==================== API TYPES ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface EquipResponse extends ApiResponse {
  inventory: (Item | null)[];
  equipment: Equipment;
  bonuses: EquipmentBonuses;
}

export interface InventoryResponse extends ApiResponse {
  inventory: (Item | null)[];
}

export interface EquipmentResponse extends ApiResponse {
  equipment: Equipment;
}

export interface StatsResponse extends ApiResponse {
  stats: CharacterStats;
  character?: Character;
}

export interface GameDataResponse extends ApiResponse {
  character: Character;
  inventory: (Item | null)[];
  equipment: Equipment;
  bonuses: EquipmentBonuses;
}

// ==================== MONSTER & LOCATION TYPES ====================

export interface Monster {
  id: number;
  name: string;
  level: number;
  hp: number;
  minDamage: number;
  maxDamage: number;
  defense: number;
  exp: number;
  zen: number;
  emoji?: string;
  image?: string;
}

export interface Location {
  id: number;
  name: string;
  levelRange: [number, number];
  monsters: Monster[];
  background?: string;
}
