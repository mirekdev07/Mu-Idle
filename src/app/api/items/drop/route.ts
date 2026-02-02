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
    // Accept both monster_level and character_level
    const monsterLevel = body.monster_level || body.character_level;
    const characterId = body.character_id;

    if (!monsterLevel || typeof monsterLevel !== 'number') {
      return errorResponse('Monster level required');
    }

    let character;
    if (characterId) {
      character = await getCharacterById(characterId, userId);
    }
    if (!character) {
      character = await getLatestCharacter(userId);
    }
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Try to get a drop
    const droppedItem = await getRandomItemDrop(monsterLevel);

    console.log('Item drop attempt:', { monsterLevel, droppedItem: droppedItem ? droppedItem.name : null });

    if (!droppedItem) {
      return NextResponse.json({
        success: true,
        dropped: false,
        message: 'No drop - no items found for level ' + monsterLevel,
      });
    }

    // Add to inventory
    const result = await addItemToInventory(character.id, droppedItem);

    console.log('Add to inventory result:', result);

    if (!result.success) {
      return NextResponse.json({
        success: true,
        dropped: true,
        added: false,
        message: result.message || 'Failed to add to inventory',
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
