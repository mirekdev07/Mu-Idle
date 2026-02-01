import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import { getRandomItemDrop, addItemToInventory } from '@/lib/services/item.service';
import { getInventory } from '@/lib/services/inventory.service';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { monster_level, character_id } = body;

    if (!monster_level || typeof monster_level !== 'number') {
      return errorResponse('Monster level required');
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

    // Try to get a drop
    const droppedItem = await getRandomItemDrop(monster_level);

    if (!droppedItem) {
      return NextResponse.json({
        success: true,
        dropped: false,
        message: 'No drop',
      });
    }

    // Add to inventory
    const result = await addItemToInventory(character.id, droppedItem);

    if (!result.success) {
      return NextResponse.json({
        success: true,
        dropped: true,
        added: false,
        message: result.message,
        item: droppedItem,
      });
    }

    // Get updated inventory
    const inventory = await getInventory(character.id);

    return NextResponse.json({
      success: true,
      dropped: true,
      added: true,
      item: droppedItem,
      slotIndex: result.slotIndex,
      inventory,
    });
  } catch (error) {
    console.error('Item drop error:', error);
    return errorResponse('Server error', 500);
  }
}
