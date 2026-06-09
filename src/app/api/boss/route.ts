import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { BOSSES, getBossById } from '@/lib/game/bosses';
import { getRandomItemDropForBoss } from '@/lib/services/item.service';

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// GET - Get boss data and kill counts
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
        level: true,
        boss1KillsToday: true,
        boss2KillsToday: true,
        lastBossResetDate: true,
      },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check if we need to reset daily kills
    const now = new Date();
    let boss1Kills = character.boss1KillsToday;
    let boss2Kills = character.boss2KillsToday;

    if (!character.lastBossResetDate || !isSameDay(character.lastBossResetDate, now)) {
      boss1Kills = 0;
      boss2Kills = 0;
    }

    return NextResponse.json({
      success: true,
      bosses: BOSSES,
      killsToday: {
        1: boss1Kills,
        2: boss2Kills,
      },
      characterLevel: character.level,
    });
  } catch (error) {
    console.error('Boss GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Claim rewards after defeating a boss (attempt already consumed at battle start)
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

    // Find empty inventory slots for drops (need 3 slots)
    const usedSlots = new Set(character.inventory.map(inv => inv.slotIndex));
    const emptySlots: number[] = [];
    for (let i = 0; i < 24 && emptySlots.length < 3; i++) {
      if (!usedSlots.has(i)) {
        emptySlots.push(i);
      }
    }

    if (emptySlots.length < 3) {
      return NextResponse.json({
        error: 'You need at least 3 empty inventory slots for boss drops'
      }, { status: 400 });
    }

    // Generate 3 item drops with options (100% drop rate, always has options)
    // Boss 1: items level 1-40, Boss 2: items level 41-100
    const levelRanges: Record<number, [number, number]> = {
      1: [1, 40],
      2: [41, 100],
    };
    const [minLevel, maxLevel] = levelRanges[bossId] || [1, 40];

    const droppedItems = [];
    for (let i = 0; i < 3; i++) {
      const item = await getRandomItemDropForBoss(minLevel, maxLevel, true);
      if (item) {
        droppedItems.push({
          ...item,
          slotIndex: emptySlots[i],
        });
      }
    }

    // Save items to inventory
    for (const item of droppedItems) {
      await prisma.playerInventory.create({
        data: {
          characterId: character.id,
          slotIndex: item.slotIndex,
          itemName: item.name,
          itemType: item.type,
          itemEmoji: item.emoji,
          itemRarity: item.rarity,
          damageMin: item.damageMin,
          damageMax: item.damageMax,
          attackSpeed: item.attackSpeed,
          defenseValue: item.defense,
          itemLevel: item.level,
          category: item.category,
          enhancementLevel: item.enhancementLevel || 0,
          itemOptions: item.options ? JSON.stringify(item.options) : null,
        },
      });
    }

    // Update character: add EXP and Zen (kill count already incremented at battle start)
    // Also mark boss quest as completed and increment total boss kills for achievements
    await prisma.playerCharacter.update({
      where: { id: character.id },
      data: {
        experience: { increment: boss.expReward },
        zen: { increment: boss.zenReward },
        questBossToday: true,
        totalBossKills: { increment: 1 },
      },
    });

    // Calculate kills remaining
    const now = new Date();
    let currentKills = bossId === 1 ? character.boss1KillsToday : character.boss2KillsToday;
    if (!character.lastBossResetDate || !isSameDay(character.lastBossResetDate, now)) {
      currentKills = 1; // Just started fresh today with this kill
    }

    return NextResponse.json({
      success: true,
      message: `${boss.name} defeated!`,
      rewards: {
        exp: boss.expReward,
        zen: boss.zenReward,
        items: droppedItems.map(item => ({
          name: item.name,
          rarity: item.rarity,
          emoji: item.emoji,
          enhancementLevel: item.enhancementLevel,
          options: item.options,
        })),
      },
      killsRemaining: boss.dailyLimit - currentKills,
    });
  } catch (error) {
    console.error('Boss POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
