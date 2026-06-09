import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    // Support both JSON and text/plain (for sendBeacon)
    const contentType = request.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // sendBeacon sends as text/plain
      const text = await request.text();
      body = JSON.parse(text);
    }
    const {
      character_id,
      experience,
      zen,
      level,
      monsters_killed,
      deaths,
      exp_per_second,
      zen_per_second,
      update_heartbeat = true, // Set to false for beforeunload saves
      kills_gained = 0, // For quest tracking
      exp_gained = 0, // For quest tracking
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

    // Auto level up calculation (quadratic formula: level² × 2.8125 - reduced 25%)
    if (experience !== undefined) {
      while (newExp >= BigInt(Math.floor(newLevel * newLevel * 2.8125)) && newLevel < MAX_LEVEL) {
        newExp -= BigInt(Math.floor(newLevel * newLevel * 2.8125));
        newLevel++;
      }
      // Cap exp at 0 if max level
      if (newLevel >= MAX_LEVEL) {
        newExp = 0n;
      }
    }

    updateData.experience = newExp;
    updateData.level = newLevel;

    if (zen !== undefined) {
      updateData.zen = BigInt(zen);
    }
    if (monsters_killed !== undefined) {
      updateData.monstersKilled = monsters_killed;
    }
    if (deaths !== undefined) {
      updateData.deaths = deaths;
    }

    // Offline rewards: save production rates (only if positive, don't overwrite with 0)
    if (exp_per_second !== undefined && exp_per_second > 0) {
      updateData.lastExpPerSecond = exp_per_second;
    }
    if (zen_per_second !== undefined && zen_per_second > 0) {
      updateData.lastZenPerSecond = zen_per_second;
    }

    // Only update heartbeat during active gameplay (not on beforeunload)
    if (update_heartbeat) {
      updateData.lastHeartbeat = new Date();
    }

    // Update quest progress (kills and exp)
    const now = new Date();
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    // Check if quest needs reset
    let currentQuestKills = character.questKillsToday;
    let currentQuestExp = character.questExpToday;

    if (!character.lastQuestResetDate || !isSameDay(character.lastQuestResetDate, now)) {
      currentQuestKills = 0;
      currentQuestExp = BigInt(0);
      updateData.lastQuestResetDate = now;
      updateData.questEventToday = false;
      updateData.questBossToday = false;
      updateData.questCraftToday = false;
      updateData.questResetToday = false;
      updateData.claimedQuests = '[]';
    }

    // Add kills and exp to quest progress
    if (kills_gained > 0) {
      updateData.questKillsToday = currentQuestKills + kills_gained;
    }
    if (exp_gained > 0) {
      updateData.questExpToday = currentQuestExp + BigInt(exp_gained);
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
      },
    });
  } catch (error) {
    console.error('Save progress error:', error);
    return errorResponse('Server error', 500);
  }
}
