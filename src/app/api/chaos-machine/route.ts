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

    // Get user's materials (account-wide)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        jewelOfChaos: true,
        scrollOfArchangel: true,
        bloodBone: true,
        devilsKey: true,
        devilsEye: true,
        bloodCastleTicket: true,
        devilSquareTicket: true,
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    const recipe = RECIPES[mix_type as MixType];

    // Check if player has all required materials (from user account)
    const req = recipe.requirements;
    if (req.scrollOfArchangel && user.scrollOfArchangel < req.scrollOfArchangel) {
      return errorResponse('Not enough Scroll of Archangel');
    }
    if (req.bloodBone && user.bloodBone < req.bloodBone) {
      return errorResponse('Not enough Blood Bone');
    }
    if (req.devilsKey && user.devilsKey < req.devilsKey) {
      return errorResponse("Not enough Devil's Key");
    }
    if (req.devilsEye && user.devilsEye < req.devilsEye) {
      return errorResponse("Not enough Devil's Eye");
    }
    if (req.jewelOfChaos && user.jewelOfChaos < req.jewelOfChaos) {
      return errorResponse('Not enough Jewel of Chaos');
    }
    if (req.zen && character.zen < BigInt(req.zen)) {
      return errorResponse('Not enough Zen');
    }

    // Consume materials from user account
    const userUpdateData: Record<string, { decrement?: number; increment?: number }> = {};

    if (req.scrollOfArchangel) {
      userUpdateData.scrollOfArchangel = { decrement: req.scrollOfArchangel };
    }
    if (req.bloodBone) {
      userUpdateData.bloodBone = { decrement: req.bloodBone };
    }
    if (req.devilsKey) {
      userUpdateData.devilsKey = { decrement: req.devilsKey };
    }
    if (req.devilsEye) {
      userUpdateData.devilsEye = { decrement: req.devilsEye };
    }
    if (req.jewelOfChaos) {
      userUpdateData.jewelOfChaos = { decrement: req.jewelOfChaos };
    }

    // Check success (currently all 100%)
    const success = Math.random() < recipe.successRate;

    if (success) {
      userUpdateData[recipe.result.field] = { increment: recipe.result.amount };
    }

    // Update user materials and character zen in parallel
    const [updatedUser, updatedCharacter] = await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
        select: {
          jewelOfChaos: true,
          scrollOfArchangel: true,
          bloodBone: true,
          devilsKey: true,
          devilsEye: true,
          bloodCastleTicket: true,
          devilSquareTicket: true,
        },
      }),
      req.zen
        ? prisma.playerCharacter.update({
            where: { id: character.id },
            data: { zen: { decrement: req.zen } },
            select: { zen: true },
          })
        : Promise.resolve({ zen: character.zen }),
    ]);

    return NextResponse.json({
      success: true,
      mixSuccess: success,
      resultName: recipe.name,
      zen: updatedCharacter.zen.toString(),
      materials: {
        chaos: updatedUser.jewelOfChaos,
        archangel: updatedUser.scrollOfArchangel,
        bloodbone: updatedUser.bloodBone,
        devilskey: updatedUser.devilsKey,
        devilseye: updatedUser.devilsEye,
      },
      tickets: {
        bloodCastle: updatedUser.bloodCastleTicket,
        devilSquare: updatedUser.devilSquareTicket,
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
