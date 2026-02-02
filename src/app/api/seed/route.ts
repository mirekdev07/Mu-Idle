import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const items = [
  // Category 0 - Swords/Weapons
  { type: 0, slot: 0, name: 'Kris', level: 6, damageMin: 6, damageMax: 11, attackSpeed: 50, defenseValue: 0, category: 0, emoji: '⚔️' },
  { type: 1, slot: 0, name: 'Short Sword', level: 3, damageMin: 3, damageMax: 7, attackSpeed: 20, defenseValue: 0, category: 0, emoji: '⚔️' },
  { type: 2, slot: 0, name: 'Rapier', level: 9, damageMin: 9, damageMax: 15, attackSpeed: 40, defenseValue: 0, category: 0, emoji: '⚔️' },
  { type: 3, slot: 0, name: 'Katana', level: 16, damageMin: 16, damageMax: 26, attackSpeed: 35, defenseValue: 0, category: 0, emoji: '⚔️' },
  { type: 4, slot: 0, name: 'Sword of Assassin', level: 12, damageMin: 12, damageMax: 18, attackSpeed: 30, defenseValue: 0, category: 0, emoji: '⚔️' },
  { type: 5, slot: 0, name: 'Blade', level: 36, damageMin: 36, damageMax: 47, attackSpeed: 30, defenseValue: 0, category: 0, emoji: '⚔️' },
  { type: 6, slot: 0, name: 'Giant Sword', level: 25, damageMin: 25, damageMax: 35, attackSpeed: 25, defenseValue: 0, category: 0, emoji: '⚔️' },
  { type: 7, slot: 0, name: 'Chaos Blade', level: 45, damageMin: 45, damageMax: 60, attackSpeed: 35, defenseValue: 0, category: 0, emoji: '⚔️' },

  // Category 1 - Axes
  { type: 0, slot: 0, name: 'Small Axe', level: 1, damageMin: 1, damageMax: 6, attackSpeed: 20, defenseValue: 0, category: 1, emoji: '🪓' },
  { type: 1, slot: 0, name: 'Hand Axe', level: 4, damageMin: 4, damageMax: 9, attackSpeed: 30, defenseValue: 0, category: 1, emoji: '🪓' },
  { type: 2, slot: 0, name: 'Double Axe', level: 14, damageMin: 14, damageMax: 24, attackSpeed: 20, defenseValue: 0, category: 1, emoji: '🪓' },
  { type: 3, slot: 0, name: 'Tomahawk', level: 18, damageMin: 18, damageMax: 28, attackSpeed: 30, defenseValue: 0, category: 1, emoji: '🪓' },
  { type: 4, slot: 0, name: 'Battle Axe', level: 28, damageMin: 28, damageMax: 40, attackSpeed: 25, defenseValue: 0, category: 1, emoji: '🪓' },
  { type: 5, slot: 0, name: 'War Axe', level: 42, damageMin: 42, damageMax: 55, attackSpeed: 30, defenseValue: 0, category: 1, emoji: '🪓' },

  // Category 6 - Shields
  { type: 0, slot: 1, name: 'Small Shield', level: 3, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 1, category: 6, emoji: '🛡️' },
  { type: 1, slot: 1, name: 'Horn Shield', level: 9, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 3, category: 6, emoji: '🛡️' },
  { type: 2, slot: 1, name: 'Kite Shield', level: 12, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 4, category: 6, emoji: '🛡️' },
  { type: 3, slot: 1, name: 'Elven Shield', level: 21, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 8, category: 6, emoji: '🛡️' },
  { type: 4, slot: 1, name: 'Tower Shield', level: 30, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 12, category: 6, emoji: '🛡️' },
  { type: 5, slot: 1, name: 'Dragon Shield', level: 45, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 18, category: 6, emoji: '🛡️' },

  // Category 7 - Helms
  { type: 0, slot: 2, name: 'Pad Helm', level: 5, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 4, category: 7, emoji: '⛑️' },
  { type: 1, slot: 2, name: 'Bronze Helm', level: 16, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 9, category: 7, emoji: '⛑️' },
  { type: 2, slot: 2, name: 'Scale Helm', level: 26, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 14, category: 7, emoji: '⛑️' },
  { type: 3, slot: 2, name: 'Brass Helm', level: 36, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 18, category: 7, emoji: '⛑️' },
  { type: 4, slot: 2, name: 'Legendary Helm', level: 50, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 22, category: 7, emoji: '⛑️' },
  { type: 5, slot: 2, name: 'Dragon Helm', level: 57, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 28, category: 7, emoji: '⛑️' },

  // Category 8 - Armor
  { type: 0, slot: 3, name: 'Pad Armor', level: 10, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 7, category: 8, emoji: '🦺' },
  { type: 1, slot: 3, name: 'Bronze Armor', level: 18, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 14, category: 8, emoji: '🦺' },
  { type: 2, slot: 3, name: 'Scale Armor', level: 28, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 20, category: 8, emoji: '🦺' },
  { type: 3, slot: 3, name: 'Brass Armor', level: 38, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 26, category: 8, emoji: '🦺' },
  { type: 4, slot: 3, name: 'Legendary Armor', level: 48, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 32, category: 8, emoji: '🦺' },
  { type: 5, slot: 3, name: 'Dragon Armor', level: 59, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 40, category: 8, emoji: '🦺' },

  // Category 9 - Pants
  { type: 0, slot: 4, name: 'Pad Pants', level: 8, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 5, category: 9, emoji: '👖' },
  { type: 1, slot: 4, name: 'Bronze Pants', level: 15, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 10, category: 9, emoji: '👖' },
  { type: 2, slot: 4, name: 'Scale Pants', level: 24, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 15, category: 9, emoji: '👖' },
  { type: 3, slot: 4, name: 'Brass Pants', level: 34, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 20, category: 9, emoji: '👖' },
  { type: 4, slot: 4, name: 'Legendary Pants', level: 46, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 26, category: 9, emoji: '👖' },
  { type: 5, slot: 4, name: 'Dragon Pants', level: 55, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 32, category: 9, emoji: '👖' },

  // Category 10 - Gloves
  { type: 0, slot: 5, name: 'Pad Gloves', level: 3, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 2, category: 10, emoji: '🧤' },
  { type: 1, slot: 5, name: 'Bronze Gloves', level: 13, damageMin: 0, damageMax: 0, attackSpeed: 4, defenseValue: 4, category: 10, emoji: '🧤' },
  { type: 2, slot: 5, name: 'Scale Gloves', level: 22, damageMin: 0, damageMax: 0, attackSpeed: 6, defenseValue: 8, category: 10, emoji: '🧤' },
  { type: 3, slot: 5, name: 'Brass Gloves', level: 32, damageMin: 0, damageMax: 0, attackSpeed: 8, defenseValue: 12, category: 10, emoji: '🧤' },
  { type: 4, slot: 5, name: 'Legendary Gloves', level: 44, damageMin: 0, damageMax: 0, attackSpeed: 10, defenseValue: 16, category: 10, emoji: '🧤' },
  { type: 5, slot: 5, name: 'Dragon Gloves', level: 52, damageMin: 0, damageMax: 0, attackSpeed: 12, defenseValue: 20, category: 10, emoji: '🧤' },

  // Category 11 - Boots
  { type: 0, slot: 6, name: 'Pad Boots', level: 4, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 3, category: 11, emoji: '🥾' },
  { type: 1, slot: 6, name: 'Bronze Boots', level: 12, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 6, category: 11, emoji: '🥾' },
  { type: 2, slot: 6, name: 'Scale Boots', level: 20, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 10, category: 11, emoji: '🥾' },
  { type: 3, slot: 6, name: 'Brass Boots', level: 30, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 14, category: 11, emoji: '🥾' },
  { type: 4, slot: 6, name: 'Legendary Boots', level: 42, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 18, category: 11, emoji: '🥾' },
  { type: 5, slot: 6, name: 'Dragon Boots', level: 54, damageMin: 0, damageMax: 0, attackSpeed: 0, defenseValue: 22, category: 11, emoji: '🥾' },
];

export async function GET() {
  try {
    // Check if items already exist
    const count = await prisma.item.count();
    if (count > 0) {
      return NextResponse.json({
        success: true,
        message: `Items already seeded (${count} items exist)`
      });
    }

    // Seed items
    for (const item of items) {
      await prisma.item.create({ data: item });
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${items.length} items`
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
