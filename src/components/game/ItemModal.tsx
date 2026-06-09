'use client';

import Image from 'next/image';
import { Item, Equipment } from '@/types/game';
import { getItemImagePath, getItemImageSize } from '@/lib/game/itemImages';

interface ItemModalProps {
  item: Item;
  slotIndex: number;
  equipment?: Equipment;
  isEquipped?: boolean;
  onEquip?: () => void;
  onUnequip?: () => void;
  onCraft?: () => void;
  onDestroy?: () => void;
  onDeposit?: () => void;
  onClose: () => void;
}

const RARITY_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  common: { text: 'text-gray-300', border: 'border-gray-500', bg: 'bg-gray-500/20' },
  uncommon: { text: 'text-green-400', border: 'border-green-500', bg: 'bg-green-500/20' },
  rare: { text: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/20' },
  epic: { text: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-500/20' },
  legendary: { text: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/20' },
};

const SLOT_NAMES: Record<number, string> = {
  0: 'Weapon', 1: 'Weapon', 2: 'Weapon', 3: 'Weapon', 4: 'Weapon', 5: 'Weapon',
  6: 'Shield', 7: 'Helm', 8: 'Armor', 9: 'Pants', 10: 'Gloves', 11: 'Boots',
  12: 'Ring', 13: 'Pendant',
};

export default function ItemModal({
  item,
  equipment,
  isEquipped = false,
  onEquip,
  onUnequip,
  onCraft,
  onDestroy,
  onDeposit,
  onClose,
}: ItemModalProps) {
  const rarity = item.rarity || 'common';
  const colors = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  const isAccessory = item.category === 12 || item.category === 13;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-gray-900 border-2 ${colors.border} rounded-xl p-4 max-w-sm w-full shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${colors.bg} rounded-lg p-3 mb-4`}>
          <div className="flex items-center gap-3">
            {getItemImagePath(item.name) ? (
              <Image
                src={getItemImagePath(item.name)!}
                alt={item.name}
                width={getItemImageSize(item.name)}
                height={getItemImageSize(item.name)}
                className="object-contain"
              />
            ) : (
              <span className="text-4xl">{item.emoji}</span>
            )}
            <div className="flex-1">
              <div className={`font-bold text-lg ${colors.text}`}>
                {item.name}
                {(item.enhancementLevel ?? 0) > 0 && (
                  <span className="text-yellow-400"> +{item.enhancementLevel}</span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {rarity.charAt(0).toUpperCase() + rarity.slice(1)} {SLOT_NAMES[item.category] || 'Item'}
              </div>
            </div>
          </div>

        </div>

        {/* Stats */}
        <div className="space-y-2 mb-4">
          {(item.damage_min > 0 || item.damage_max > 0) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Damage:</span>
              <span className="text-red-400 font-bold">{item.damage_min} - {item.damage_max}</span>
            </div>
          )}
          {item.defense > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Defense:</span>
              <span className="text-blue-400 font-bold">{item.defense}</span>
            </div>
          )}
          {item.attack_speed > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Attack Speed:</span>
              <span className="text-green-400 font-bold">+{item.attack_speed}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Required Level:</span>
            <span className="font-bold">{item.level}</span>
          </div>
        </div>

        {/* Options */}
        {item.options && item.options.length > 0 && (
          <div className="mb-4 p-3 bg-purple-900/30 rounded-lg border border-purple-700">
            <div className="text-xs text-purple-300 font-bold mb-1">Special Options:</div>
            {item.options.map((opt, i) => (
              <div key={i} className="text-sm text-purple-400">{opt.display}</div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {isEquipped ? (
            <button
              onClick={onUnequip}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-white transition-colors"
            >
              Unequip
            </button>
          ) : (
            <button
              onClick={onEquip}
              className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white transition-colors"
            >
              Equip
            </button>
          )}

          {!isEquipped && onCraft && !isAccessory && (
            <button
              onClick={onCraft}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold text-white transition-colors"
            >
              Craft (Enhance)
            </button>
          )}

          {isAccessory && !isEquipped && (
            <div className="text-center text-xs text-gray-500 py-2">
              Accessories cannot be crafted
            </div>
          )}

          {!isEquipped && onDeposit && (
            <button
              onClick={onDeposit}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold text-white transition-colors"
            >
              Vault →
            </button>
          )}

          {!isEquipped && (
            <button
              onClick={onDestroy}
              className="w-full py-3 bg-red-700 hover:bg-red-600 rounded-lg font-bold text-white transition-colors"
            >
              Destroy
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
