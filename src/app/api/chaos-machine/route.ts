import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

type MixType = 'blood_castle_ticket' | 'devil_square_ticket';

interface MixRecipe {
  name: string;
  requirements: {
    scrollOfArchangel?: number;
    bloodBone?: number;
    devilsKey?: number;
    devilsEye?: number;
    jewelOfChaos?: number;
    zen?: number;
  };
  result: {
    field: 'bloodCastleTicket' | 'devilSquareTicket';
    amount: number;
  };
  successRate: number;
}

const RECIPES: Record<MixType, MixRecipe> = {
  blood_castle_ticket: {
    name: 'Blood Castle Ticket',
    requirements: {
      scrollOfArchangel: 1,
      bloodBone: 1,
      jewelOfChaos: 1,
      zen: 300000,
    },
    result: {
      field: 'bloodCastleTicket',
      amount: 1,
    },
    successRate: 1.0, // 100%
  },
  devil_square_ticket: {
    name: 'Devil Square Ticket',
    requirements: {
      devilsKey: 1,
      devilsEye: 1,
      jewelOfChaos: 1,
      zen: 300000,
    },
    result: {
      field: 'devilSquareTicket',
      amount: 1,
    },
    successRate: 1.0, // 100%
  },
};

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, mix_type } = body;

    if (!mix_type || !RECIPES[mix_type as MixType]) {
      return errorResponse('Invalid mix type');
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

    const recipe = RECIPES[mix_type as MixType];

    // Check if player has all required materials
    const req = recipe.requirements;
    if (req.scrollOfArchangel && character.scrollOfArchangel < req.scrollOfArchangel) {
      return errorResponse('Not enough Scroll of Archangel');
    }
    if (req.bloodBone && character.bloodBone < req.bloodBone) {
      return errorResponse('Not enough Blood Bone');
    }
    if (req.devilsKey && character.devilsKey < req.devilsKey) {
      return errorResponse("Not enough Devil's Key");
    }
    if (req.devilsEye && character.devilsEye < req.devilsEye) {
      return errorResponse("Not enough Devil's Eye");
    }
    if (req.jewelOfChaos && character.jewelOfChaos < req.jewelOfChaos) {
      return errorResponse('Not enough Jewel of Chaos');
    }
    if (req.zen && character.zen < BigInt(req.zen)) {
      return errorResponse('Not enough Zen');
    }

    // Consume materials and create result
    const updateData: Record<string, { decrement?: number; increment?: number }> = {};

    if (req.scrollOfArchangel) {
      updateData.scrollOfArchangel = { decrement: req.scrollOfArchangel };
    }
    if (req.bloodBone) {
      updateData.bloodBone = { decrement: req.bloodBone };
    }
    if (req.devilsKey) {
      updateData.devilsKey = { decrement: req.devilsKey };
    }
    if (req.devilsEye) {
      updateData.devilsEye = { decrement: req.devilsEye };
    }
    if (req.jewelOfChaos) {
      updateData.jewelOfChaos = { decrement: req.jewelOfChaos };
    }
    if (req.zen) {
      updateData.zen = { decrement: req.zen };
    }

    // Check success (currently all 100%)
    const success = Math.random() < recipe.successRate;

    if (success) {
      updateData[recipe.result.field] = { increment: recipe.result.amount };
    }

    const updated = await prisma.playerCharacter.update({
      where: { id: character.id },
      data: updateData,
      select: {
        zen: true,
        jewelOfChaos: true,
        scrollOfArchangel: true,
        bloodBone: true,
        devilsKey: true,
        devilsEye: true,
        bloodCastleTicket: true,
        devilSquareTicket: true,
      },
    });

    return NextResponse.json({
      success: true,
      mixSuccess: success,
      resultName: recipe.name,
      zen: updated.zen.toString(),
      materials: {
        chaos: updated.jewelOfChaos,
        archangel: updated.scrollOfArchangel,
        bloodbone: updated.bloodBone,
        devilskey: updated.devilsKey,
        devilseye: updated.devilsEye,
      },
      tickets: {
        bloodCastle: updated.bloodCastleTicket,
        devilSquare: updated.devilSquareTicket,
      },
    });
  } catch (error) {
    console.error('Chaos Machine error:', error);
    return errorResponse('Server error', 500);
  }
}

// GET - return available recipes
export async function GET() {
  const recipes = Object.entries(RECIPES).map(([key, recipe]) => ({
    id: key,
    name: recipe.name,
    requirements: recipe.requirements,
    successRate: recipe.successRate * 100,
  }));

  return NextResponse.json({ recipes });
}
