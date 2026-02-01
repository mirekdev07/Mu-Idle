import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, resetCharacter } from '@/lib/services/character.service';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id } = body;

    if (!character_id) {
      return errorResponse('Character ID required');
    }

    const character = await getCharacterById(character_id, userId);
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const result = await resetCharacter(character.id);

    if (!result.success) {
      return errorResponse(result.message ?? 'Reset failed');
    }

    return NextResponse.json({
      success: true,
      message: 'Character has been reset to level 1',
    });
  } catch (error) {
    console.error('Character reset error:', error);
    return errorResponse('Server error', 500);
  }
}
