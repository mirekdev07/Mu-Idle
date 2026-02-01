import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter, updateCurrentHp } from '@/lib/services/character.service';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, current_hp } = body;

    if (current_hp === undefined || current_hp === null) {
      return errorResponse('Current HP required');
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

    await updateCurrentHp(character.id, Math.max(0, Math.floor(current_hp)));

    return NextResponse.json({
      success: true,
      current_hp: Math.max(0, Math.floor(current_hp)),
    });
  } catch (error) {
    console.error('Save HP error:', error);
    return errorResponse('Server error', 500);
  }
}
