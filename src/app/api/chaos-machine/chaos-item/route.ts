import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

// Chaos items that can be created (used for Wings crafting only, cannot be equipped)
const CHAOS_ITEMS = [
  {
    name: 'Chaos Axe',
    category: 14,
    type: 'chaos_axe',
    emoji: '🪓',
  },
  {
    name: 'Chaos Bow',
    category: 14,
    type: 'chaos_bow',
    emoji: '🏹',
  },
  {
    name: 'Chaos Staff',
    category: 14,
    type: 'chaos_staff',
    emoji: '🔮',
  },
];

interface InventoryItemBase {
  itemOptions: string | null;
}

interface InventoryItem {
  id: number;
  slotIndex: number;
  itemName: string | null;
  itemLevel: number | null;
  enhancementLevel: number;
  itemOptions: string | null;
}

function getLifeBonus(item: InventoryItemBase): number {
  if (!item.itemOptions) return 0;
  try {
    const options = JSON.parse(item.itemOptions) as Array<{ type: string; value: number }>;
    const craftOption = options.find(o => o.type === 'craft_damage' || o.type === 'craft_defense');
    return craftOption?.value || 0;
  } catch {
    return 0;
  }
}

function calculateSuccessRate(items: InventoryItem[]): number {
  // Base rate starts at 0%
  let successRate = 0;

  for (const item of items) {
    // Each item contributes based on:
    // - Item level (higher level items = more contribution)
    // - Enhancement level (more enhancement = more contribution)
    // - Life bonus (more life bonus = more contribution)

    const itemLevel = item.itemLevel || 1;
    const enhancementLevel = item.enhancementLevel || 0;
    const lifeBonus = getLifeBonus(item);

    // Base contribution from item level (1-10%)
    const levelContribution = Math.min(10, itemLevel / 10);

    // Enhancement contribution (+4 = 5%, +5 = 7%, +6 = 10%, +7 = 12%, +8 = 15%, +9 = 20%)
    const enhancementContribution = enhancementLevel >= 4 ? (enhancementLevel - 3) * 2.5 + 2.5 : 0;

    // Life bonus contribution (+4 = 3%, +8 = 6%, +12 = 10%, +16 = 15%)
    const lifeContribution = Math.floor(lifeBonus / 4) * 3.75;

    successRate += levelContribution + enhancementContribution + lifeContribution;
  }

  // Cap at 90%
  return Math.min(90, successRate);
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, item_slots: rawItemSlots } = body;

    // Convert to numbers and filter out invalid values (null, undefined, NaN)
    const item_slots = Array.isArray(rawItemSlots)
      ? rawItemSlots.map((slot) => Number(slot)).filter((slot) => !isNaN(slot) && slot >= 0)
      : [];

    if (item_slots.length === 0) {
      return errorResponse('You must select at least one item');
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

    // Get user's Jewel of Chaos
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jewelOfChaos: true },
    });

    if (!user || user.jewelOfChaos < 1) {
      return errorResponse('You need at least 1 Jewel of Chaos');
    }

    // Get the inventory items
    const inventoryItems = await prisma.playerInventory.findMany({
      where: {
        characterId: character.id,
        slotIndex: { in: item_slots },
      },
    });

    if (inventoryItems.length !== item_slots.length) {
      return errorResponse('Some selected items were not found');
    }

    // Validate all items meet requirements (+4 enhancement AND +4 life bonus)
    const validItems: InventoryItem[] = [];
    for (const item of inventoryItems) {
      const enhancementLevel = item.enhancementLevel || 0;
      const lifeBonus = getLifeBonus(item);

      if (enhancementLevel < 4) {
        return errorResponse(`${item.itemName} must be enhanced to +4 or higher`);
      }
      if (lifeBonus < 4) {
        return errorResponse(`${item.itemName} must have Life bonus +4 or higher`);
      }

      validItems.push(item);
    }

    // Calculate success rate
    const successRate = calculateSuccessRate(validItems);
    const success = Math.random() * 100 < successRate;

    // Calculate zen cost based on success rate (100% = 1,000,000 zen)
    const zenCost = BigInt(Math.floor(successRate * 10000));

    // Check if character has enough zen
    if (character.zen < zenCost) {
      return errorResponse(`Not enough Zen. Required: ${zenCost.toString()}`);
    }

    // Consume Jewel of Chaos and Zen
    await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: { jewelOfChaos: { decrement: 1 } },
      }),
      prisma.playerCharacter.update({
        where: { id: character.id },
        data: { zen: { decrement: zenCost } },
      }),
    ]);

    // Delete the consumed items
    await prisma.playerInventory.deleteMany({
      where: {
        characterId: character.id,
        slotIndex: { in: item_slots },
      },
    });

    let resultItem = null;

    if (success) {
      // Create a random Chaos Item (crafting material for Wings, cannot be equipped)
      const randomChaosItem = CHAOS_ITEMS[Math.floor(Math.random() * CHAOS_ITEMS.length)];

      // Find first empty slot in inventory
      const allInventory = await prisma.playerInventory.findMany({
        where: { characterId: character.id },
        select: { slotIndex: true },
      });
      const usedSlots = new Set(allInventory.map(i => i.slotIndex));
      let emptySlot = -1;
      for (let i = 0; i < 24; i++) {
        if (!usedSlots.has(i)) {
          emptySlot = i;
          break;
        }
      }

      if (emptySlot === -1) {
        return errorResponse('Inventory is full! Cannot receive Chaos Item.');
      }

      // Determine item level based on average of consumed items
      const avgLevel = Math.floor(validItems.reduce((sum, i) => sum + (i.itemLevel || 1), 0) / validItems.length);
      const itemLevel = Math.max(50, avgLevel);

      const newItem = await prisma.playerInventory.create({
        data: {
          characterId: character.id,
          slotIndex: emptySlot,
          itemName: randomChaosItem.name,
          itemType: randomChaosItem.type,
          itemEmoji: randomChaosItem.emoji,
          itemRarity: 'epic',
          itemLevel: itemLevel,
          damageMin: 0,
          damageMax: 0,
          attackSpeed: 0,
          defenseValue: 0,
          category: randomChaosItem.category,
          enhancementLevel: 0,
          itemOptions: null,
        },
      });

      resultItem = {
        slotIndex: newItem.slotIndex,
        name: newItem.itemName,
        emoji: newItem.itemEmoji,
        rarity: newItem.itemRarity,
        level: newItem.itemLevel,
        category: newItem.category,
        enhancementLevel: 0,
      };
    }

    // Get updated jewel count and zen
    const [updatedUser, updatedCharacter] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { jewelOfChaos: true },
      }),
      prisma.playerCharacter.findUnique({
        where: { id: character.id },
        select: { zen: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      mixSuccess: success,
      successRate: Math.floor(successRate),
      zenCost: zenCost.toString(),
      message: success
        ? `Success! You created ${resultItem?.name}!`
        : 'The combination failed. Materials were consumed.',
      item: resultItem,
      jewelOfChaos: updatedUser?.jewelOfChaos || 0,
      zen: updatedCharacter?.zen.toString() || '0',
    });
  } catch (error) {
    console.error('Chaos Item crafting error:', error);
    return errorResponse('Server error', 500);
  }
}
