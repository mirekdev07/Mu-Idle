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
  0: 'Weapon',
  1: 'Shield',
  2: 'Helm',
  3: 'Armor',
  4: 'Pants',
  5: 'Gloves',
  6: 'Boots',
};

export default function ItemTooltip({ item, position }: ItemTooltipProps) {
  const rarityClass = RARITY_COLORS[item.rarity || 'common'] || RARITY_COLORS.common;

  return (
    <div
      className={`fixed z-50 bg-gray-900 border-2 ${rarityClass} rounded-lg p-3 shadow-lg min-w-[200px] pointer-events-none`}
      style={{
        left: Math.min(position.x + 10, window.innerWidth - 220),
        top: Math.min(position.y + 10, window.innerHeight - 300),
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

      {/* Enhancement bonus */}
      {(item.enhancementLevel ?? 0) > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-yellow-400">
          +{(item.enhancementLevel ?? 0) * 3}% bonus stats
        </div>
      )}

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
