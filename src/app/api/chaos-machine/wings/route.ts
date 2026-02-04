import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

// Wings Level 1 that can be created
const WINGS_LEVEL_1 = [
  {
    name: 'Wings of Elf',
    category: 15,
    type: 'wings_elf',
    emoji: '🪽',
    defense: 40,
  },
  {
    name: 'Wings of Heaven',
    category: 15,
    type: 'wings_heaven',
    emoji: '🪽',
    defense: 40,
  },
  {
    name: 'Wings of Satan',
    category: 15,
    type: 'wings_satan',
    emoji: '🪽',
    defense: 40,
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
  category: number;
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

function calculateSuccessRate(chaosItem: InventoryItem, additionalItems: InventoryItem[]): number {
  // Base rate from Chaos Item
  let successRate = 0;

  // Chaos Item contribution
  const chaosEnhancement = chaosItem.enhancementLevel || 0;
  const chaosLifeBonus = getLifeBonus(chaosItem);

  // Base rate: 20% for +4, +5% per additional enhancement level
  successRate = 20 + (chaosEnhancement - 4) * 5;

  // Life bonus contribution (+4 = 5%, +8 = 10%, +12 = 15%, +16 = 20%)
  successRate += Math.floor(chaosLifeBonus / 4) * 5;

  // Additional items contribution
  for (const item of additionalItems) {
    const itemLevel = item.itemLevel || 1;
    const enhancementLevel = item.enhancementLevel || 0;
    const lifeBonus = getLifeBonus(item);

    // Level contribution (1-10%)
    const levelContribution = Math.min(10, itemLevel / 10);

    // Enhancement contribution (+4 = 5%, +5 = 7%, +6 = 10%, etc.)
    const enhancementContribution = enhancementLevel >= 4 ? (enhancementLevel - 3) * 2.5 + 2.5 : 0;

    // Life bonus contribution
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
    const { character_id, chaos_item_slot: rawChaosSlot, additional_item_slots: rawAdditionalSlots = [] } = body;

    // Convert to numbers and filter out invalid values
    const additional_item_slots = Array.isArray(rawAdditionalSlots)
      ? rawAdditionalSlots.map((slot) => Number(slot)).filter((slot) => !isNaN(slot) && slot >= 0)
      : [];

    // Convert chaos_item_slot to number
    const chaos_item_slot = rawChaosSlot !== null && rawChaosSlot !== undefined ? Number(rawChaosSlot) : null;

    // Validate chaos_item_slot is provided
    if (chaos_item_slot === null || isNaN(chaos_item_slot)) {
      return errorResponse('You must select a Chaos Item');
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

    // Get the Chaos Item
    const chaosItem = await prisma.playerInventory.findFirst({
      where: {
        characterId: character.id,
        slotIndex: chaos_item_slot,
      },
    });

    if (!chaosItem) {
      return errorResponse('Chaos Item not found');
    }

    // Validate it's a Chaos Item (category 14)
    if (chaosItem.category !== 14) {
      return errorResponse('Selected item is not a Chaos Item');
    }

    // Validate Chaos Item is +4 or higher
    if ((chaosItem.enhancementLevel || 0) < 4) {
      return errorResponse('Chaos Item must be enhanced to +4 or higher');
    }

    // Validate Chaos Item has +4 Life bonus
    const chaosLifeBonus = getLifeBonus(chaosItem);
    if (chaosLifeBonus < 4) {
      return errorResponse('Chaos Item must have Life bonus +4 or higher');
    }

    // Get additional items if any
    let additionalItems: InventoryItem[] = [];
    if (additional_item_slots.length > 0) {
      const items = await prisma.playerInventory.findMany({
        where: {
          characterId: character.id,
          slotIndex: { in: additional_item_slots },
        },
      });

      // Validate additional items
      for (const item of items) {
        // Additional items must be +4 and have +4 life
        if ((item.enhancementLevel || 0) < 4) {
          return errorResponse(`${item.itemName} must be enhanced to +4 or higher`);
        }
        if (getLifeBonus(item) < 4) {
          return errorResponse(`${item.itemName} must have Life bonus +4 or higher`);
        }
        additionalItems.push(item as InventoryItem);
      }
    }

    // Calculate success rate
    const successRate = calculateSuccessRate(chaosItem as InventoryItem, additionalItems);
    const success = Math.random() * 100 < successRate;

    // Calculate zen cost (10,000 per 1% success rate)
    const zenCost = BigInt(Math.floor(successRate * 10000));

    // Check if character has enough zen
    if (character.zen < zenCost) {
      return errorResponse(`Not enough Zen. Required: ${zenCost.toString()}`);
    }

    // Collect all slots to delete
    const slotsToDelete = [chaos_item_slot, ...additional_item_slots];

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
        slotIndex: { in: slotsToDelete },
      },
    });

    let resultItem = null;

    if (success) {
      // Create a random Wings Level 1
      const randomWings = WINGS_LEVEL_1[Math.floor(Math.random() * WINGS_LEVEL_1.length)];

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
        return errorResponse('Inventory is full! Cannot receive Wings.');
      }

      // Wings have built-in +5% Damage and +5% Defense options
      const wingsOptions = [
        { type: 'damage_percent', value: 5, display: '+5% Damage' },
        { type: 'defense_percent', value: 5, display: '+5% Defense' },
      ];

      const newItem = await prisma.playerInventory.create({
        data: {
          characterId: character.id,
          slotIndex: emptySlot,
          itemName: randomWings.name,
          itemType: randomWings.type,
          itemEmoji: randomWings.emoji,
          itemRarity: 'legendary',
          itemLevel: 1,
          damageMin: 0,
          damageMax: 0,
          attackSpeed: 0,
          defenseValue: randomWings.defense,
          category: randomWings.category,
          enhancementLevel: 0,
          itemOptions: JSON.stringify(wingsOptions),
        },
      });

      resultItem = {
        slotIndex: newItem.slotIndex,
        name: newItem.itemName,
        emoji: newItem.itemEmoji,
        rarity: newItem.itemRarity,
        level: newItem.itemLevel,
        damageMin: 0,
        damageMax: 0,
        defense: randomWings.defense,
        attackSpeed: 0,
        category: newItem.category,
        enhancementLevel: 0,
        options: wingsOptions,
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
    console.error('Wings crafting error:', error);
    return errorResponse('Server error', 500);
  }
}
