import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import { destroyItem, getInventory } from '@/lib/services/inventory.service';
import { getEquipment, getEquipmentBonuses } from '@/lib/services/equipment.service';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const characterIdParam = searchParams.get('character_id');

  try {
    const body = await request.json();
    const { slot_index } = body;

    if (slot_index === undefined || slot_index === null) {
      return errorResponse('Slot index required');
    }

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

    const result = await destroyItem(character.id, slot_index);

    if (!result.success) {
      return errorResponse(result.message ?? 'Failed to destroy item');
    }

    // Return updated data
    const [inventory, equipment, bonuses] = await Promise.all([
      getInventory(character.id),
      getEquipment(character.id),
      getEquipmentBonuses(character.id),
    ]);

    return NextResponse.json({
      success: true,
      inventory,
      equipment,
      bonuses,
    });
  } catch (error) {
    console.error('Destroy item error:', error);
    return errorResponse('Server error', 500);
  }
}
