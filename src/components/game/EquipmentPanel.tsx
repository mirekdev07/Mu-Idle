'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Equipment, EquipmentSlotKey, Item } from '@/types/game';
import ItemModal from './ItemModal';
import { getItemImagePath, getItemImageSize } from '@/lib/game/itemImages';

interface EquipmentPanelProps {
  equipment: Equipment;
  onUnequip: (slot: EquipmentSlotKey) => void;
}

const SLOT_CONFIG: { key: EquipmentSlotKey; label: string; emoji: string }[] = [
  { key: 'helm', label: 'Helm', emoji: '⛑️' },
  { key: 'weapon', label: 'Weapon', emoji: '⚔️' },
  { key: 'armor', label: 'Armor', emoji: '🦺' },
  { key: 'shield', label: 'Shield', emoji: '🛡️' },
  { key: 'gloves', label: 'Gloves', emoji: '🧤' },
  { key: 'pants', label: 'Pants', emoji: '👖' },
  { key: 'boots', label: 'Boots', emoji: '🥾' },
  { key: 'ring', label: 'Ring', emoji: '💍' },
  { key: 'pendant', label: 'Pendant', emoji: '📿' },
  { key: 'wings', label: 'Wings', emoji: '🪽' },
];

const RARITY_BORDERS: Record<string, string> = {
  common: 'border-gray-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500',
};

export default function EquipmentPanel({ equipment, onUnequip }: EquipmentPanelProps) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlotKey | null>(null);

  const handleSlotClick = (key: EquipmentSlotKey) => {
    const item = equipment[key];
    if (item) {
      setSelectedSlot(key);
    }
  };

  const handleUnequip = () => {
    if (selectedSlot) {
      onUnequip(selectedSlot);
      setSelectedSlot(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedSlot(null);
  };

  const selectedItem = selectedSlot ? equipment[selectedSlot] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {SLOT_CONFIG.map(({ key, label, emoji }) => {
          const item = equipment[key];
          const borderClass = item ? RARITY_BORDERS[item.rarity || 'common'] : 'border-gray-700';

          return (
            <div
              key={key}
              className={`relative bg-gray-800 border-2 ${borderClass} rounded p-2 cursor-pointer hover:bg-gray-700 transition-colors`}
              onClick={() => handleSlotClick(key)}
            >
              <div className="text-center">
                {item && getItemImagePath(item.name) ? (
                  <Image
                    src={getItemImagePath(item.name)!}
                    alt={item.name}
                    width={getItemImageSize(item.name)}
                    height={getItemImageSize(item.name)}
                    className="object-contain mx-auto"
                  />
                ) : (
                  <span className="text-2xl">{item ? item.emoji : emoji}</span>
                )}
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

      {/* Item Modal for equipped items */}
      {selectedSlot && selectedItem && (
        <ItemModal
          item={selectedItem}
          slotIndex={0}
          isEquipped={true}
          onUnequip={handleUnequip}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
