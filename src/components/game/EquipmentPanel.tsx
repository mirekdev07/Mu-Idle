'use client';

import { Equipment, EquipmentSlotKey, Item } from '@/types/game';

interface EquipmentPanelProps {
  equipment: Equipment;
  onUnequip: (slot: EquipmentSlotKey) => void;
  onHover?: (item: Item | null, position: { x: number; y: number } | null) => void;
}

const SLOT_CONFIG: { key: EquipmentSlotKey; label: string; emoji: string }[] = [
  { key: 'helm', label: 'Helm', emoji: '⛑️' },
  { key: 'weapon', label: 'Weapon', emoji: '⚔️' },
  { key: 'armor', label: 'Armor', emoji: '🦺' },
  { key: 'shield', label: 'Shield', emoji: '🛡️' },
  { key: 'gloves', label: 'Gloves', emoji: '🧤' },
  { key: 'pants', label: 'Pants', emoji: '👖' },
  { key: 'boots', label: 'Boots', emoji: '🥾' },
];

const RARITY_BORDERS: Record<string, string> = {
  common: 'border-gray-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500',
};

export default function EquipmentPanel({ equipment, onUnequip, onHover }: EquipmentPanelProps) {
  const handleMouseEnter = (item: Item | undefined, e: React.MouseEvent) => {
    if (item && onHover) {
      onHover(item, { x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null, null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {SLOT_CONFIG.map(({ key, label, emoji }) => {
        const item = equipment[key];
        const borderClass = item ? RARITY_BORDERS[item.rarity || 'common'] : 'border-gray-700';

        return (
          <div
            key={key}
            className={`relative bg-gray-800 border-2 ${borderClass} rounded p-2 cursor-pointer hover:bg-gray-700 transition-colors`}
            onMouseEnter={(e) => handleMouseEnter(item, e)}
            onMouseLeave={handleMouseLeave}
            onClick={() => item && onUnequip(key)}
          >
            <div className="text-center">
              <span className="text-2xl">{item ? item.emoji : emoji}</span>
              <div className="text-xs text-gray-400 mt-1">
                {item ? (
                  <span className="text-white">
                    {item.name}
                    {(item.enhancementLevel ?? 0) > 0 && (
                      <span className="text-yellow-400"> +{item.enhancementLevel}</span>
                    )}
                  </span>
                ) : (
                  label
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
