import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import { clearInventory } from '@/lib/services/inventory.service';

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

    const result = await clearInventory(character.id);

    return NextResponse.json({
      success: true,
      deleted_count: result.deletedCount,
    });
  } catch (error) {
    console.error('Clear inventory error:', error);
    return errorResponse('Server error', 500);
  }
}
