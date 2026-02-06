import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

const BURST_COOLDOWN_SECONDS = 180; // 3 minutes

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id } = body;

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

    // Check if burst is still on cooldown
    if (character.burstCooldownEnd && new Date() < character.burstCooldownEnd) {
      return errorResponse('Burst is still on cooldown', 400);
    }

    // Set cooldown end time
    const cooldownEnd = new Date(Date.now() + BURST_COOLDOWN_SECONDS * 1000);

    await prisma.playerCharacter.update({
      where: { id: character.id },
      data: { burstCooldownEnd: cooldownEnd },
    });

    return NextResponse.json({
      success: true,
      burstCooldownEnd: cooldownEnd.toISOString(),
    });
  } catch (error) {
    console.error('Burst cooldown error:', error);
    return errorResponse('Server error', 500);
  }
}
