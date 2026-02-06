import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

// Helper upgrade costs - exponential scaling (very expensive)
function getHelperUpgradeCost(currentLevel: number, helperType: 'attacker' | 'buffer'): bigint {
  const baseCost = helperType === 'attacker' ? 100000n : 50000n; // Attacker more expensive
  // Cost formula: base * (level + 1)^2.5
  const multiplier = Math.floor(Math.pow(currentLevel + 1, 2.5));
  return baseCost * BigInt(multiplier);
}

// Buffer max level is 100 (10% max bonus)
const BUFFER_MAX_LEVEL = 100;

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const characterIdParam = searchParams.get('character_id');

  try {
    let character;
    if (characterIdParam) {
      character = await getCharacterById(parseInt(characterIdParam, 10), userId);
    }
    if (!character) {
      character = await getLatestCharacter(userId);
    }
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const attackerCost = getHelperUpgradeCost(character.helperAttackerLevel, 'attacker');
    const bufferCost = getHelperUpgradeCost(character.helperBufferLevel, 'buffer');

    return NextResponse.json({
      success: true,
      helpers: {
        attacker: {
          level: character.helperAttackerLevel,
          upgradeCost: attackerCost.toString(),
          // Attacker damage scales with level: base 5 + level * 2
          damage: 5 + character.helperAttackerLevel * 2,
        },
        buffer: {
          level: character.helperBufferLevel,
          maxLevel: BUFFER_MAX_LEVEL,
          upgradeCost: bufferCost.toString(),
          // Buffer gives 0.1% DMG per level
          damageBonus: character.helperBufferLevel * 0.1,
        },
      },
    });
  } catch (error) {
    console.error('Get helpers error:', error);
    return errorResponse('Server error', 500);
  }
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, helper_type } = body;

    if (!helper_type || !['attacker', 'buffer'].includes(helper_type)) {
      return errorResponse('Invalid helper type', 400);
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

    const currentLevel = helper_type === 'attacker'
      ? character.helperAttackerLevel
      : character.helperBufferLevel;

    // Check max level for buffer
    if (helper_type === 'buffer' && currentLevel >= BUFFER_MAX_LEVEL) {
      return errorResponse('Buffer helper is at max level', 400);
    }

    const upgradeCost = getHelperUpgradeCost(currentLevel, helper_type);

    // Check if player has enough zen
    if (character.zen < upgradeCost) {
      return errorResponse('Not enough Zen', 400);
    }

    // Upgrade helper
    const fieldToUpdate = helper_type === 'attacker' ? 'helperAttackerLevel' : 'helperBufferLevel';

    const updatedCharacter = await prisma.playerCharacter.update({
      where: { id: character.id },
      data: {
        [fieldToUpdate]: currentLevel + 1,
        zen: character.zen - upgradeCost,
      },
    });

    const newLevel = helper_type === 'attacker'
      ? updatedCharacter.helperAttackerLevel
      : updatedCharacter.helperBufferLevel;

    const nextCost = getHelperUpgradeCost(newLevel, helper_type);

    return NextResponse.json({
      success: true,
      helper_type,
      newLevel,
      zen: updatedCharacter.zen.toString(),
      nextUpgradeCost: nextCost.toString(),
      // Return updated stats
      stats: helper_type === 'attacker'
        ? { damage: 5 + newLevel * 2 }
        : { damageBonus: newLevel * 0.1 },
    });
  } catch (error) {
    console.error('Upgrade helper error:', error);
    return errorResponse('Server error', 500);
  }
}
