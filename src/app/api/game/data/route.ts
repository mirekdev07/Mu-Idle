import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import { getInventory } from '@/lib/services/inventory.service';
import { getEquipment, getEquipmentBonuses } from '@/lib/services/equipment.service';
import { calculateStats } from '@/lib/services/stats.service';

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
      return errorResponse('No character found', 404);
    }

    // Get all data in parallel
    const [inventory, equipment, bonuses] = await Promise.all([
      getInventory(character.id),
      getEquipment(character.id),
      getEquipmentBonuses(character.id),
    ]);

    // Calculate stats
    const calculatedStats = calculateStats(
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
        class: character.classType,
        level: character.level,
        experience: character.experience.toString(),
        zen: character.zen.toString(),
        damage: character.damage,
        defense: character.defense,
        vitality: character.vitality,
        blockStat: character.blockStat,
        attackSpeedStat: character.attackSpeedStat,
        levelupPoints: character.levelupPoints,
        currentHp: character.currentHp,
        resetCount: character.resetCount,
        monstersKilled: character.monstersKilled,
        totalPlaytime: character.totalPlaytime,
      },
      inventory,
      equipment,
      bonuses,
      stats: calculatedStats,
    });
  } catch (error) {
    console.error('Get game data error:', error);
    return errorResponse('Failed to load game data', 500);
  }
}
