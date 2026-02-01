import { NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharactersByUserId } from '@/lib/services/character.service';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const characters = await getCharactersByUserId(userId);

    return NextResponse.json({
      success: true,
      characters: characters.map((char) => ({
        id: char.id,
        name: char.characterName,
        class: char.classType,
        level: char.level,
        resetCount: char.resetCount,
        lastPlayed: char.lastPlayed.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get characters error:', error);
    return errorResponse('Server error', 500);
  }
}
