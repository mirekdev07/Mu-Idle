import prisma from '@/lib/prisma';
import { ItemRarity, ItemOption } from '@/types/game';

export interface DroppedItem {
  id: number;
  name: string;
  type: string;
  level: number;
  damageMin: number;
  damageMax: number;
  attackSpeed: number;
  defense: number;
  category: number;
  emoji: string;
  rarity: ItemRarity;
  enhancementLevel: number;
  options: ItemOption[] | null;
}

const CATEGORY_EMOJIS: Record<number, string> = {
  0: '⚔️', 1: '⚔️', 2: '⚔️', 3: '⚔️', 4: '⚔️', 5: '⚔️', // Weapons
  6: '🛡️', 7: '⛑️', 8: '🦺', 9: '👖', 10: '🧤', 11: '🥾',
};

function getItemEmoji(category: number): string {
  return CATEGORY_EMOJIS[category] ?? '📦';
}

// Generate random options for items
function generateRandomOption(category: number | null, rarity: ItemRarity): ItemOption[] {
  const allOptions: ItemOption[] = [
    { type: 'critical_rate', value: 2, display: '+2% Critical Rate' },
    { type: 'attack_speed', value: 10, display: '+10% Attack Speed' },
    { type: 'life_steal', value: 2, display: '+2% Life Steal' },
    { type: 'extra_damage', value: 5, display: '+5% Extra Damage' },
    { type: 'extra_defense', value: 10, display: '+10% Extra Defense' },
    { type: 'exp_bonus', value: 10, display: '+10% EXP' },
    { type: 'zen_bonus', value: 15, display: '+15% Zen' },
  ];

  // Add weapon-only options (categories 0-5)
  if (category !== null && category >= 0 && category <= 5) {
    allOptions.push({ type: 'critical_damage', value: 25, display: '+25% Critical Damage' });
    allOptions.push({ type: 'excellent_damage', value: 10, display: 'Excellent Damage +10%' });
  }

  // Add armor-only options (categories 6-11)
  if (category !== null && category >= 6 && category <= 11) {
    allOptions.push({ type: 'hp_recovery', value: 5, display: '+5% HP Recovery' });
    allOptions.push({ type: 'max_hp', value: 5, display: '+5% Max HP' });
    allOptions.push({ type: 'damage_decrease', value: 4, display: 'Damage Decrease +4%' });
    allOptions.push({ type: 'reflect_damage', value: 5, display: 'Reflect Damage +5%' });
  }

  // Uncommon = 1 option, Rare = 2 options
  const numOptions = rarity === 'rare' ? 2 : 1;

  // Pick random options without duplicates
  const selectedOptions: ItemOption[] = [];
  const availableOptions = [...allOptions];

  for (let i = 0; i < numOptions && availableOptions.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableOptions.length);
    selectedOptions.push(availableOptions[randomIndex]);
    availableOptions.splice(randomIndex, 1);
  }

  return selectedOptions;
}

export async function getRandomItemDrop(monsterLevel: number): Promise<DroppedItem | null> {
  // Drop rate is handled by caller - this always returns an item if one exists

  // Get random item within level range
  const minLevel = Math.max(1, monsterLevel - 4);
  const maxLevel = monsterLevel + 4;

  const items = await prisma.item.findMany({
    where: {
      level: {
        gte: minLevel,
        lte: maxLevel,
      },
    },
  });

  if (items.length === 0) {
    return null;
  }

  const randomItem = items[Math.floor(Math.random() * items.length)];

  // Roll for enhancement level (0 to 4)
  // 50% +0, 25% +1, 15% +2, 7% +3, 3% +4
  const enhanceRoll = Math.floor(Math.random() * 100) + 1;
  let enhancement = 0;
  if (enhanceRoll <= 3) {
    enhancement = 4;
  } else if (enhanceRoll <= 10) {
    enhancement = 3;
  } else if (enhanceRoll <= 25) {
    enhancement = 2;
  } else if (enhanceRoll <= 50) {
    enhancement = 1;
  }

  // Apply enhancement bonuses (+4 per level)
  const bonus = enhancement * 4;
  const damageMin = randomItem.damageMin + bonus;
  const damageMax = randomItem.damageMax + bonus;
  const defense = randomItem.defenseValue + bonus;
  const name = enhancement > 0 ? `${randomItem.name} +${enhancement}` : randomItem.name;

  // Roll for rarity (70% common, 20% uncommon, 10% rare)
  const rarityRoll = Math.floor(Math.random() * 100) + 1;
  let rarity: ItemRarity = 'common';
  let options: ItemOption[] | null = null;

  if (rarityRoll <= 10) {
    rarity = 'rare';
    options = generateRandomOption(randomItem.category, 'rare');
  } else if (rarityRoll <= 30) {
    rarity = 'uncommon';
    options = generateRandomOption(randomItem.category, 'uncommon');
  }

  return {
    id: randomItem.id,
    name,
    type: randomItem.type.toString(),
    level: randomItem.level,
    damageMin,
    damageMax,
    attackSpeed: randomItem.attackSpeed,
    defense,
    category: randomItem.category,
    emoji: randomItem.emoji ?? getItemEmoji(randomItem.category),
    rarity,
    enhancementLevel: enhancement,
    options,
  };
}

export async function addItemToInventory(
  characterId: number,
  item: DroppedItem
): Promise<{ success: boolean; slotIndex?: number; message?: string }> {
  // Find first empty slot
  const usedSlots = await prisma.playerInventory.findMany({
    where: { characterId },
    select: { slotIndex: true },
    orderBy: { slotIndex: 'asc' },
  });

  const usedSlotIndices = new Set(usedSlots.map((s) => s.slotIndex));

  let emptySlot: number | null = null;
  for (let i = 0; i < 24; i++) {
    if (!usedSlotIndices.has(i)) {
      emptySlot = i;
      break;
    }
  }

  if (emptySlot === null) {
    return { success: false, message: 'Inventory full' };
  }

  await prisma.playerInventory.create({
    data: {
      characterId,
      slotIndex: emptySlot,
      itemName: item.name,
      itemType: item.type,
      itemEmoji: item.emoji,
      itemRarity: item.rarity,
      damageMin: item.damageMin,
      damageMax: item.damageMax,
      attackSpeed: item.attackSpeed,
      defenseValue: item.defense,
      itemLevel: item.level,
      category: item.category,
      enhancementLevel: item.enhancementLevel,
      itemOptions: item.options ? JSON.stringify(item.options) : null,
    },
  });

  return { success: true, slotIndex: emptySlot };
}

export { getItemEmoji };
