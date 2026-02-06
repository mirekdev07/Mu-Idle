import { EquipmentBonuses, DEFAULT_EQUIPMENT_BONUSES } from '@/types/game';
import prisma from '@/lib/prisma';

export interface CharacterForStats {
  id: number;
  level: number;
  damage: number;      // DMG stat level
  defense: number;     // DEF stat level
  vitality: number;    // HP stat level
  speedStat: number;   // Speed stat level
  // Ascension bonuses
  ascDamage?: number;    // +2% damage per point
  ascCritical?: number;  // +1% crit rate per point
  ascHealth?: number;    // +5% HP per point
  ascLifeSteal?: number; // +0.5% life steal per point
  ascZen?: number;       // +3% zen per point
  ascExp?: number;       // +2% EXP per point
  ascPoison?: number;    // +0.5% poison chance per point
  ascExcellent?: number; // +0.25% excellent damage chance per point
}

export interface CalculatedStats {
  minDamage: number;
  maxDamage: number;
  physicalDefense: number;
  attackRate: number;
  attackSpeed: number;
  defenseRate: number;
  blockRate: number;
  maxHp: number;
  maxMana: number;
  criticalRate: number;
  criticalDamage: number;
  movementSpeed: number;
  sd: number;
  lifeSteal: number;
  expBonus: number;
  zenBonus: number;
  excellentDamage: number;
  excellentChance: number;   // % chance for excellent hit (2x damage)
  poisonChance: number;      // % chance for poison (10% of monster current HP)
  hpRecovery: {
    base: number;
    final: number;
    bonusPercent: number;
  };
}

// Calculate upgrade cost for a stat
export function calculateUpgradeCost(currentLevel: number, amount: number = 1): bigint {
  const BASE_COST = 50n;
  let totalCost = 0n;

  for (let i = 0; i < amount; i++) {
    const level = currentLevel + i;
    // Cost formula: 50 * level^1.5
    const cost = BASE_COST * BigInt(Math.floor(Math.pow(level, 1.5)));
    totalCost += cost;
  }

  return totalCost;
}

// Calculate max upgrades affordable with given zen
export function calculateMaxUpgrades(currentLevel: number, availableZen: bigint): number {
  let upgrades = 0;
  let totalCost = 0n;

  while (upgrades < 10000) { // Safety limit
    const nextCost = calculateUpgradeCost(currentLevel + upgrades, 1);
    if (totalCost + nextCost > availableZen) break;
    totalCost += nextCost;
    upgrades++;
  }

  return upgrades;
}

