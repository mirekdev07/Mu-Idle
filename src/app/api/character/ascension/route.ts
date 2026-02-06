import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

// Ascension skill definitions
const ASCENSION_SKILLS = {
  damage: { field: 'ascDamage', label: 'Damage', bonus: '+2% damage per point' },
  critical: { field: 'ascCritical', label: 'Critical', bonus: '+1% crit rate per point' },
  health: { field: 'ascHealth', label: 'Health', bonus: '+5% HP per point' },
  lifeSteal: { field: 'ascLifeSteal', label: 'Life Steal', bonus: '+0.5% life steal per point' },
  zen: { field: 'ascZen', label: 'Zen', bonus: '+3% zen drop per point' },
  exp: { field: 'ascExp', label: 'Experience', bonus: '+2% EXP per point' },
  poison: { field: 'ascPoison', label: 'Poison', bonus: '+0.5% poison chance per point' },
  excellent: { field: 'ascExcellent', label: 'Excellent', bonus: '+0.25% excellent damage chance per point' },
} as const;

type AscensionSkill = keyof typeof ASCENSION_SKILLS;

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, skill } = body;

    if (!skill || !ASCENSION_SKILLS[skill as AscensionSkill]) {
      return errorResponse('Invalid skill', 400);
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

    // Check if player has available points
    if (character.ascensionPoints <= 0) {
      return errorResponse('No ascension points available', 400);
    }

    const skillDef = ASCENSION_SKILLS[skill as AscensionSkill];
    const fieldName = skillDef.field as keyof typeof character;

    // Update character - spend point and increase skill
    const updated = await prisma.playerCharacter.update({
      where: { id: character.id },
      data: {
        ascensionPoints: { decrement: 1 },
        [skillDef.field]: { increment: 1 },
      },
      select: {
        ascensionPoints: true,
        ascDamage: true,
        ascCritical: true,
        ascHealth: true,
        ascLifeSteal: true,
        ascZen: true,
        ascExp: true,
        ascPoison: true,
        ascExcellent: true,
      },
    });

    return NextResponse.json({
      success: true,
      ascension: {
        points: updated.ascensionPoints,
        damage: updated.ascDamage,
        critical: updated.ascCritical,
        health: updated.ascHealth,
        lifeSteal: updated.ascLifeSteal,
        zen: updated.ascZen,
        exp: updated.ascExp,
        poison: updated.ascPoison,
        excellent: updated.ascExcellent,
      },
    });
  } catch (error) {
    console.error('Ascension upgrade error:', error);
    return errorResponse('Server error', 500);
  }
}

// GET - fetch ascension data
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

    return NextResponse.json({
      success: true,
      ascension: {
        points: character.ascensionPoints,
        damage: character.ascDamage,
        critical: character.ascCritical,
        health: character.ascHealth,
        lifeSteal: character.ascLifeSteal,
        zen: character.ascZen,
        exp: character.ascExp,
        poison: character.ascPoison,
        excellent: character.ascExcellent,
      },
    });
  } catch (error) {
    console.error('Get ascension error:', error);
    return errorResponse('Server error', 500);
  }
}
