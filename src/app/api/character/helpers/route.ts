import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

// Helper upgrade costs - exponential scaling (very expensive)
function getHelperUpgradeCost(currentLevel: number, helperType: 'attacker' | 'buffer'): bigint {
  const baseCost = helperType === 'attacker' ? 100000n : 50000n;
  const multiplier = Math.floor(Math.pow(currentLevel + 1, 2.5));
  return baseCost * BigInt(multiplier);
}

// Buffer max level is 100 (10% max bonus)
const BUFFER_MAX_LEVEL = 100;
const BUFFER_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const BUFFER_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

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

    const now = new Date();
    const bufferActive = character.bufferActiveUntil && character.bufferActiveUntil > now;
    const bufferOnCooldown = character.bufferCooldownEnd && character.bufferCooldownEnd > now;

    const attackerCost = getHelperUpgradeCost(character.helperAttackerLevel, 'attacker');
    const bufferCost = getHelperUpgradeCost(character.helperBufferLevel, 'buffer');

    return NextResponse.json({
      success: true,
      helpers: {
        attacker: {
          level: character.helperAttackerLevel,
          upgradeCost: attackerCost.toString(),
          // Attacker damage: base 50 + level × 20 (10x stronger)
          damage: 50 + character.helperAttackerLevel * 20,
        },
        buffer: {
          level: character.helperBufferLevel,
          maxLevel: BUFFER_MAX_LEVEL,
          upgradeCost: bufferCost.toString(),
          damageBonus: character.helperBufferLevel * 0.1,
          isActive: bufferActive,
          activeUntil: character.bufferActiveUntil?.toISOString() ?? null,
          isOnCooldown: bufferOnCooldown,
          cooldownEnd: character.bufferCooldownEnd?.toISOString() ?? null,
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
    const { character_id, helper_type, action } = body;

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

    // Handle buffer activation
    if (action === 'activate_buffer') {
      const now = new Date();

      // Check if on cooldown
      if (character.bufferCooldownEnd && character.bufferCooldownEnd > now) {
        return errorResponse('Buffer is on cooldown', 400);
      }

      // Check if buffer level > 0
      if (character.helperBufferLevel <= 0) {
        return errorResponse('Buffer helper not unlocked', 400);
      }

      const activeUntil = new Date(now.getTime() + BUFFER_DURATION_MS);
      const cooldownEnd = new Date(now.getTime() + BUFFER_COOLDOWN_MS);

      await prisma.playerCharacter.update({
        where: { id: character.id },
        data: {
          bufferActiveUntil: activeUntil,
          bufferCooldownEnd: cooldownEnd,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'activate_buffer',
        activeUntil: activeUntil.toISOString(),
        cooldownEnd: cooldownEnd.toISOString(),
        damageBonus: character.helperBufferLevel * 0.1,
      });
    }

    // Handle upgrade
    if (!helper_type || !['attacker', 'buffer'].includes(helper_type)) {
      return errorResponse('Invalid helper type', 400);
    }

    const currentLevel = helper_type === 'attacker'
      ? character.helperAttackerLevel
      : character.helperBufferLevel;

    if (helper_type === 'buffer' && currentLevel >= BUFFER_MAX_LEVEL) {
      return errorResponse('Buffer helper is at max level', 400);
    }

    const upgradeCost = getHelperUpgradeCost(currentLevel, helper_type);

    if (character.zen < upgradeCost) {
      return errorResponse('Not enough Zen', 400);
    }

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
      stats: helper_type === 'attacker'
        ? { damage: 50 + newLevel * 20 }
        : { damageBonus: newLevel * 0.1 },
    });
  } catch (error) {
    console.error('Upgrade helper error:', error);
    return errorResponse('Server error', 500);
  }
}
