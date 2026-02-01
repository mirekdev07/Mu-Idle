import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter, addStatPoint } from '@/lib/services/character.service';
import { getEquipmentBonuses, calculateStats } from '@/lib/services/stats.service';

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
        blockStat: character.blockStat,
        attackSpeedStat: character.attackSpeedStat,
      },
      bonuses
    );

    return NextResponse.json({
      success: true,
      character: {
        id: character.id,
        name: character.characterName,
        level: character.level,
        damage: character.damage,
        defense: character.defense,
        vitality: character.vitality,
        block: character.blockStat,
        attackSpeed: character.attackSpeedStat,
        levelupPoints: character.levelupPoints,
      },
      stats: {
        minDamage: stats.minDamage,
        maxDamage: stats.maxDamage,
        physicalDefense: stats.physicalDefense,
        attackSpeed: stats.attackSpeed,
        maxHp: stats.maxHp,
        criticalRate: stats.criticalRate,
      },
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
    const { character_id, stat_name } = body;

    const validStats = ['damage', 'defense', 'vitality', 'blockStat', 'attackSpeedStat'];
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

    const result = await addStatPoint(character.id, stat_name as 'damage' | 'defense' | 'vitality' | 'blockStat' | 'attackSpeedStat');

    if (!result.success) {
      return errorResponse(result.message ?? 'Failed to add stat point');
    }

    // Get updated character and stats
    const updatedCharacter = await getCharacterById(character.id, userId);
    if (!updatedCharacter) {
      return errorResponse('Character not found after update', 404);
    }

    const bonuses = await getEquipmentBonuses(updatedCharacter.id);
    const stats = calculateStats(
      {
        id: updatedCharacter.id,
        level: updatedCharacter.level,
        damage: updatedCharacter.damage,
        defense: updatedCharacter.defense,
        vitality: updatedCharacter.vitality,
        blockStat: updatedCharacter.blockStat,
        attackSpeedStat: updatedCharacter.attackSpeedStat,
      },
      bonuses
    );

    return NextResponse.json({
      success: true,
      newValue: result.newValue,
      remainingPoints: updatedCharacter.levelupPoints,
      stats: {
        minDamage: stats.minDamage,
        maxDamage: stats.maxDamage,
        physicalDefense: stats.physicalDefense,
        attackSpeed: stats.attackSpeed,
        maxHp: stats.maxHp,
        criticalRate: stats.criticalRate,
      },
    });
  } catch (error) {
    console.error('Add stat point error:', error);
    return errorResponse('Server error', 500);
  }
}
