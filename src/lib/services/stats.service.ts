import { EquipmentBonuses, DEFAULT_EQUIPMENT_BONUSES } from '@/types/game';
import prisma from '@/lib/prisma';

export interface CharacterForStats {
  id: number;
  level: number;
  damage: number;
  defense: number;
  vitality: number;
  blockStat: number;
  attackSpeedStat: number;
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
  hpRecovery: {
    base: number;
    final: number;
    bonusPercent: number;
  };
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
  // Min Damage: 110% of damage stat + equipment bonus
  let minDamage = Math.floor(character.damage * 1.1) + bonuses.damage_min;
  if (bonuses.damage_percent > 0) {
    minDamage = Math.floor(minDamage * (1 + bonuses.damage_percent / 100));
  }

  // Max Damage: 160% of damage stat + equipment bonus
  let maxDamage = Math.floor(character.damage * 1.6) + bonuses.damage_max;
  if (bonuses.damage_percent > 0) {
    maxDamage = Math.floor(maxDamage * (1 + bonuses.damage_percent / 100));
  }

  // Physical Defense: defense stat * 0.5 + equipment bonus
  let physicalDefense = Math.floor(character.defense * 0.5) + bonuses.defense;
  if (bonuses.defense_percent > 0) {
    physicalDefense = Math.floor(physicalDefense * (1 + bonuses.defense_percent / 100));
  }

  // Attack Rate: (level * 3) + (damage * 0.5)
  const attackRate = Math.floor(character.level * 3 + character.damage * 0.5);

  // Attack Speed: attack_speed_stat * 0.1 + agility * 0.15 + equipment bonus (max 200)
  let attackSpeed = Math.floor(character.attackSpeedStat * 0.1 + character.defense * 0.15) + bonuses.attack_speed;
  if (bonuses.attack_speed_percent > 0) {
    attackSpeed = Math.floor(attackSpeed * (1 + bonuses.attack_speed_percent / 100));
  }
  attackSpeed = Math.min(200, attackSpeed);

  // Defense Rate: (level * 2) + (defense * 0.3)
  const defenseRate = Math.floor(character.level * 2 + character.defense * 0.3);

  // Block Rate: block stat * 0.12
  const blockRate = Math.floor(character.blockStat * 0.12);

  // Max HP: base 100 + (vitality * 5) + (level * 3)
  let maxHp = Math.floor(100 + character.vitality * 5 + character.level * 3);
  if (bonuses.max_hp > 0) {
    maxHp = Math.floor(maxHp * (1 + bonuses.max_hp / 100));
  }

  // Max Mana: base 50 + (vitality * 8) + (level * 15)
  const maxMana = Math.floor(50 + character.vitality * 8 + character.level * 15);

  // Critical Rate: base 1% + level/40 + damage/200, max 25%
  const baseCritRate = Math.floor(Math.min(25, 1 + character.level / 40 + character.damage / 200));
  const criticalRate = Math.min(25, baseCritRate + bonuses.critical_rate);

  // Critical Damage: base 130% + (damage * 0.10) + equipment bonus
  const criticalDamage = Math.floor(130 + character.damage * 0.1) + bonuses.critical_damage;

  // Movement Speed: 100 + (vitality * 0.3) - (defense * 0.1)
  const movementSpeed = Math.floor(100 + character.vitality * 0.3 - character.defense * 0.1);

  // Shield Defense: (level * 30) + (defense * 2)
  const sd = Math.floor(character.level * 30 + character.defense * 2);

  // HP Recovery: Base 3 + (vitality / 8) + (level / 15)
  const levelBonus = Math.floor(character.level / 15);
  const baseHpRecovery = Math.floor(3 + character.vitality / 8 + levelBonus);
  let finalHpRecovery = baseHpRecovery;
  if (bonuses.hp_recovery > 0) {
    finalHpRecovery = Math.floor(baseHpRecovery * (1 + bonuses.hp_recovery / 100));
  }

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
    lifeSteal: bonuses.life_steal,
    expBonus: bonuses.exp_bonus,
    zenBonus: bonuses.zen_bonus,
    excellentDamage: bonuses.excellent_damage,
    hpRecovery: {
      base: baseHpRecovery,
      final: finalHpRecovery,
      bonusPercent: bonuses.hp_recovery,
    },
  };
}
