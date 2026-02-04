import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

const INVENTORY_SLOTS = 24;

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { vault_slot } = body;

    if (vault_slot === undefined || vault_slot === null) {
      return errorResponse('Missing vault_slot');
    }

    const character = await getLatestCharacter(userId);
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Get item from vault
    const vaultItem = await prisma.playerVault.findFirst({
      where: { characterId: character.id, slotIndex: vault_slot },
    });

    if (!vaultItem) {
      return errorResponse('No item in that vault slot');
    }

    // Find empty inventory slot
    const usedInventorySlots = await prisma.playerInventory.findMany({
      where: { characterId: character.id },
      select: { slotIndex: true },
    });

    const usedSlotSet = new Set(usedInventorySlots.map(s => s.slotIndex));
    let emptyInventorySlot = -1;

    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      if (!usedSlotSet.has(i)) {
        emptyInventorySlot = i;
        break;
      }
    }

    if (emptyInventorySlot === -1) {
      return errorResponse('Inventory is full');
    }

    // Transaction: move item from vault to inventory
    await prisma.$transaction([
      prisma.playerInventory.create({
        data: {
          characterId: character.id,
          slotIndex: emptyInventorySlot,
          itemName: vaultItem.itemName,
          itemType: vaultItem.itemType,
          itemEmoji: vaultItem.itemEmoji,
          itemRarity: vaultItem.itemRarity,
          damageMin: vaultItem.damageMin,
          damageMax: vaultItem.damageMax,
          attackSpeed: vaultItem.attackSpeed,
          defenseValue: vaultItem.defenseValue,
          itemLevel: vaultItem.itemLevel,
          category: vaultItem.category,
          enhancementLevel: vaultItem.enhancementLevel,
          itemOptions: vaultItem.itemOptions,
        },
      }),
      prisma.playerVault.delete({
        where: { id: vaultItem.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `${vaultItem.itemName} moved to inventory`,
      inventorySlot: emptyInventorySlot,
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    return errorResponse('Server error', 500);
  }
}
