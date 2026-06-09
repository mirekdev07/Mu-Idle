import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { getMonsterForFloor, getScaledMonsterStats, MAX_DAILY_ENTRIES } from '@/lib/game/endless-tower';

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// GET - Get tower status and current floor
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (!characterId) {
      return errorResponse('Character ID required');
    }

    const character = await prisma.playerCharacter.findFirst({
      where: {
        id: parseInt(characterId),
        userId,
      },
      select: {
        id: true,
        towerFloor: true,
        towerMaxFloor: true,
        towerEntriesToday: true,
        lastTowerResetDate: true,
        towerInProgress: true,
      },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const now = new Date();
    let entriesToday = character.towerEntriesToday;

    // Reset daily entries if new day
    if (!character.lastTowerResetDate || !isSameDay(character.lastTowerResetDate, now)) {
      entriesToday = 0;
    }

    return NextResponse.json({
      success: true,
      currentFloor: character.towerFloor,
      maxFloor: character.towerMaxFloor,
      entriesToday,
      maxEntries: MAX_DAILY_ENTRIES,
      inProgress: character.towerInProgress,
    });
  } catch (error) {
    console.error('Tower GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Start tower run, get monster, or complete floor
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { characterId, action } = body;

    if (!characterId) {
      return errorResponse('Character ID required');
    }

    const character = await prisma.playerCharacter.findFirst({
      where: {
        id: characterId,
        userId,
      },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const now = new Date();
    let entriesToday = character.towerEntriesToday;

    // Reset daily entries if new day
    if (!character.lastTowerResetDate || !isSameDay(character.lastTowerResetDate, now)) {
      entriesToday = 0;
      await prisma.playerCharacter.update({
        where: { id: character.id },
        data: {
          towerEntriesToday: 0,
          lastTowerResetDate: now,
        },
      });
    }

    if (action === 'start') {
      // Start a new tower run
      if (entriesToday >= MAX_DAILY_ENTRIES) {
        return errorResponse(`Daily limit reached (${MAX_DAILY_ENTRIES}/${MAX_DAILY_ENTRIES})`);
      }

      if (character.towerInProgress) {
        return errorResponse('Tower run already in progress');
      }

      // Start new run
      await prisma.playerCharacter.update({
        where: { id: character.id },
        data: {
          towerFloor: 1,
          towerInProgress: true,
          towerEntriesToday: entriesToday + 1,
          lastTowerResetDate: now,
        },
      });

      // Get first floor monster
      const baseMonster = getMonsterForFloor(1);
      const monster = getScaledMonsterStats(baseMonster, 1);

      return NextResponse.json({
        success: true,
        message: 'Tower run started!',
        floor: 1,
        monster,
        entriesRemaining: MAX_DAILY_ENTRIES - entriesToday - 1,
      });
    }

    if (action === 'get_monster') {
      // Get monster for current floor
      if (!character.towerInProgress) {
        return errorResponse('No tower run in progress');
      }

      const floor = character.towerFloor;
      const baseMonster = getMonsterForFloor(floor);
      const monster = getScaledMonsterStats(baseMonster, floor);

      return NextResponse.json({
        success: true,
        floor,
        monster,
      });
    }

    if (action === 'complete_floor') {
      // Player defeated the monster, advance to next floor
      if (!character.towerInProgress) {
        return errorResponse('No tower run in progress');
      }

      const currentFloor = character.towerFloor;
      const nextFloor = currentFloor + 1;

      // Calculate rewards for this floor
      const baseMonster = getMonsterForFloor(currentFloor);
      const monster = getScaledMonsterStats(baseMonster, currentFloor);

      // Update floor and give rewards
      const newMaxFloor = Math.max(character.towerMaxFloor, currentFloor);

      await prisma.playerCharacter.update({
        where: { id: character.id },
        data: {
          towerFloor: nextFloor,
          towerMaxFloor: newMaxFloor,
          experience: { increment: BigInt(monster.exp) },
          zen: { increment: BigInt(monster.zen) },
        },
      });

      // Get next floor monster
      const nextBaseMonster = getMonsterForFloor(nextFloor);
      const nextMonster = getScaledMonsterStats(nextBaseMonster, nextFloor);

      return NextResponse.json({
        success: true,
        message: `Floor ${currentFloor} cleared!`,
        rewards: {
          exp: monster.exp,
          zen: monster.zen,
        },
        nextFloor,
        nextMonster,
        newMaxFloor: newMaxFloor > character.towerMaxFloor ? newMaxFloor : null,
      });
    }

    if (action === 'defeat') {
      // Player was defeated, end run
      if (!character.towerInProgress) {
        return errorResponse('No tower run in progress');
      }

      const finalFloor = character.towerFloor;

      await prisma.playerCharacter.update({
        where: { id: character.id },
        data: {
          towerInProgress: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: `You were defeated on floor ${finalFloor}!`,
        finalFloor,
        maxFloor: character.towerMaxFloor,
        entriesRemaining: MAX_DAILY_ENTRIES - entriesToday,
      });
    }

    if (action === 'exit') {
      // Player chose to exit, end run
      if (!character.towerInProgress) {
        return errorResponse('No tower run in progress');
      }

      const finalFloor = character.towerFloor;

      await prisma.playerCharacter.update({
        where: { id: character.id },
        data: {
          towerInProgress: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: `You exited the tower at floor ${finalFloor}.`,
        finalFloor,
        maxFloor: character.towerMaxFloor,
        entriesRemaining: MAX_DAILY_ENTRIES - entriesToday,
      });
    }

    return errorResponse('Invalid action');
  } catch (error) {
    console.error('Tower POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
