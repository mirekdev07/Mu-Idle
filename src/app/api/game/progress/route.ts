import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      character_id,
      experience,
      zen,
      level,
      levelup_points,
      monsters_killed,
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

    // Update character with provided values
    const updateData: Record<string, unknown> = {
      lastPlayed: new Date(),
    };

    if (experience !== undefined) {
      updateData.experience = BigInt(experience);
    }
    if (zen !== undefined) {
      updateData.zen = BigInt(zen);
    }
    if (level !== undefined) {
      updateData.level = level;
    }
    if (levelup_points !== undefined) {
      updateData.levelupPoints = levelup_points;
    }
    if (monsters_killed !== undefined) {
      updateData.monstersKilled = monsters_killed;
    }

    const updatedCharacter = await prisma.playerCharacter.update({
      where: { id: character.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      character: {
        id: updatedCharacter.id,
        level: updatedCharacter.level,
        experience: updatedCharacter.experience.toString(),
        zen: updatedCharacter.zen.toString(),
        monstersKilled: updatedCharacter.monstersKilled,
        levelupPoints: updatedCharacter.levelupPoints,
      },
    });
  } catch (error) {
    console.error('Save progress error:', error);
    return errorResponse('Server error', 500);
  }
}