export async function getEquipmentBonuses(characterId: number): Promise<EquipmentBonuses> {
  const equipment = await prisma.characterEquipment.findMany({
    where: { characterId },
  });

  const bonuses: EquipmentBonuses = { ...DEFAULT_EQUIPMENT_BONUSES };

  for (const item of equipment) {
    // Weapons (slot 0) add damage, armor (slots 1-6) adds defense
    const isWeapon = item.slot === 0;

    if (isWeapon) {
      // Weapons add damage and attack speed
      bonuses.damage_min += item.damageMin;
      bonuses.damage_max += item.damageMax;
      bonuses.attack_speed += item.attackSpeed;
    } else {
      // Armor adds defense
      bonuses.defense += item.defenseValue;
    }

    // Process options
    if (item.itemOptions) {
      try {
        const options = JSON.parse(item.itemOptions) as Array<{ type: string; value: number }>;
        for (const option of options) {
          switch (option.type) {
            case 'critical_rate':
              bonuses.critical_rate += option.value;
              break;
            case 'attack_speed':
              bonuses.attack_speed_percent += option.value;
              break;
            case 'life_steal':
              bonuses.life_steal += option.value;
              break;
            case 'extra_damage':
              bonuses.damage_percent += option.value;
              break;
            case 'extra_defense':
              bonuses.defense_percent += option.value;
              break;
            case 'exp_bonus':
              bonuses.exp_bonus += option.value;
              break;
            case 'zen_bonus':
              bonuses.zen_bonus += option.value;
              break;
            case 'excellent_damage':
              bonuses.excellent_damage += option.value;
              break;
            case 'critical_damage':
              bonuses.critical_damage += option.value;
              break;
            case 'hp_recovery':
              bonuses.hp_recovery += option.value;
              break;
            case 'damage_decrease':
              bonuses.damage_decrease += option.value;
              break;
            case 'max_hp':
              bonuses.max_hp += option.value;
              break;
            case 'reflect_damage':
              bonuses.reflect_damage += option.value;
              break;
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  return bonuses;
}

export function calculateStats(
  character: CharacterForStats,
  bonuses: EquipmentBonuses
): CalculatedStats {
  // Ascension bonuses (default to 0 if not provided)
  const ascDamage = character.ascDamage || 0;
  const ascCritical = character.ascCritical || 0;
  const ascHealth = character.ascHealth || 0;
  const ascLifeSteal = character.ascLifeSteal || 0;
  const ascZen = character.ascZen || 0;
  const ascExp = character.ascExp || 0;
  const ascPoison = character.ascPoison || 0;
  const ascExcellent = character.ascExcellent || 0;

  // DMG stat: each level adds 2 min damage and 3 max damage
  let minDamage = character.damage * 2 + bonuses.damage_min;
  let maxDamage = character.damage * 3 + bonuses.damage_max;

  // Apply equipment damage percent bonus
  if (bonuses.damage_percent > 0) {
    minDamage = Math.floor(minDamage * (1 + bonuses.damage_percent / 100));
    maxDamage = Math.floor(maxDamage * (1 + bonuses.damage_percent / 100));
  }

  // Apply ascension damage bonus (+2% per point)
  if (ascDamage > 0) {
    minDamage = Math.floor(minDamage * (1 + ascDamage * 2 / 100));
    maxDamage = Math.floor(maxDamage * (1 + ascDamage * 2 / 100));
  }

  // DEF stat: each level adds 1 defense
  let physicalDefense = character.defense + bonuses.defense;
  if (bonuses.defense_percent > 0) {
    physicalDefense = Math.floor(physicalDefense * (1 + bonuses.defense_percent / 100));
  }

  // Attack Rate: based on level and damage stat
  const attackRate = Math.floor(character.level * 3 + character.damage * 0.5);

  // Speed stat: each level adds 1 attack speed (max 350)
  let attackSpeed = character.speedStat + bonuses.attack_speed;
  if (bonuses.attack_speed_percent > 0) {
    attackSpeed = Math.floor(attackSpeed * (1 + bonuses.attack_speed_percent / 100));
  }
  attackSpeed = Math.min(350, attackSpeed);

  // Defense Rate: based on level and defense stat
  const defenseRate = Math.floor(character.level * 2 + character.defense * 0.3);

  // Block Rate: fixed low value (no block stat anymore)
  const blockRate = 5;

  // HP stat: base 50 + each level adds 10 HP
  let maxHp = 50 + character.vitality * 10;

  // Apply equipment HP bonus
  if (bonuses.max_hp > 0) {
    maxHp = Math.floor(maxHp * (1 + bonuses.max_hp / 100));
  }

  // Apply ascension health bonus (+5% per point)
  if (ascHealth > 0) {
    maxHp = Math.floor(maxHp * (1 + ascHealth * 5 / 100));
  }

  // Max Mana: based on vitality and level
  const maxMana = Math.floor(50 + character.vitality * 5 + character.level * 10);

  // Critical Rate: base 5% + level bonus + equipment + ascension (+1% per point)
  const baseCritRate = Math.floor(Math.min(25, 5 + character.level / 50));
  const criticalRate = Math.min(50, baseCritRate + bonuses.critical_rate + ascCritical);

  // Critical Damage: base 150% + equipment bonus
  const criticalDamage = 150 + bonuses.critical_damage;

  // Movement Speed: fixed
  const movementSpeed = 100;

  // Shield Defense: based on level and defense
  const sd = Math.floor(character.level * 30 + character.defense * 2);

  // HP Recovery: base 5 + vitality bonus
  const baseHpRecovery = Math.floor(5 + character.vitality / 5);
  let finalHpRecovery = baseHpRecovery;
  if (bonuses.hp_recovery > 0) {
    finalHpRecovery = Math.floor(baseHpRecovery * (1 + bonuses.hp_recovery / 100));
  }

  // Life steal: equipment + ascension (+0.5% per point)
  const lifeSteal = bonuses.life_steal + ascLifeSteal * 0.5;

  // EXP bonus: equipment + ascension (+2% per point)
  const expBonus = bonuses.exp_bonus + ascExp * 2;

  // Zen bonus: equipment + ascension (+3% per point)
  const zenBonus = bonuses.zen_bonus + ascZen * 3;

  // Poison chance: ascension only (+0.5% per point)
  const poisonChance = ascPoison * 0.5;

  // Excellent chance: base 5% + ascension (+0.25% per point)
  const excellentChance = 5 + ascExcellent * 0.25;

  return {
    minDamage,
    maxDamage,
    physicalDefense,
    attackRate,
    attackSpeed,
    defenseRate,
    blockRate,
    maxHp,
    maxMana,
    criticalRate,
    criticalDamage,
    movementSpeed,
    sd,
    lifeSteal,
    expBonus,
    zenBonus,
    excellentDamage: bonuses.excellent_damage,
    excellentChance,
    poisonChance,
    hpRecovery: {
      base: baseHpRecovery,
      final: finalHpRecovery,
      bonusPercent: bonuses.hp_recovery,
    },
  };
}
