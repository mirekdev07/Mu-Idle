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

    const validTypes = ['bless', 'soul', 'life', 'chaos', 'archangel', 'bloodbone', 'devilskey', 'devilseye'];
    if (!jewel_type || !validTypes.includes(jewel_type)) {
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

    const fieldMap: Record<string, string> = {
      bless: 'jewelOfBless',
      soul: 'jewelOfSoul',
      life: 'jewelOfLife',
      chaos: 'jewelOfChaos',
      archangel: 'scrollOfArchangel',
      bloodbone: 'bloodBone',
      devilskey: 'devilsKey',
      devilseye: 'devilsEye',
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
        jewelOfChaos: true,
        scrollOfArchangel: true,
        bloodBone: true,
        devilsKey: true,
        devilsEye: true,
      },
    });

    return NextResponse.json({
      success: true,
      jewels: {
        bless: updated.jewelOfBless,
        soul: updated.jewelOfSoul,
        life: updated.jewelOfLife,
        chaos: updated.jewelOfChaos,
      },
      materials: {
        archangel: updated.scrollOfArchangel,
        bloodbone: updated.bloodBone,
        devilskey: updated.devilsKey,
        devilseye: updated.devilsEye,
      },
    });
  } catch (error) {
    console.error('Add jewel error:', error);
    return errorResponse('Server error', 500);
  }
}
