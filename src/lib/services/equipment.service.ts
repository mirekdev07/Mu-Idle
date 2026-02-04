import prisma from '@/lib/prisma';
import { Equipment, Item, ItemOption, ItemRarity, EquipmentSlotKey } from '@/types/game';
import { getEquipmentBonuses } from './stats.service';
import { getEmptySlot } from './inventory.service';

const SLOT_NAMES: EquipmentSlotKey[] = ['weapon', 'shield', 'helm', 'armor', 'pants', 'gloves', 'boots', 'ring', 'pendant', 'wings'];

// Map category to equipment slot
function getEquipmentSlotFromCategory(category: number): number | null {
  if (category >= 0 && category <= 5) return 0; // Weapons
  if (category === 6) return 1;  // Shield
  if (category === 7) return 2;  // Helm
  if (category === 8) return 3;  // Armor
  if (category === 9) return 4;  // Pants
  if (category === 10) return 5; // Gloves
  if (category === 11) return 6; // Boots
  if (category === 12) return 7; // Ring
  if (category === 13) return 8; // Pendant
  // Category 14 (Chaos Items) cannot be equipped - they are crafting materials only
  if (category === 15) return 9; // Wings Level 1
  if (category === 16) return 9; // Wings Level 2
  return null;
}

// Map equipment slot to category (for unequip)
function getCategoryFromSlot(slot: number): number {
  const categoryMap: Record<number, number> = {
    0: 0, 1: 6, 2: 7, 3: 8, 4: 9, 5: 10, 6: 11, 7: 12, 8: 13, 9: 15,
  };
  return categoryMap[slot] ?? 0;
}

function parseOptions(optionsJson: string | null): ItemOption[] | undefined {
  if (!optionsJson) return undefined;
  try {
    return JSON.parse(optionsJson);
  } catch {
    return undefined;
  }
}

export async function getEquipment(characterId: number): Promise<Equipment> {
  const equippedItems = await prisma.characterEquipment.findMany({
    where: { characterId },
  });

  const equipment: Equipment = {};

  for (const item of equippedItems) {
    const slotIndex = item.slot;
    if (slotIndex >= 0 && slotIndex < SLOT_NAMES.length) {
      const slotName = SLOT_NAMES[slotIndex];
      equipment[slotName] = {
        id: `eq_${item.id}`,
        name: item.itemName ?? '',
        type: item.itemType ?? '',
        category: getCategoryFromSlot(slotIndex),
        level: item.itemLevel,
        damage_min: item.damageMin,
        damage_max: item.damageMax,
        attack_speed: item.attackSpeed,
        defense: item.defenseValue,
        rarity: (item.itemRarity as ItemRarity) ?? 'common',
        enhancementLevel: item.enhancementLevel,
        options: parseOptions(item.itemOptions),
        emoji: item.itemEmoji ?? '⚔️',
      };
    }
  }

  return equipment;
}

export async function equipItem(
  characterId: number,
  inventorySlotIndex: number
): Promise<{
  success: boolean;
  message?: string;
  equipment?: Equipment;
  inventory?: (Item | null)[];
}> {
  // Get item from inventory
  const inventoryItem = await prisma.playerInventory.findFirst({
    where: { characterId, slotIndex: inventorySlotIndex },
  });

  if (!inventoryItem) {
    return { success: false, message: 'No item in that slot' };
  }

  // Determine equipment slot
  const equipmentSlot = getEquipmentSlotFromCategory(inventoryItem.category);
  if (equipmentSlot === null) {
    return { success: false, message: 'Cannot equip this item type' };
  }

  // Check for existing equipment in slot
  const existingEquipment = await prisma.characterEquipment.findFirst({
    where: { characterId, slot: equipmentSlot },
  });

  // Start transaction
  await prisma.$transaction(async (tx) => {
    if (existingEquipment) {
      // Find empty inventory slot for the swap
      const emptySlot = await getEmptySlot(characterId);
      if (emptySlot === null) {
        throw new Error('Inventory is full - cannot swap items');
      }

      // Move existing equipment to inventory
      await tx.playerInventory.create({
        data: {
          characterId,
          slotIndex: emptySlot,
          itemName: existingEquipment.itemName,
          itemType: existingEquipment.itemType,
          itemEmoji: existingEquipment.itemEmoji,
          itemRarity: existingEquipment.itemRarity,
          damageMin: existingEquipment.damageMin,
          damageMax: existingEquipment.damageMax,
          attackSpeed: existingEquipment.attackSpeed,
          defenseValue: existingEquipment.defenseValue,
          itemLevel: existingEquipment.itemLevel,
          category: getCategoryFromSlot(equipmentSlot),
          enhancementLevel: existingEquipment.enhancementLevel,
          itemOptions: existingEquipment.itemOptions,
        },
      });

      // Remove from equipment
      await tx.characterEquipment.delete({
        where: { id: existingEquipment.id },
      });
    }

    // Add new item to equipment
    await tx.characterEquipment.create({
      data: {
        characterId,
        slot: equipmentSlot,
        itemType: inventoryItem.itemType,
        itemName: inventoryItem.itemName,
        itemEmoji: inventoryItem.itemEmoji,
        itemRarity: inventoryItem.itemRarity,
        damageMin: inventoryItem.damageMin,
        damageMax: inventoryItem.damageMax,
        attackSpeed: inventoryItem.attackSpeed,
        defenseValue: inventoryItem.defenseValue,
        itemLevel: inventoryItem.itemLevel,
        enhancementLevel: inventoryItem.enhancementLevel,
        itemOptions: inventoryItem.itemOptions,
      },
    });

    // Remove from inventory
    await tx.playerInventory.delete({
      where: { id: inventoryItem.id },
    });
  });

  return { success: true };
}

export async function unequipItem(
  characterId: number,
  equipmentSlot: number
): Promise<{
  success: boolean;
  message?: string;
}> {
  // Get equipped item
  const equippedItem = await prisma.characterEquipment.findFirst({
    where: { characterId, slot: equipmentSlot },
  });

  if (!equippedItem) {
    return { success: false, message: 'No item equipped in that slot' };
  }

  // Find empty inventory slot
  const emptySlot = await getEmptySlot(characterId);
  if (emptySlot === null) {
    return { success: false, message: 'Inventory full' };
  }

  // Transaction: move to inventory, remove from equipment
  await prisma.$transaction([
    prisma.playerInventory.create({
      data: {
        characterId,
        slotIndex: emptySlot,
        itemName: equippedItem.itemName,
        itemType: equippedItem.itemType,
        itemEmoji: equippedItem.itemEmoji ?? '📦',
        itemRarity: equippedItem.itemRarity ?? 'common',
        damageMin: equippedItem.damageMin,
        damageMax: equippedItem.damageMax,
        attackSpeed: equippedItem.attackSpeed,
        defenseValue: equippedItem.defenseValue,
        itemLevel: equippedItem.itemLevel,
        category: getCategoryFromSlot(equipmentSlot),
        enhancementLevel: equippedItem.enhancementLevel,
        itemOptions: equippedItem.itemOptions,
      },
    }),
    prisma.characterEquipment.delete({
      where: { id: equippedItem.id },
    }),
  ]);

  return { success: true };
}

export { getEquipmentBonuses };
