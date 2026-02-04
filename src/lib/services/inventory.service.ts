import prisma from '@/lib/prisma';
import { Item, ItemOption, ItemRarity } from '@/types/game';

export interface InventoryItem extends Item {
  slotIndex: number;
}

function parseOptions(optionsJson: string | null): ItemOption[] | undefined {
  if (!optionsJson) return undefined;
  try {
    return JSON.parse(optionsJson);
  } catch {
    return undefined;
  }
}

export async function getInventory(characterId: number): Promise<(Item | null)[]> {
  const inventoryItems = await prisma.playerInventory.findMany({
    where: { characterId },
    orderBy: { slotIndex: 'asc' },
  });

  // Create 24-slot inventory array
  const inventory: (Item | null)[] = Array(24).fill(null);

  for (const item of inventoryItems) {
    if (item.slotIndex >= 0 && item.slotIndex < 24) {
      inventory[item.slotIndex] = {
        id: `inv_${item.id}`,
        name: item.itemName ?? '',
        type: item.itemType ?? '',
        category: item.category,
        level: item.itemLevel,
        damage_min: item.damageMin,
        damage_max: item.damageMax,
        attack_speed: item.attackSpeed,
        defense: item.defenseValue,
        rarity: (item.itemRarity as ItemRarity) ?? 'common',
        enhancementLevel: item.enhancementLevel,
        options: parseOptions(item.itemOptions),
        emoji: item.itemEmoji ?? '📦',
        slotIndex: item.slotIndex,
      };
    }
  }

  return inventory;
}

export async function destroyItem(
  characterId: number,
  slotIndex: number
): Promise<{ success: boolean; message?: string }> {
  const item = await prisma.playerInventory.findFirst({
    where: { characterId, slotIndex },
  });

  if (!item) {
    return { success: false, message: 'No item in that slot' };
  }

  await prisma.playerInventory.delete({
    where: { id: item.id },
  });

  return { success: true };
}

export async function clearInventory(characterId: number): Promise<{ success: boolean; deletedCount: number }> {
  const result = await prisma.playerInventory.deleteMany({
    where: { characterId },
  });

  return { success: true, deletedCount: result.count };
}

export async function moveItem(
  characterId: number,
  fromSlot: number,
  toSlot: number
): Promise<{ success: boolean; message?: string }> {
  if (fromSlot < 0 || fromSlot >= 24 || toSlot < 0 || toSlot >= 24) {
    return { success: false, message: 'Invalid slot index' };
  }

  const sourceItem = await prisma.playerInventory.findFirst({
    where: { characterId, slotIndex: fromSlot },
  });

  if (!sourceItem) {
    return { success: false, message: 'No item in source slot' };
  }

  const targetItem = await prisma.playerInventory.findFirst({
    where: { characterId, slotIndex: toSlot },
  });

  if (targetItem) {
    // Swap items
    await prisma.$transaction([
      prisma.playerInventory.update({
        where: { id: sourceItem.id },
        data: { slotIndex: toSlot },
      }),
      prisma.playerInventory.update({
        where: { id: targetItem.id },
        data: { slotIndex: fromSlot },
      }),
    ]);
  } else {
    // Just move the item
    await prisma.playerInventory.update({
      where: { id: sourceItem.id },
      data: { slotIndex: toSlot },
    });
  }

  return { success: true };
}

export async function getEmptySlot(characterId: number): Promise<number | null> {
  const usedSlots = await prisma.playerInventory.findMany({
    where: { characterId },
    select: { slotIndex: true },
  });

  const usedSet = new Set(usedSlots.map((s) => s.slotIndex));

  for (let i = 0; i < 24; i++) {
    if (!usedSet.has(i)) {
      return i;
    }
  }

  return null;
}
