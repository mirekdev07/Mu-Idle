import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, jewel_type, amount = 1 } = body;

    if (!jewel_type || !['bless', 'soul', 'life'].includes(jewel_type)) {
      return errorResponse('Invalid jewel type');
    }

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

    const fieldMap: Record<string, 'jewelOfBless' | 'jewelOfSoul' | 'jewelOfLife'> = {
      bless: 'jewelOfBless',
      soul: 'jewelOfSoul',
      life: 'jewelOfLife',
    };

    const field = fieldMap[jewel_type];

    const updated = await prisma.playerCharacter.update({
      where: { id: character.id },
      data: {
        [field]: { increment: amount },
      },
      select: {
        jewelOfBless: true,
        jewelOfSoul: true,
        jewelOfLife: true,
      },
    });

    return NextResponse.json({
      success: true,
      jewels: {
        bless: updated.jewelOfBless,
        soul: updated.jewelOfSoul,
        life: updated.jewelOfLife,
      },
    });
  } catch (error) {
    console.error('Add jewel error:', error);
    return errorResponse('Server error', 500);
  }
}
