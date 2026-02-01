import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import { getInventory } from '@/lib/services/inventory.service';
import { getEquipment, getEquipmentBonuses, equipItem, unequipItem } from '@/lib/services/equipment.service';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const characterIdParam = searchParams.get('character_id');
  const action = searchParams.get('action');

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

    if (action === 'get_all') {
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
    }

    return errorResponse('Invalid action');
  } catch (error) {
    console.error('Inventory manager GET error:', error);
    return errorResponse('Server error', 500);
  }
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const characterIdParam = searchParams.get('character_id');

  try {
    const body = await request.json();
    const { action, slot_index, equipment_slot } = body;

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

    if (action === 'equip_item') {
      if (slot_index === undefined || slot_index === null) {
        return errorResponse('Slot index required');
      }

      const result = await equipItem(character.id, slot_index);
      if (!result.success) {
        return errorResponse(result.message ?? 'Equip failed');
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
    }

    if (action === 'unequip_item') {
      if (equipment_slot === undefined || equipment_slot === null) {
        return errorResponse('Equipment slot required');
      }

      const result = await unequipItem(character.id, equipment_slot);
      if (!result.success) {
        return errorResponse(result.message ?? 'Unequip failed');
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
    }

    return errorResponse('Invalid action');
  } catch (error) {
    console.error('Inventory manager POST error:', error);
    return errorResponse('Server error', 500);
  }
}
