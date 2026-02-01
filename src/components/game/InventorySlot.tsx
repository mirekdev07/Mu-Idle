'use client';

import { useState } from 'react';
import { Item } from '@/types/game';

interface InventorySlotProps {
  item: Item | null;
  slotIndex: number;
  onEquip?: (item: Item, slotIndex: number) => void;
  onDestroy?: (slotIndex: number) => void;
  onHover?: (item: Item | null, position: { x: number; y: number } | null) => void;
}

const RARITY_BORDERS: Record<string, string> = {
  common: 'border-gray-600',
  uncommon: 'border-green-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-yellow-500',
};

export default function InventorySlot({
  item,
  slotIndex,
  onEquip,
  onDestroy,
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
    if (onDestroy && confirm('Destroy this item?')) {
      onDestroy(slotIndex);
    }
    setShowMenu(false);
  };

  const borderClass = item ? RARITY_BORDERS[item.rarity || 'common'] : 'border-gray-700';

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

      {/* Context menu */}
      {showMenu && item && (
        <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-600 rounded shadow-lg z-40 min-w-[100px]">
          <button
            onClick={handleEquip}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 text-green-400"
          >
            Equip
          </button>
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
