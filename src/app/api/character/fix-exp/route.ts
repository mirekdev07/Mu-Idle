import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';

// Emergency endpoint to fix negative or broken EXP
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

    // Check if EXP is negative or broken
    const currentExp = character.experience;

    if (currentExp < 0n) {
      // Fix: set EXP to 0
      await prisma.playerCharacter.update({
        where: { id: character_id },
        data: {
          experience: 0n,
          // Also reset the exp/zen per second to prevent future issues
          lastExpPerSecond: 0,
          lastZenPerSecond: 0,
        },
      });

      return NextResponse.json({
        success: true,
        message: `EXP fixed! Was ${currentExp.toString()}, now set to 0`,
        oldExp: currentExp.toString(),
        newExp: '0',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'EXP is already positive, no fix needed',
      currentExp: currentExp.toString(),
    });
  } catch (error) {
    console.error('Fix EXP error:', error);
    return errorResponse('Server error', 500);
  }
}
