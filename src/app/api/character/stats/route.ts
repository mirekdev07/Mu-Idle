import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import { getEquipmentBonuses, calculateStats, calculateUpgradeCost, calculateMaxUpgrades } from '@/lib/services/stats.service';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const characterIdParam = searchParams.get('character_id');

  try {
    let character;
    if (characterIdParam) {
      character = await getCharacterById(parseInt(characterIdParam, 10), userId);
    }
    if (!character) {
      character = await getLatestCharacter(userId);
    }
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const bonuses = await getEquipmentBonuses(character.id);
    const stats = calculateStats(
      {
        id: character.id,
        level: character.level,
        damage: character.damage,
        defense: character.defense,
        vitality: character.vitality,
        speedStat: character.speedStat,
      },
      bonuses
    );

    // Calculate upgrade costs
    const zen = BigInt(character.zen);
    const upgradeCosts = {
      dmg: calculateUpgradeCost(character.damage, 1).toString(),
      def: calculateUpgradeCost(character.defense, 1).toString(),
      speed: calculateUpgradeCost(character.speedStat, 1).toString(),
      hp: calculateUpgradeCost(character.vitality, 1).toString(),
    };

    return NextResponse.json({
      success: true,
      character: {
        id: character.id,
        name: character.characterName,
        level: character.level,
        zen: character.zen.toString(),
        // Stat levels
        dmgLevel: character.damage,
        defLevel: character.defense,
        speedLevel: character.speedStat,
        hpLevel: character.vitality,
      },
      stats: {
        minDamage: stats.minDamage,
        maxDamage: stats.maxDamage,
        physicalDefense: stats.physicalDefense,
        attackSpeed: stats.attackSpeed,
        maxHp: stats.maxHp,
        criticalRate: stats.criticalRate,
      },
      upgradeCosts,
      bonuses,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return errorResponse('Server error', 500);
  }
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, stat_name, amount = 1 } = body;

    const validStats = ['dmg', 'def', 'speed', 'hp'];
    if (!stat_name || !validStats.includes(stat_name)) {
      return errorResponse('Invalid stat name');
    }

    let character;
    if (character_id) {
      character = await getCharacterById(character_id, userId);
    }
    if (!character) {
      character = await getLatestCharacter(userId);
    }
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Map stat names to database columns
    const statMap: Record<string, 'damage' | 'defense' | 'speedStat' | 'vitality'> = {
      dmg: 'damage',
      def: 'defense',
      speed: 'speedStat',
      hp: 'vitality',
    };

    const dbColumn = statMap[stat_name];
    const currentLevel = character[dbColumn];
    const zen = BigInt(character.zen);

    // Handle 'max' amount
    let upgradeAmount = amount;
    if (amount === 'max' || amount === -1) {
      upgradeAmount = calculateMaxUpgrades(currentLevel, zen);
      if (upgradeAmount === 0) {
        return errorResponse('Not enough zen for even one upgrade');
      }
    }

    // Calculate cost
    const cost = calculateUpgradeCost(currentLevel, upgradeAmount);

    if (zen < cost) {
      return errorResponse('Not enough zen');
    }

    // Update character
    const newLevel = currentLevel + upgradeAmount;
    const newZen = zen - cost;

    await prisma.playerCharacter.update({
      where: { id: character.id },
      data: {
        [dbColumn]: newLevel,
        zen: newZen,
      },
    });

    // Get updated stats
    const bonuses = await getEquipmentBonuses(character.id);
    const updatedCharacter = {
      ...character,
      [dbColumn]: newLevel,
      zen: newZen,
    };

    const stats = calculateStats(
      {
        id: updatedCharacter.id,
        level: updatedCharacter.level,
        damage: updatedCharacter.damage,
        defense: updatedCharacter.defense,
        vitality: updatedCharacter.vitality,
        speedStat: updatedCharacter.speedStat,
      },
      bonuses
    );

    // Calculate new upgrade costs
    const upgradeCosts = {
      dmg: calculateUpgradeCost(updatedCharacter.damage, 1).toString(),
      def: calculateUpgradeCost(updatedCharacter.defense, 1).toString(),
      speed: calculateUpgradeCost(updatedCharacter.speedStat, 1).toString(),
      hp: calculateUpgradeCost(updatedCharacter.vitality, 1).toString(),
    };

    return NextResponse.json({
      success: true,
      stat: stat_name,
      newLevel,
      cost: cost.toString(),
      zen: newZen.toString(),
      stats: {
        minDamage: stats.minDamage,
        maxDamage: stats.maxDamage,
        physicalDefense: stats.physicalDefense,
        attackSpeed: stats.attackSpeed,
        maxHp: stats.maxHp,
        criticalRate: stats.criticalRate,
      },
      upgradeCosts,
    });
  } catch (error) {
    console.error('Upgrade stat error:', error);
    return errorResponse('Server error', 500);
  }
}
