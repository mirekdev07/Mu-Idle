import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { createCharacter } from '@/lib/services/character.service';
import { CharacterClass } from '@/types/game';

const createCharacterSchema = z.object({
  character_name: z
    .string()
    .min(2, 'Character name must be at least 2 characters')
    .max(50, 'Character name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Character name can only contain letters, numbers, and underscores'),
  class_type: z.enum(['Dark Knight', 'Dark Wizard', 'Elf', 'Magic Gladiator', 'Dark Lord']),
});

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();

    const result = createCharacterSchema.safeParse(body);
    if (!result.success) {
      return errorResponse(result.error.errors[0].message);
    }

    const { character_name, class_type } = result.data;

    const character = await createCharacter({
      userId,
      characterName: character_name,
      classType: class_type as CharacterClass,
    });

    return NextResponse.json({
      success: true,
      character: {
        id: character.id,
        name: character.characterName,
        class: character.classType,
        level: character.level,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Character name already exists') {
      return errorResponse('Character name already exists');
    }
    console.error('Create character error:', error);
    return errorResponse('Server error', 500);
  }
}
