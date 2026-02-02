'use client';

import { useState } from 'react';
import { Item, Equipment, EQUIPMENT_SLOTS } from '@/types/game';

interface InventorySlotProps {
  item: Item | null;
  slotIndex: number;
  equipment?: Equipment;
  onEquip?: (item: Item, slotIndex: number) => void;
  onDestroy?: (slotIndex: number) => void;
  onCraft?: (item: Item, slotIndex: number) => void;
  onHover?: (item: Item | null, position: { x: number; y: number } | null) => void;
}

const RARITY_BORDERS: Record<string, string> = {
  common: 'border-gray-600',
  uncommon: 'border-green-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-yellow-500',
};

// Get the equipment slot key for an item category
function getEquipmentSlotForCategory(category: number): keyof Equipment | null {
  const slot = EQUIPMENT_SLOTS.find((s) => s.categories.includes(category));
  return slot?.key ?? null;
}

// Compare item to equipped item
function compareToEquipped(
  item: Item,
  equipment: Equipment
): { isBetter: boolean; isWorse: boolean; diff: number } {
  const slotKey = getEquipmentSlotForCategory(item.category);
  if (!slotKey) return { isBetter: false, isWorse: false, diff: 0 };

  const equippedItem = equipment[slotKey];
  if (!equippedItem) {
    // Nothing equipped = this item is better (any item > no item)
    return { isBetter: true, isWorse: false, diff: 1 };
  }

  // For weapons (category 0-5), compare damage
  // For armor (category 6-11), compare defense
  const isWeapon = item.category >= 0 && item.category <= 5;

  if (isWeapon) {
    const itemDamage = (item.damage_min + item.damage_max) / 2;
    const equippedDamage = (equippedItem.damage_min + equippedItem.damage_max) / 2;
    const diff = itemDamage - equippedDamage;
    return {
      isBetter: diff > 0,
      isWorse: diff < 0,
      diff: Math.round(diff),
    };
  } else {
    const diff = item.defense - equippedItem.defense;
    return {
      isBetter: diff > 0,
      isWorse: diff < 0,
      diff,
    };
  }
}

export default function InventorySlot({
  item,
  slotIndex,
  equipment,
  onEquip,
  onDestroy,
  onCraft,
  onHover,
}: InventorySlotProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (item && onHover) {
      onHover(item, { x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null, null);
    }
    setShowMenu(false);
  };

  const handleClick = () => {
    if (item) {
      setShowMenu(!showMenu);
    }
  };

  const handleEquip = () => {
    if (item && onEquip) {
      onEquip(item, slotIndex);
    }
    setShowMenu(false);
  };

  const handleDestroy = () => {
    if (onDestroy) {
      onDestroy(slotIndex);
    }
    setShowMenu(false);
  };

  const handleCraft = () => {
    if (item && onCraft) {
      onCraft(item, slotIndex);
    }
    setShowMenu(false);
  };

  const borderClass = item ? RARITY_BORDERS[item.rarity || 'common'] : 'border-gray-700';

  // Compare to equipped
  const comparison = item && equipment ? compareToEquipped(item, equipment) : null;

  return (
    <div
      className={`relative w-12 h-12 bg-gray-800 border-2 ${borderClass} rounded cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {item ? (
        <span className="text-2xl">{item.emoji}</span>
      ) : (
        <span className="text-gray-600 text-xs">{slotIndex + 1}</span>
      )}

      {/* Enhancement indicator */}
      {item && (item.enhancementLevel ?? 0) > 0 && (
        <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold px-1 rounded">
          +{item.enhancementLevel}
        </span>
      )}

      {/* Comparison indicator (better/worse than equipped) */}
      {comparison && (comparison.isBetter || comparison.isWorse) && (
        <span
          className={`absolute -bottom-1 -left-1 text-xs font-bold px-1 rounded ${
            comparison.isBetter
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {comparison.isBetter ? '▲' : '▼'}
        </span>
      )}

      {/* Context menu */}
      {showMenu && item && (
        <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-600 rounded shadow-lg z-40 min-w-[100px]">
          <button
            onClick={handleEquip}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 text-green-400"
          >
            Equip
          </button>
          {onCraft && (
            <button
              onClick={handleCraft}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 text-yellow-400"
            >
              Craft
            </button>
          )}
          <button
            onClick={handleDestroy}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 text-red-400"
          >
            Destroy
          </button>
        </div>
      )}
    </div>
  );
}
