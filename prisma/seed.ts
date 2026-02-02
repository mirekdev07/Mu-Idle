// This seed script is designed to run via Next.js environment
// For manual seeding, use prisma/seed.sql directly in Neon SQL Console

import { prisma } from '../src/lib/prisma';

const items = [
  // Category 0 - Swords/Weapons
  { type: 0, slot: 0, name: 'Kris', level: 6, damageMin: 6, damageMax: 11, attackSpeed: 50, defense: 0, category: 0, emoji: '⚔️' },
  { type: 1, slot: 0, name: 'Short Sword', level: 3, damageMin: 3, damageMax: 7, attackSpeed: 20, defense: 0, category: 0, emoji: '⚔️' },
  { type: 2, slot: 0, name: 'Rapier', level: 9, damageMin: 9, damageMax: 15, attackSpeed: 40, defense: 0, category: 0, emoji: '⚔️' },
  { type: 3, slot: 0, name: 'Katana', level: 16, damageMin: 16, damageMax: 26, attackSpeed: 35, defense: 0, category: 0, emoji: '⚔️' },
  { type: 4, slot: 0, name: 'Sword of Assassin', level: 12, damageMin: 12, damageMax: 18, attackSpeed: 30, defense: 0, category: 0, emoji: '⚔️' },
  { type: 5, slot: 0, name: 'Blade', level: 36, damageMin: 36, damageMax: 47, attackSpeed: 30, defense: 0, category: 0, emoji: '⚔️' },

  // Category 1 - Axes
  { type: 0, slot: 0, name: 'Small Axe', level: 1, damageMin: 1, damageMax: 6, attackSpeed: 20, defense: 0, category: 1, emoji: '⚔️' },
  { type: 1, slot: 0, name: 'Hand Axe', level: 4, damageMin: 4, damageMax: 9, attackSpeed: 30, defense: 0, category: 1, emoji: '⚔️' },
  { type: 2, slot: 0, name: 'Double Axe', level: 14, damageMin: 14, damageMax: 24, attackSpeed: 20, defense: 0, category: 1, emoji: '⚔️' },
  { type: 3, slot: 0, name: 'Tomahawk', level: 18, damageMin: 18, damageMax: 28, attackSpeed: 30, defense: 0, category: 1, emoji: '⚔️' },

  // Category 6 - Shields
  { type: 0, slot: 1, name: 'Small Shield', level: 3, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 1, category: 6, emoji: '🛡️' },
  { type: 1, slot: 1, name: 'Horn Shield', level: 9, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 3, category: 6, emoji: '🛡️' },
  { type: 2, slot: 1, name: 'Kite Shield', level: 12, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 4, category: 6, emoji: '🛡️' },
  { type: 3, slot: 1, name: 'Elven Shield', level: 21, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 8, category: 6, emoji: '🛡️' },

  // Category 7 - Helms
  { type: 0, slot: 2, name: 'Bronze Helm', level: 16, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 9, category: 7, emoji: '⛑️' },
  { type: 1, slot: 2, name: 'Dragon Helm', level: 57, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 24, category: 7, emoji: '⛑️' },
  { type: 2, slot: 2, name: 'Pad Helm', level: 5, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 4, category: 7, emoji: '⛑️' },
  { type: 3, slot: 2, name: 'Legendary Helm', level: 50, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 18, category: 7, emoji: '⛑️' },

  // Category 8 - Armor
  { type: 0, slot: 3, name: 'Bronze Armor', level: 18, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 14, category: 8, emoji: '🦺' },
  { type: 1, slot: 3, name: 'Dragon Armor', level: 59, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 37, category: 8, emoji: '🦺' },
  { type: 2, slot: 3, name: 'Pad Armor', level: 10, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 7, category: 8, emoji: '🦺' },
  { type: 3, slot: 3, name: 'Legendary Armor', level: 56, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 22, category: 8, emoji: '🦺' },

  // Category 9 - Pants
  { type: 0, slot: 4, name: 'Bronze Pants', level: 15, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 10, category: 9, emoji: '👖' },
  { type: 1, slot: 4, name: 'Dragon Pants', level: 55, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 26, category: 9, emoji: '👖' },
  { type: 2, slot: 4, name: 'Pad Pants', level: 8, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 5, category: 9, emoji: '👖' },

  // Category 10 - Gloves
  { type: 0, slot: 5, name: 'Bronze Gloves', level: 13, damageMin: 0, damageMax: 0, attackSpeed: 4, defense: 4, category: 10, emoji: '🧤' },
  { type: 1, slot: 5, name: 'Dragon Gloves', level: 52, damageMin: 0, damageMax: 0, attackSpeed: 6, defense: 14, category: 10, emoji: '🧤' },
  { type: 2, slot: 5, name: 'Pad Gloves', level: 3, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 2, category: 10, emoji: '🧤' },

  // Category 11 - Boots
  { type: 0, slot: 6, name: 'Bronze Boots', level: 12, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 4, category: 11, emoji: '🥾' },
  { type: 1, slot: 6, name: 'Dragon Boots', level: 54, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 15, category: 11, emoji: '🥾' },
  { type: 2, slot: 6, name: 'Pad Boots', level: 4, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 3, category: 11, emoji: '🥾' },

  // Category 12 - Rings (min level 41, no damage/defense, only options)
  { type: 0, slot: 7, name: 'Ring of Ice', level: 41, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 12, emoji: '💍' },
  { type: 1, slot: 7, name: 'Ring of Poison', level: 50, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 12, emoji: '💍' },
  { type: 2, slot: 7, name: 'Ring of Fire', level: 60, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 12, emoji: '💍' },
  { type: 3, slot: 7, name: 'Ring of Earth', level: 70, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 12, emoji: '💍' },
  { type: 4, slot: 7, name: 'Ring of Wind', level: 80, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 12, emoji: '💍' },
  { type: 5, slot: 7, name: 'Ring of Magic', level: 100, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 12, emoji: '💍' },

  // Category 13 - Pendants (min level 41, no damage/defense, only options)
  { type: 0, slot: 8, name: 'Pendant of Lightning', level: 41, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 13, emoji: '📿' },
  { type: 1, slot: 8, name: 'Pendant of Fire', level: 50, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 13, emoji: '📿' },
  { type: 2, slot: 8, name: 'Pendant of Ice', level: 60, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 13, emoji: '📿' },
  { type: 3, slot: 8, name: 'Pendant of Wind', level: 70, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 13, emoji: '📿' },
  { type: 4, slot: 8, name: 'Pendant of Water', level: 80, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 13, emoji: '📿' },
  { type: 5, slot: 8, name: 'Pendant of Ability', level: 100, damageMin: 0, damageMax: 0, attackSpeed: 0, defense: 0, category: 13, emoji: '📿' },
];

async function main() {
  console.log('Seeding database...');

  await prisma.item.deleteMany();

  for (const item of items) {
    await prisma.item.create({
      data: {
        type: item.type,
        slot: item.slot,
        name: item.name,
        level: item.level,
        damageMin: item.damageMin,
        damageMax: item.damageMax,
        attackSpeed: item.attackSpeed,
        defenseValue: item.defense,
        category: item.category,
        emoji: item.emoji,
      },
    });
  }

  console.log(`Seeded ${items.length} items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
