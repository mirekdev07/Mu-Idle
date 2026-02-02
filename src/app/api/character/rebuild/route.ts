import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';

const REBUILD_COST = 1000000n; // 1,000,000 Zen
const BASE_STAT_VALUE = 25;

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id } = body;

    if (!character_id) {
      return errorResponse('Character ID required');
    }

    // Get character
    const character = await prisma.playerCharacter.findFirst({
      where: { id: character_id, userId },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Check if player has enough Zen
    if (character.zen < REBUILD_COST) {
      return errorResponse('Not enough Zen! Rebuild costs 1,000,000 Zen');
    }

    // Calculate total stat points spent
    // Each stat starts at 25, so spent = current - 25
    const spentDamage = character.damage - BASE_STAT_VALUE;
    const spentDefense = character.defense - BASE_STAT_VALUE;
    const spentVitality = character.vitality - BASE_STAT_VALUE;

    const totalSpent = spentDamage + spentDefense + spentVitality;

    // Return all spent points + current unspent points
    const newLevelupPoints = character.levelupPoints + totalSpent;

    // Update character
    await prisma.playerCharacter.update({
      where: { id: character_id },
      data: {
        zen: { decrement: Number(REBUILD_COST) },
        damage: BASE_STAT_VALUE,
        defense: BASE_STAT_VALUE,
        vitality: BASE_STAT_VALUE,
        levelupPoints: newLevelupPoints,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Stats reset! ${totalSpent} points returned.`,
      pointsReturned: totalSpent,
      newLevelupPoints,
      newZen: (character.zen - REBUILD_COST).toString(),
    });
  } catch (error) {
    console.error('Rebuild error:', error);
    return errorResponse('Server error', 500);
  }
}
