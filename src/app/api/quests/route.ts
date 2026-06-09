import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { DAILY_QUESTS, getQuestById } from '@/lib/game/quests';

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// GET - Get quest progress
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
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const now = new Date();
    let questKills = character.questKillsToday;
    let questExp = character.questExpToday;
    let questEvent = character.questEventToday;
    let questBoss = character.questBossToday;
    let questCraft = character.questCraftToday;
    let questReset = character.questResetToday;
    let claimedQuests: string[] = [];

    try {
      claimedQuests = JSON.parse(character.claimedQuests || '[]');
    } catch {
      claimedQuests = [];
    }

    // Reset if new day
    if (!character.lastQuestResetDate || !isSameDay(character.lastQuestResetDate, now)) {
      questKills = 0;
      questExp = BigInt(0);
      questEvent = false;
      questBoss = false;
      questCraft = false;
      questReset = false;
      claimedQuests = [];

      await prisma.playerCharacter.update({
        where: { id: character.id },
        data: {
          questKillsToday: 0,
          questExpToday: 0,
          questEventToday: false,
          questBossToday: false,
          questCraftToday: false,
          questResetToday: false,
          lastQuestResetDate: now,
          claimedQuests: '[]',
        },
      });
    }

    // Calculate quest progress
    const questProgress = DAILY_QUESTS.map(quest => {
      let progress = 0;
      let completed = false;

      switch (quest.type) {
        case 'kills':
          progress = Math.min(questKills, quest.target);
          completed = questKills >= quest.target;
          break;
        case 'exp':
          progress = Math.min(Number(questExp), quest.target);
          completed = Number(questExp) >= quest.target;
          break;
        case 'event':
          progress = questEvent ? 1 : 0;
          completed = questEvent;
          break;
        case 'boss':
          progress = questBoss ? 1 : 0;
          completed = questBoss;
          break;
        case 'craft':
          progress = questCraft ? 1 : 0;
          completed = questCraft;
          break;
        case 'reset':
          progress = questReset ? 1 : 0;
          completed = questReset;
          break;
      }

      return {
        ...quest,
        progress,
        completed,
        claimed: claimedQuests.includes(quest.id),
      };
    });

    return NextResponse.json({
      success: true,
      quests: questProgress,
    });
  } catch (error) {
    console.error('Quest GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Claim quest reward
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { characterId, questId } = body;

    if (!characterId || !questId) {
      return errorResponse('Character ID and Quest ID required');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      return errorResponse('Quest not found', 404);
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

    // Check if already claimed
    let claimedQuests: string[] = [];
    try {
      claimedQuests = JSON.parse(character.claimedQuests || '[]');
    } catch {
      claimedQuests = [];
    }

    if (claimedQuests.includes(questId)) {
      return errorResponse('Quest already claimed');
    }

    // Check if quest is completed
    let completed = false;
    switch (quest.type) {
      case 'kills':
        completed = character.questKillsToday >= quest.target;
        break;
      case 'exp':
        completed = Number(character.questExpToday) >= quest.target;
        break;
      case 'event':
        completed = character.questEventToday;
        break;
      case 'boss':
        completed = character.questBossToday;
        break;
      case 'craft':
        completed = character.questCraftToday;
        break;
      case 'reset':
        completed = character.questResetToday;
        break;
    }

    if (!completed) {
      return errorResponse('Quest not completed');
    }

    // Give rewards
    const userUpdate: Record<string, { increment: number }> = {};
    const charUpdate: Record<string, { increment: bigint } | string> = {};

    if (quest.rewards.jewelOfBless) {
      userUpdate.jewelOfBless = { increment: quest.rewards.jewelOfBless };
    }
    if (quest.rewards.jewelOfSoul) {
      userUpdate.jewelOfSoul = { increment: quest.rewards.jewelOfSoul };
    }
    if (quest.rewards.jewelOfLife) {
      userUpdate.jewelOfLife = { increment: quest.rewards.jewelOfLife };
    }
    if (quest.rewards.jewelOfChaos) {
      userUpdate.jewelOfChaos = { increment: quest.rewards.jewelOfChaos };
    }
    if (quest.rewards.bloodCastleTicket) {
      userUpdate.bloodCastleTicket = { increment: quest.rewards.bloodCastleTicket };
    }
    if (quest.rewards.devilSquareTicket) {
      userUpdate.devilSquareTicket = { increment: quest.rewards.devilSquareTicket };
    }
    if (quest.rewards.zen) {
      charUpdate.zen = { increment: BigInt(quest.rewards.zen) };
    }

    // Mark quest as claimed
    claimedQuests.push(questId);
    charUpdate.claimedQuests = JSON.stringify(claimedQuests);

    // Apply updates
    await Promise.all([
      Object.keys(userUpdate).length > 0
        ? prisma.user.update({ where: { id: userId }, data: userUpdate })
        : Promise.resolve(),
      prisma.playerCharacter.update({
        where: { id: character.id },
        data: charUpdate,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Quest "${quest.name}" completed! Rewards claimed.`,
      rewards: quest.rewards,
    });
  } catch (error) {
    console.error('Quest POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
