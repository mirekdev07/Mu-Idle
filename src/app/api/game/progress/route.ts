import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import {
  getCharacterById,
  getLatestCharacter,
  updateCharacterProgress,
  calculateLevelUp,
} from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      character_id,
      experience_gained,
      zen_gained,
      monsters_killed,
      playtime_seconds,
    } = body;

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

    // Calculate new experience and potential level ups
    const currentExp = character.experience;
    const newTotalExp = currentExp + BigInt(experience_gained || 0);

    const levelUpResult = calculateLevelUp(character.level, newTotalExp);

    // Update character
    await updateCharacterProgress(character.id, {
      level: levelUpResult.newLevel,
      experience: levelUpResult.remainingExp,
      zen: character.zen + BigInt(zen_gained || 0),
      monstersKilled: character.monstersKilled + (monsters_killed || 0),
      totalPlaytime: character.totalPlaytime + (playtime_seconds || 0),
    });

    // Add levelup points if leveled up
    if (levelUpResult.pointsGained > 0) {
      await prisma.playerCharacter.update({
        where: { id: character.id },
        data: {
          levelupPoints: { increment: levelUpResult.pointsGained },
        },
      });
    }

    // Return updated character data
    const updatedCharacter = await getCharacterById(character.id, userId);

    return NextResponse.json({
      success: true,
      leveledUp: levelUpResult.newLevel > character.level,
      levelsGained: levelUpResult.newLevel - character.level,
      pointsGained: levelUpResult.pointsGained,
      character: {
        id: updatedCharacter!.id,
        level: updatedCharacter!.level,
        experience: updatedCharacter!.experience.toString(),
        zen: updatedCharacter!.zen.toString(),
        monstersKilled: updatedCharacter!.monstersKilled,
        totalPlaytime: updatedCharacter!.totalPlaytime,
        levelupPoints: updatedCharacter!.levelupPoints,
      },
    });
  } catch (error) {
    console.error('Save progress error:', error);
    return errorResponse('Server error', 500);
  }
}
