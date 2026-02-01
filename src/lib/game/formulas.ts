import { Monster } from '@/types/game';
import { CalculatedStats } from '@/lib/services/stats.service';

// Experience required for next level
export function getExpForLevel(level: number): number {
  // Base * level^2 formula
  return 100 * level * level;
}

// Calculate player damage against monster
export function calculatePlayerDamage(
  stats: CalculatedStats,
  monsterDefense: number
): { damage: number; isCritical: boolean; isExcellent: boolean } {
  // Random damage between min and max
  const baseDamage = Math.floor(
    Math.random() * (stats.maxDamage - stats.minDamage + 1) + stats.minDamage
  );

  // Apply defense reduction (minimum 1 damage)
  let damage = Math.max(1, baseDamage - Math.floor(monsterDefense * 0.3));

  // Check for critical hit
  const isCritical = Math.random() * 100 < stats.criticalRate;
  if (isCritical) {
    damage = Math.floor(damage * (stats.criticalDamage / 100));
  }

  // Check for excellent damage (separate from critical)
  const isExcellent = stats.excellentDamage > 0 && Math.random() * 100 < 10;
  if (isExcellent) {
    damage = Math.floor(damage * (1 + stats.excellentDamage / 100));
  }

  return { damage, isCritical, isExcellent };
}

// Calculate monster damage against player
export function calculateMonsterDamage(
  monster: Monster,
  playerDefense: number,
  blockRate: number,
  damageDecrease: number
): { damage: number; isBlocked: boolean } {
  // Check for block
  const isBlocked = Math.random() * 100 < blockRate;
  if (isBlocked) {
    return { damage: 0, isBlocked: true };
  }

  // Random damage between min and max
  const baseDamage = Math.floor(
    Math.random() * (monster.maxDamage - monster.minDamage + 1) + monster.minDamage
  );

  // Apply defense reduction
  let damage = Math.max(1, baseDamage - Math.floor(playerDefense * 0.5));

  // Apply damage decrease percentage
  if (damageDecrease > 0) {
    damage = Math.floor(damage * (1 - damageDecrease / 100));
  }

  return { damage: Math.max(1, damage), isBlocked: false };
}

// Calculate life steal healing
export function calculateLifeSteal(damageDealt: number, lifeStealPercent: number): number {
  if (lifeStealPercent <= 0) return 0;
  return Math.floor(damageDealt * (lifeStealPercent / 100));
}

// Calculate EXP with bonus
export function calculateExp(baseExp: number, expBonusPercent: number): number {
  return Math.floor(baseExp * (1 + expBonusPercent / 100));
}

// Calculate Zen with bonus
export function calculateZen(baseZen: number, zenBonusPercent: number): number {
  return Math.floor(baseZen * (1 + zenBonusPercent / 100));
}

// Check if player can hit monster (attack rate vs defense rate)
export function canHitMonster(attackRate: number, monsterLevel: number): boolean {
  const monsterDefenseRate = monsterLevel * 2;
  const hitChance = Math.min(95, Math.max(5, 50 + (attackRate - monsterDefenseRate)));
  return Math.random() * 100 < hitChance;
}

// Calculate max HP
export function calculateMaxHp(level: number, vitality: number, maxHpBonusPercent: number = 0): number {
  const baseHp = Math.floor(100 + vitality * 7.5 + level * 10);
  if (maxHpBonusPercent > 0) {
    return Math.floor(baseHp * (1 + maxHpBonusPercent / 100));
  }
  return baseHp;
}

// Calculate HP recovery per tick
export function calculateHpRecovery(
  vitality: number,
  level: number,
  hpRecoveryBonusPercent: number = 0
): number {
  const levelBonus = Math.floor(level / 15);
  const baseRecovery = Math.floor(3 + vitality / 8 + levelBonus);
  if (hpRecoveryBonusPercent > 0) {
    return Math.floor(baseRecovery * (1 + hpRecoveryBonusPercent / 100));
  }
  return baseRecovery;
}

// Calculate attack speed in attacks per second
export function calculateAttacksPerSecond(attackSpeed: number): number {
  // Base: 1 attack per 2 seconds, each point of attack speed adds 0.05 attacks/sec
  const baseAps = 0.5;
  const bonusAps = attackSpeed * 0.05;
  return Math.min(5, baseAps + bonusAps); // Cap at 5 attacks per second
}

// Calculate attack interval in milliseconds
export function calculateAttackInterval(attackSpeed: number): number {
  const aps = calculateAttacksPerSecond(attackSpeed);
  return Math.floor(1000 / aps);
}
