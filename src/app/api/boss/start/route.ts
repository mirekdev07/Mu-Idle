import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { getBossById } from '@/lib/game/bosses';

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// POST - Start a boss fight (consumes daily attempt)
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { characterId, bossId } = body;

    if (!characterId || !bossId) {
      return errorResponse('Character ID and Boss ID required');
    }

    const boss = getBossById(bossId);
    if (!boss) {
      return errorResponse('Boss not found', 404);
    }

    const character = await prisma.playerCharacter.findFirst({
      where: {
        id: characterId,
        userId,
      },
      include: {
        inventory: true,
      },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Check level requirement
    if (character.level < boss.requiredLevel) {
      return errorResponse(`You need to be level ${boss.requiredLevel} to fight this boss`);
    }

    // Check daily limit
    const now = new Date();
    let boss1Kills = character.boss1KillsToday;
    let boss2Kills = character.boss2KillsToday;

    // Reset if new day
    if (!character.lastBossResetDate || !isSameDay(character.lastBossResetDate, now)) {
      boss1Kills = 0;
      boss2Kills = 0;
    }

    const currentKills = bossId === 1 ? boss1Kills : boss2Kills;
    if (currentKills >= boss.dailyLimit) {
      return NextResponse.json({
        error: `You have already killed ${boss.name} ${boss.dailyLimit} times today`
      }, { status: 400 });
    }

    // Check for empty inventory slots (need 3 slots for potential drops)
    const usedSlots = new Set(character.inventory.map(inv => inv.slotIndex));
    let emptySlotCount = 0;
    for (let i = 0; i < 24; i++) {
      if (!usedSlots.has(i)) {
        emptySlotCount++;
        if (emptySlotCount >= 3) break;
      }
    }

    if (emptySlotCount < 3) {
      return NextResponse.json({
        error: 'You need at least 3 empty inventory slots for boss drops'
      }, { status: 400 });
    }

    // Consume the attempt NOW (before battle starts)
    const updateData: Record<string, unknown> = {
      lastBossResetDate: now,
    };

    if (bossId === 1) {
      updateData.boss1KillsToday = boss1Kills + 1;
      updateData.boss2KillsToday = boss2Kills;
    } else {
      updateData.boss1KillsToday = boss1Kills;
      updateData.boss2KillsToday = boss2Kills + 1;
    }

    await prisma.playerCharacter.update({
      where: { id: character.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Battle started against ${boss.name}!`,
      killsRemaining: boss.dailyLimit - (currentKills + 1),
    });
  } catch (error) {
    console.error('Boss start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
