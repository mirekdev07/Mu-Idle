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
      deaths,
      exp_per_second,
      zen_per_second,
      update_heartbeat = true, // Set to false for beforeunload saves
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

    // Calculate level ups if experience is provided
    const MAX_LEVEL = 400;
    let newExp = experience !== undefined ? BigInt(experience) : character.experience;
    let newLevel = level !== undefined ? level : character.level;
    let newPoints = levelup_points !== undefined ? levelup_points : character.levelupPoints;

    // Auto level up calculation
    if (experience !== undefined) {
      while (newExp >= BigInt(newLevel * 100) && newLevel < MAX_LEVEL) {
        newExp -= BigInt(newLevel * 100);
        newLevel++;
        newPoints += 5;
      }
      // Cap exp at 0 if max level
      if (newLevel >= MAX_LEVEL) {
        newExp = 0n;
      }
    }

    updateData.experience = newExp;
    updateData.level = newLevel;
    updateData.levelupPoints = newPoints;

    if (zen !== undefined) {
      updateData.zen = BigInt(zen);
    }
    if (monsters_killed !== undefined) {
      updateData.monstersKilled = monsters_killed;
    }
    if (deaths !== undefined) {
      updateData.deaths = deaths;
    }

    // Offline rewards: save production rates
    if (exp_per_second !== undefined) {
      updateData.lastExpPerSecond = exp_per_second;
    }
    if (zen_per_second !== undefined) {
      updateData.lastZenPerSecond = zen_per_second;
    }

    // Only update heartbeat during active gameplay (not on beforeunload)
    if (update_heartbeat) {
      updateData.lastHeartbeat = new Date();
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
        deaths: updatedCharacter.deaths,
        levelupPoints: updatedCharacter.levelupPoints,
      },
    });
  } catch (error) {
    console.error('Save progress error:', error);
    return errorResponse('Server error', 500);
  }
}
