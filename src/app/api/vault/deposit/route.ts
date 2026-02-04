import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

const VAULT_SLOTS = 100;

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { inventory_slot } = body;

    if (inventory_slot === undefined || inventory_slot === null) {
      return errorResponse('Missing inventory_slot');
    }

    const character = await getLatestCharacter(userId);
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Get item from inventory
    const inventoryItem = await prisma.playerInventory.findFirst({
      where: { characterId: character.id, slotIndex: inventory_slot },
    });

    if (!inventoryItem) {
      return errorResponse('No item in that inventory slot');
    }

    // Find empty vault slot
    const usedVaultSlots = await prisma.playerVault.findMany({
      where: { characterId: character.id },
      select: { slotIndex: true },
    });

    const usedSlotSet = new Set(usedVaultSlots.map(s => s.slotIndex));
    let emptyVaultSlot = -1;

    for (let i = 0; i < VAULT_SLOTS; i++) {
      if (!usedSlotSet.has(i)) {
        emptyVaultSlot = i;
        break;
      }
    }

    if (emptyVaultSlot === -1) {
      return errorResponse('Vault is full');
    }

    // Transaction: move item from inventory to vault
    await prisma.$transaction([
      prisma.playerVault.create({
        data: {
          characterId: character.id,
          slotIndex: emptyVaultSlot,
          itemName: inventoryItem.itemName,
          itemType: inventoryItem.itemType,
          itemEmoji: inventoryItem.itemEmoji,
          itemRarity: inventoryItem.itemRarity,
          damageMin: inventoryItem.damageMin,
          damageMax: inventoryItem.damageMax,
          attackSpeed: inventoryItem.attackSpeed,
          defenseValue: inventoryItem.defenseValue,
          itemLevel: inventoryItem.itemLevel,
          category: inventoryItem.category,
          enhancementLevel: inventoryItem.enhancementLevel,
          itemOptions: inventoryItem.itemOptions,
        },
      }),
      prisma.playerInventory.delete({
        where: { id: inventoryItem.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `${inventoryItem.itemName} moved to vault`,
      vaultSlot: emptyVaultSlot,
    });
  } catch (error) {
    console.error('Deposit error:', error);
    return errorResponse('Server error', 500);
  }
}
