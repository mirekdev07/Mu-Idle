'use client';

import { Item } from '@/types/game';

interface ItemTooltipProps {
  item: Item;
  position: { x: number; y: number };
}

const RARITY_COLORS: Record<string, string> = {
  common: 'text-gray-300 border-gray-500',
  uncommon: 'text-green-400 border-green-500',
  rare: 'text-blue-400 border-blue-500',
  epic: 'text-purple-400 border-purple-500',
  legendary: 'text-yellow-400 border-yellow-500',
};

const SLOT_NAMES: Record<number, string> = {
  0: 'Weapon', 1: 'Weapon', 2: 'Weapon', 3: 'Weapon', 4: 'Weapon', 5: 'Weapon', // Categories 0-5 are weapons
  6: 'Shield',
  7: 'Helm',
  8: 'Armor',
  9: 'Pants',
  10: 'Gloves',
  11: 'Boots',
  12: 'Ring',
  13: 'Pendant',
};

export default function ItemTooltip({ item, position }: ItemTooltipProps) {
  const rarityClass = RARITY_COLORS[item.rarity || 'common'] || RARITY_COLORS.common;

  // Detect mobile (small screen)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Calculate position
  const tooltipWidth = isMobile ? 180 : 220;
  const tooltipHeight = 250;
  const offset = isMobile ? 20 : 80; // Smaller offset on mobile

  // On mobile, center the tooltip horizontally
  let leftPos: number;
  if (isMobile) {
    // Center horizontally on mobile
    leftPos = (window.innerWidth - tooltipWidth) / 2;
  } else {
    // Desktop: show to the right if space, otherwise left
    const spaceOnRight = window.innerWidth - position.x;
    const showOnRight = spaceOnRight > tooltipWidth + offset;
    leftPos = showOnRight
      ? position.x + offset
      : position.x - tooltipWidth - 20;
  }

  // Clamp to screen bounds
  leftPos = Math.max(10, Math.min(leftPos, window.innerWidth - tooltipWidth - 10));

  // Calculate top position - on mobile show above or below the touch point
  let topPos: number;
  if (isMobile) {
    // On mobile, show above the item if there's space, otherwise below
    if (position.y > tooltipHeight + 60) {
      topPos = position.y - tooltipHeight - 60;
    } else {
      topPos = position.y + 60;
    }
  } else {
    topPos = position.y - 50;
  }
  topPos = Math.max(10, Math.min(topPos, window.innerHeight - tooltipHeight - 10));

  return (
    <div
      className={`fixed z-50 bg-gray-900 border-2 ${rarityClass} rounded-lg p-3 shadow-lg min-w-[200px] pointer-events-none`}
      style={{
        left: leftPos,
        top: topPos,
      }}
    >
      {/* Item Name */}
      <div className={`font-bold text-sm ${rarityClass.split(' ')[0]}`}>
        {item.emoji} {item.name}
        {(item.enhancementLevel ?? 0) > 0 && (
          <span className="text-yellow-400"> +{item.enhancementLevel}</span>
        )}
      </div>

      {/* Rarity & Slot */}
      <div className="text-xs text-gray-400 mt-1">
        {(item.rarity || 'common').charAt(0).toUpperCase() + (item.rarity || 'common').slice(1)} {SLOT_NAMES[item.category] || 'Item'}
      </div>

      {/* Stats */}
      <div className="mt-2 space-y-1 text-xs">
        {(item.damage_min > 0 || item.damage_max > 0) && (
          <div className="flex justify-between">
            <span className="text-gray-400">Damage:</span>
            <span className="text-red-400">{item.damage_min} - {item.damage_max}</span>
          </div>
        )}
        {item.defense > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Defense:</span>
            <span className="text-blue-400">{item.defense}</span>
          </div>
        )}
        {item.attack_speed > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Attack Speed:</span>
            <span className="text-green-400">+{item.attack_speed}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">Required Level:</span>
          <span>{item.level}</span>
        </div>
      </div>

      {/* Options */}
      {item.options && item.options.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-purple-400">
          {item.options.map((opt, i) => (
            <div key={i}>{opt.display}</div>
          ))}
        </div>
      )}
    </div>
  );
}
