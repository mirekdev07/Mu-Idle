import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, inventory_slot, action } = body;

    if (!['bless', 'bless_max', 'soul', 'life'].includes(action)) {
      return errorResponse('Invalid crafting action');
    }

    if (typeof inventory_slot !== 'number') {
      return errorResponse('Invalid inventory slot');
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

    // Get user's jewels
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        jewelOfBless: true,
        jewelOfSoul: true,
        jewelOfLife: true,
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Get the inventory item
    const inventoryItem = await prisma.playerInventory.findFirst({
      where: {
        characterId: character.id,
        slotIndex: inventory_slot,
      },
    });

    if (!inventoryItem) {
      return errorResponse('Item not found in inventory');
    }

    const currentLevel = inventoryItem.enhancementLevel || 0;
    let success = false;
    let message = '';
    let jewelField: 'jewelOfBless' | 'jewelOfSoul' | 'jewelOfLife';
    let updateData: Record<string, unknown> = {};

    // Check if item is a weapon (category 0-5) or Chaos Item (category 14) - these get +Damage
    const isWeapon = (inventoryItem.category >= 0 && inventoryItem.category <= 5) || inventoryItem.category === 14;

    if (action === 'bless') {
      jewelField = 'jewelOfBless';

      // Check if player has jewels
      if (user.jewelOfBless < 1) {
        return errorResponse('Not enough Jewel of Bless');
      }

      // Check max level for bless
      if (currentLevel >= 6) {
        return errorResponse('Item already at maximum level for Jewel of Bless (+6)');
      }

      // 100% success rate
      success = true;

      // Enhancement increases actual stats: +3 damage for weapons, +2 defense for armor
      if (isWeapon) {
        updateData = {
          enhancementLevel: currentLevel + 1,
          damageMin: inventoryItem.damageMin + 3,
          damageMax: inventoryItem.damageMax + 3,
        };
      } else {
        updateData = {
          enhancementLevel: currentLevel + 1,
          defenseValue: inventoryItem.defenseValue + 2,
        };
      }
      message = `Success! Item upgraded to +${currentLevel + 1}`;

    } else if (action === 'bless_max') {
      jewelField = 'jewelOfBless';

      // Calculate how many levels to upgrade (up to +6)
      const levelsNeeded = 6 - currentLevel;

      if (levelsNeeded <= 0) {
        return errorResponse('Item already at maximum level for Jewel of Bless (+6)');
      }

      // Check if player has enough jewels
      if (user.jewelOfBless < levelsNeeded) {
        return errorResponse(`Not enough Jewel of Bless (need ${levelsNeeded}, have ${user.jewelOfBless})`);
      }

      // 100% success rate - upgrade all levels at once
      success = true;

      // Enhancement increases actual stats: +3 damage per level for weapons, +2 defense per level for armor
      const totalStatBonus = levelsNeeded * (isWeapon ? 3 : 2);
      if (isWeapon) {
        updateData = {
          enhancementLevel: 6,
          damageMin: inventoryItem.damageMin + totalStatBonus,
          damageMax: inventoryItem.damageMax + totalStatBonus,
        };
      } else {
        updateData = {
          enhancementLevel: 6,
          defenseValue: inventoryItem.defenseValue + totalStatBonus,
        };
      }
      message = `Success! Item upgraded to +6 (used ${levelsNeeded} jewels)`;

      // Deduct all jewels at once
      await prisma.user.update({
        where: { id: userId },
        data: {
          jewelOfBless: { decrement: levelsNeeded },
        },
      });

      // Update item
      await prisma.playerInventory.update({
        where: { id: inventoryItem.id },
        data: updateData,
      });

      // Get updated user jewels
      const updatedUserBlessMax = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          jewelOfBless: true,
          jewelOfSoul: true,
          jewelOfLife: true,
        },
      });

      // Get updated item
      const updatedItemBlessMax = await prisma.playerInventory.findFirst({
        where: {
          characterId: character.id,
          slotIndex: inventory_slot,
        },
      });

      return NextResponse.json({
        success,
        message,
        jewels: {
          bless: updatedUserBlessMax?.jewelOfBless || 0,
          soul: updatedUserBlessMax?.jewelOfSoul || 0,
          life: updatedUserBlessMax?.jewelOfLife || 0,
        },
        item: updatedItemBlessMax ? {
          slotIndex: updatedItemBlessMax.slotIndex,
          name: updatedItemBlessMax.itemName,
          emoji: updatedItemBlessMax.itemEmoji,
          rarity: updatedItemBlessMax.itemRarity,
          level: updatedItemBlessMax.itemLevel,
          damageMin: updatedItemBlessMax.damageMin,
          damageMax: updatedItemBlessMax.damageMax,
          defense: updatedItemBlessMax.defenseValue,
          attackSpeed: updatedItemBlessMax.attackSpeed,
          category: updatedItemBlessMax.category,
          enhancementLevel: updatedItemBlessMax.enhancementLevel,
          options: updatedItemBlessMax.itemOptions ? JSON.parse(updatedItemBlessMax.itemOptions) : null,
        } : null,
      });

    } else if (action === 'soul') {
      jewelField = 'jewelOfSoul';

      // Check if player has jewels
      if (user.jewelOfSoul < 1) {
        return errorResponse('Not enough Jewel of Soul');
      }

      // Check minimum level for soul
      if (currentLevel < 6) {
        return errorResponse('Item must be +6 before using Jewel of Soul');
      }

      // Check max level for soul
      if (currentLevel >= 9) {
        return errorResponse('Item already at maximum level (+9)');
      }

      // 70% success rate
      success = Math.random() < 0.7;
      if (success) {
        // Enhancement increases actual stats: +3 damage for weapons, +2 defense for armor
        if (isWeapon) {
          updateData = {
            enhancementLevel: currentLevel + 1,
            damageMin: inventoryItem.damageMin + 3,
            damageMax: inventoryItem.damageMax + 3,
          };
        } else {
          updateData = {
            enhancementLevel: currentLevel + 1,
            defenseValue: inventoryItem.defenseValue + 2,
          };
        }
        message = `Success! Item upgraded to +${currentLevel + 1}`;
      } else {
        message = 'Failed! The upgrade was unsuccessful.';
      }

    } else if (action === 'life') {
      jewelField = 'jewelOfLife';

      // Check if player has jewels
      if (user.jewelOfLife < 1) {
        return errorResponse('Not enough Jewel of Life');
      }

      // Parse existing options
      let options: Array<{ type: string; value: number; display: string }> = [];
      if (inventoryItem.itemOptions) {
        try {
          options = JSON.parse(inventoryItem.itemOptions);
        } catch {
          options = [];
        }
      }

      // For weapons: add damage. For armor: add defense
      const optionType = isWeapon ? 'craft_damage' : 'craft_defense';
      const statName = isWeapon ? 'Damage' : 'Defense';

      // Find existing craft option
      const existingOption = options.find(o => o.type === optionType);
      const currentBonus = existingOption?.value || 0;

      if (currentBonus >= 16) {
        return errorResponse(`Item already has maximum craft ${statName.toLowerCase()} bonus (+16)`);
      }

      // 70% success rate
      success = Math.random() < 0.7;
      if (success) {
        const newBonus = currentBonus + 4;

        if (existingOption) {
          existingOption.value = newBonus;
          existingOption.display = `+${newBonus} ${statName} (Life)`;
        } else {
          options.push({
            type: optionType,
            value: newBonus,
            display: `+${newBonus} ${statName} (Life)`,
          });
        }

        // Actually update the stats on the item
        if (isWeapon) {
          updateData = {
            itemOptions: JSON.stringify(options),
            damageMin: inventoryItem.damageMin + 4,
            damageMax: inventoryItem.damageMax + 4,
          };
        } else {
          updateData = {
            itemOptions: JSON.stringify(options),
            defenseValue: inventoryItem.defenseValue + 4,
          };
        }
        message = `Success! Added +4 ${statName} (total: +${newBonus})`;
      } else {
        message = 'Failed! The crafting was unsuccessful.';
      }
    } else {
      return errorResponse('Invalid action');
    }

    // Deduct jewel from user account
    await prisma.user.update({
      where: { id: userId },
      data: {
        [jewelField]: { decrement: 1 },
      },
    });

    // Update item if successful
    if (success && Object.keys(updateData).length > 0) {
      await prisma.playerInventory.update({
        where: { id: inventoryItem.id },
        data: updateData,
      });

      // Check if item reached +9 for quest and update max enhancement for achievements
      const newEnhancement = (updateData.enhancementLevel as number) || currentLevel;

      // Get current max enhancement
      const charData = await prisma.playerCharacter.findUnique({
        where: { id: character.id },
        select: { maxEnhancement: true },
      });

      const updateCharData: Record<string, unknown> = {};

      if (newEnhancement >= 9) {
        updateCharData.questCraftToday = true;
      }

      // Update max enhancement if this is higher
      if (newEnhancement > (charData?.maxEnhancement || 0)) {
        updateCharData.maxEnhancement = newEnhancement;
      }

      if (Object.keys(updateCharData).length > 0) {
        await prisma.playerCharacter.update({
          where: { id: character.id },
          data: updateCharData,
        });
      }
    }

    // Get updated user jewels
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        jewelOfBless: true,
        jewelOfSoul: true,
        jewelOfLife: true,
      },
    });

    // Get updated item
    const updatedItem = await prisma.playerInventory.findFirst({
      where: {
        characterId: character.id,
        slotIndex: inventory_slot,
      },
    });

    return NextResponse.json({
      success,
      message,
      jewels: {
        bless: updatedUser?.jewelOfBless || 0,
        soul: updatedUser?.jewelOfSoul || 0,
        life: updatedUser?.jewelOfLife || 0,
      },
      item: updatedItem ? {
        slotIndex: updatedItem.slotIndex,
        name: updatedItem.itemName,
        emoji: updatedItem.itemEmoji,
        rarity: updatedItem.itemRarity,
        level: updatedItem.itemLevel,
        damageMin: updatedItem.damageMin,
        damageMax: updatedItem.damageMax,
        defense: updatedItem.defenseValue,
        attackSpeed: updatedItem.attackSpeed,
        category: updatedItem.category,
        enhancementLevel: updatedItem.enhancementLevel,
        options: updatedItem.itemOptions ? JSON.parse(updatedItem.itemOptions) : null,
      } : null,
    });
  } catch (error) {
    console.error('Crafting error:', error);
    return errorResponse('Server error', 500);
  }
}
