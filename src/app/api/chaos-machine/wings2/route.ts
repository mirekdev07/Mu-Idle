import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

// Wings Level 2 that can be created
const WINGS_LEVEL_2 = [
  {
    name: 'Wings of Spirits',
    category: 16,
    type: 'wings_spirits',
    emoji: '🪽',
    defense: 50,
  },
  {
    name: 'Wings of Soul',
    category: 16,
    type: 'wings_soul',
    emoji: '🪽',
    defense: 50,
  },
  {
    name: 'Wings of Dragon',
    category: 16,
    type: 'wings_dragon',
    emoji: '🪽',
    defense: 50,
  },
  {
    name: 'Wings of Darkness',
    category: 16,
    type: 'wings_darkness',
    emoji: '🪽',
    defense: 50,
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

function hasExcellentOption(item: InventoryItemBase): boolean {
  if (!item.itemOptions) return false;
  try {
    const options = JSON.parse(item.itemOptions) as Array<{ type: string; value: number }>;
    // Check for any excellent option (not craft_damage or craft_defense)
    return options.some(o => o.type !== 'craft_damage' && o.type !== 'craft_defense');
  } catch {
    return false;
  }
}

function calculateSuccessRate(wingsItem: InventoryItem, additionalItems: InventoryItem[]): number {
  // Base rate from Wings Level 1
  let successRate = 0;

  // Wings contribution
  const wingsEnhancement = wingsItem.enhancementLevel || 0;
  const wingsLifeBonus = getLifeBonus(wingsItem);

  // Base rate: 15% for +7, +3% per additional enhancement level
  successRate = 15 + (wingsEnhancement - 7) * 3;

  // Life bonus contribution (+4 = 3%, +8 = 6%, +12 = 9%, +16 = 12%)
  successRate += Math.floor(wingsLifeBonus / 4) * 3;

  // Additional items contribution (must have excellent option)
  for (const item of additionalItems) {
    const itemLevel = item.itemLevel || 1;
    const enhancementLevel = item.enhancementLevel || 0;
    const lifeBonus = getLifeBonus(item);

    // Level contribution (1-8%)
    const levelContribution = Math.min(8, itemLevel / 12);

    // Enhancement contribution (+4 = 3%, +5 = 5%, +6 = 7%, etc.)
    const enhancementContribution = enhancementLevel >= 4 ? (enhancementLevel - 3) * 2 + 1 : 0;

    // Life bonus contribution
    const lifeContribution = Math.floor(lifeBonus / 4) * 2;

    successRate += levelContribution + enhancementContribution + lifeContribution;
  }

  // Cap at 80%
  return Math.min(80, successRate);
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, wings_slot: rawWingsSlot, additional_item_slots: rawAdditionalSlots = [] } = body;

    // Convert to numbers and filter out invalid values
    const additional_item_slots = Array.isArray(rawAdditionalSlots)
      ? rawAdditionalSlots.map((slot) => Number(slot)).filter((slot) => !isNaN(slot) && slot >= 0)
      : [];

    // Convert wings_slot to number
    const wings_slot = rawWingsSlot !== null && rawWingsSlot !== undefined ? Number(rawWingsSlot) : null;

    // Validate wings_slot is provided
    if (wings_slot === null || isNaN(wings_slot)) {
      return errorResponse('You must select Wings Level 1');
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

    // Get user's materials
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jewelOfChaos: true, feather: true },
    });

    if (!user || user.jewelOfChaos < 1) {
      return errorResponse('You need at least 1 Jewel of Chaos');
    }

    if (!user || user.feather < 1) {
      return errorResponse('You need at least 1 Feather');
    }

    // Get the Wings Level 1
    const wingsItem = await prisma.playerInventory.findFirst({
      where: {
        characterId: character.id,
        slotIndex: wings_slot,
      },
    });

    if (!wingsItem) {
      return errorResponse('Wings not found');
    }

    // Validate it's Wings Level 1 (category 15)
    if (wingsItem.category !== 15) {
      return errorResponse('Selected item is not Wings Level 1');
    }

    // Validate Wings are +7 or higher
    if ((wingsItem.enhancementLevel || 0) < 7) {
      return errorResponse('Wings must be enhanced to +7 or higher');
    }

    // Validate Wings have Life bonus +4 or higher
    const wingsLifeBonus = getLifeBonus(wingsItem);
    if (wingsLifeBonus < 4) {
      return errorResponse('Wings must have Life bonus +4 or higher');
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
        // Additional items must be +4 and have +4 life AND have at least 1 excellent option
        if ((item.enhancementLevel || 0) < 4) {
          return errorResponse(`${item.itemName} must be enhanced to +4 or higher`);
        }
        if (getLifeBonus(item) < 4) {
          return errorResponse(`${item.itemName} must have Life bonus +4 or higher`);
        }
        if (!hasExcellentOption(item)) {
          return errorResponse(`${item.itemName} must have at least 1 special option (excellent)`);
        }
        additionalItems.push(item as InventoryItem);
      }
    }

    // Calculate success rate
    const successRate = calculateSuccessRate(wingsItem as InventoryItem, additionalItems);
    const success = Math.random() * 100 < successRate;

    // Calculate zen cost (10,000 per 1% success rate)
    const zenCost = BigInt(Math.floor(successRate * 10000));

    // Check if character has enough zen
    if (character.zen < zenCost) {
      return errorResponse(`Not enough Zen. Required: ${zenCost.toString()}`);
    }

    // Collect all slots to delete
    const slotsToDelete = [wings_slot, ...additional_item_slots];

    // Consume Jewel of Chaos, Feather and Zen
    await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: {
          jewelOfChaos: { decrement: 1 },
          feather: { decrement: 1 },
        },
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
      // Create a random Wings Level 2
      const randomWings = WINGS_LEVEL_2[Math.floor(Math.random() * WINGS_LEVEL_2.length)];

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

      // Wings Level 2 have built-in +10% Damage and +10% Defense options
      const wingsOptions = [
        { type: 'damage_percent', value: 10, display: '+10% Damage' },
        { type: 'defense_percent', value: 10, display: '+10% Defense' },
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

    // Get updated material counts and zen
    const [updatedUser, updatedCharacter] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { jewelOfChaos: true, feather: true },
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
      feather: updatedUser?.feather || 0,
      zen: updatedCharacter?.zen.toString() || '0',
    });
  } catch (error) {
    console.error('Wings Level 2 crafting error:', error);
    return errorResponse('Server error', 500);
  }
}
