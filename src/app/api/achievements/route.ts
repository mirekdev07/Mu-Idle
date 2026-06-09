import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { ACHIEVEMENTS, getAchievementById } from '@/lib/game/achievements';

// GET - Get achievement progress
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
        monstersKilled: true,
        deaths: true,
        zen: true,
        resetCount: true,
        totalBossKills: true,
        totalEventEntries: true,
        maxEnhancement: true,
        unlockedAchievements: true,
        claimedAchievements: true,
      },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Parse unlocked and claimed achievements
    let unlockedIds: string[] = [];
    let claimedIds: string[] = [];
    try {
      unlockedIds = JSON.parse(character.unlockedAchievements || '[]');
      claimedIds = JSON.parse(character.claimedAchievements || '[]');
    } catch {
      unlockedIds = [];
      claimedIds = [];
    }

    // Check which achievements are now unlocked
    const newlyUnlocked: string[] = [];

    const achievementProgress = ACHIEVEMENTS.map(achievement => {
      let currentValue = 0;
      let unlocked = unlockedIds.includes(achievement.id);

      // Calculate current progress
      switch (achievement.requirement.type) {
        case 'kills':
          currentValue = character.monstersKilled;
          break;
        case 'resets':
          currentValue = character.resetCount;
          break;
        case 'level':
          currentValue = character.level;
          break;
        case 'zen':
          currentValue = Number(character.zen);
          break;
        case 'deaths':
          currentValue = character.deaths;
          break;
        case 'boss_kills':
          currentValue = character.totalBossKills;
          break;
        case 'event_entries':
          currentValue = character.totalEventEntries;
          break;
        case 'enhancement':
          currentValue = character.maxEnhancement;
          break;
      }

      // Check if newly unlocked
      if (!unlocked && currentValue >= achievement.requirement.value) {
        unlocked = true;
        if (!unlockedIds.includes(achievement.id)) {
          newlyUnlocked.push(achievement.id);
        }
      }

      return {
        ...achievement,
        currentValue,
        unlocked,
        claimed: claimedIds.includes(achievement.id),
      };
    });

    // Save newly unlocked achievements
    if (newlyUnlocked.length > 0) {
      const updatedUnlocked = [...unlockedIds, ...newlyUnlocked];
      await prisma.playerCharacter.update({
        where: { id: character.id },
        data: {
          unlockedAchievements: JSON.stringify(updatedUnlocked),
        },
      });
    }

    return NextResponse.json({
      success: true,
      achievements: achievementProgress,
      newlyUnlocked,
    });
  } catch (error) {
    console.error('Achievement GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Claim achievement reward
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { characterId, achievementId } = body;

    if (!characterId || !achievementId) {
      return errorResponse('Character ID and Achievement ID required');
    }

    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      return errorResponse('Achievement not found', 404);
    }

    const character = await prisma.playerCharacter.findFirst({
      where: {
        id: characterId,
        userId,
      },
      select: {
        id: true,
        unlockedAchievements: true,
        claimedAchievements: true,
      },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Check if unlocked
    let unlockedIds: string[] = [];
    let claimedIds: string[] = [];
    try {
      unlockedIds = JSON.parse(character.unlockedAchievements || '[]');
      claimedIds = JSON.parse(character.claimedAchievements || '[]');
    } catch {
      unlockedIds = [];
      claimedIds = [];
    }

    if (!unlockedIds.includes(achievementId)) {
      return errorResponse('Achievement not unlocked');
    }

    if (claimedIds.includes(achievementId)) {
      return errorResponse('Achievement already claimed');
    }

    // Give rewards
    const userUpdate: Record<string, { increment: number }> = {};
    const charUpdate: Record<string, { increment: bigint } | string> = {};

    if (achievement.rewards.jewelOfBless) {
      userUpdate.jewelOfBless = { increment: achievement.rewards.jewelOfBless };
    }
    if (achievement.rewards.jewelOfSoul) {
      userUpdate.jewelOfSoul = { increment: achievement.rewards.jewelOfSoul };
    }
    if (achievement.rewards.jewelOfLife) {
      userUpdate.jewelOfLife = { increment: achievement.rewards.jewelOfLife };
    }
    if (achievement.rewards.jewelOfChaos) {
      userUpdate.jewelOfChaos = { increment: achievement.rewards.jewelOfChaos };
    }
    if (achievement.rewards.zen) {
      charUpdate.zen = { increment: BigInt(achievement.rewards.zen) };
    }

    // Mark as claimed
    claimedIds.push(achievementId);
    charUpdate.claimedAchievements = JSON.stringify(claimedIds);

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
      message: `Achievement "${achievement.name}" claimed!`,
      rewards: achievement.rewards,
    });
  } catch (error) {
    console.error('Achievement POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
