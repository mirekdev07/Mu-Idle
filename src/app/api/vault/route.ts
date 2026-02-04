import { NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

const VAULT_SLOTS = 100;

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const character = await getLatestCharacter(userId);
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const vaultItems = await prisma.playerVault.findMany({
      where: { characterId: character.id },
      orderBy: { slotIndex: 'asc' },
    });

    // Convert to array with nulls for empty slots
    const vault: (object | null)[] = new Array(VAULT_SLOTS).fill(null);

    for (const item of vaultItems) {
      if (item.slotIndex >= 0 && item.slotIndex < VAULT_SLOTS) {
        vault[item.slotIndex] = {
          id: `vault_${item.id}`,
          slotIndex: item.slotIndex,
          name: item.itemName ?? '',
          type: item.itemType ?? '',
          emoji: item.itemEmoji ?? '',
          rarity: item.itemRarity ?? 'common',
          level: item.itemLevel,
          damage_min: item.damageMin,
          damage_max: item.damageMax,
          attack_speed: item.attackSpeed,
          defense: item.defenseValue,
          category: item.category,
          enhancementLevel: item.enhancementLevel,
          options: item.itemOptions ? JSON.parse(item.itemOptions) : null,
        };
      }
    }

    return NextResponse.json({
      success: true,
      vault,
      usedSlots: vaultItems.length,
      totalSlots: VAULT_SLOTS,
    });
  } catch (error) {
    console.error('Get vault error:', error);
    return errorResponse('Server error', 500);
  }
}
