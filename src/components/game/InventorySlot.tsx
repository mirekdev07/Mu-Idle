'use client';

import { useState } from 'react';
import { Item, Equipment, EQUIPMENT_SLOTS } from '@/types/game';
import ItemModal from './ItemModal';

interface InventorySlotProps {
  item: Item | null;
  slotIndex: number;
  equipment?: Equipment;
  onEquip?: (item: Item, slotIndex: number) => void;
  onDestroy?: (slotIndex: number) => void;
  onCraft?: (item: Item, slotIndex: number) => void;
}

const RARITY_BORDERS: Record<string, string> = {
  common: 'border-gray-600',
  uncommon: 'border-green-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-yellow-500',
};

function getEquipmentSlotForCategory(category: number): keyof Equipment | null {
  const slot = EQUIPMENT_SLOTS.find((s) => s.categories.includes(category));
  return slot?.key ?? null;
}

function calculateItemScore(item: Item): number {
  const isWeapon = item.category >= 0 && item.category <= 5;
  const enhancementLevel = item.enhancementLevel || 0;

  // Base stats
  let score = 0;

  if (isWeapon) {
    // Weapons: base damage + enhancement bonus
    score = (item.damage_min + item.damage_max) / 2;
    score += enhancementLevel * 3;
  } else {
    // Armor: base defense + enhancement bonus
    score = item.defense;
    score += enhancementLevel * 2;
  }

  // Add option values with weights
  if (item.options && Array.isArray(item.options)) {
    for (const option of item.options) {
      switch (option.type) {
        case 'extra_damage':
        case 'craft_damage':
          score += option.value * (isWeapon ? 1 : 0.5);
          break;
        case 'extra_defense':
        case 'craft_defense':
          score += option.value * (isWeapon ? 0.5 : 1);
          break;
        case 'critical_rate':
          score += option.value * 3; // Crit is valuable
          break;
        case 'critical_damage':
          score += option.value * 2;
          break;
        case 'life_steal':
          score += option.value * 5; // Life steal is very valuable
          break;
        case 'attack_speed':
          score += option.value * 2;
          break;
        case 'exp_bonus':
          score += option.value * 1;
          break;
        case 'max_hp':
          score += option.value * 2;
          break;
        case 'hp_recovery':
          score += option.value * 2;
          break;
        case 'reflect_damage':
          score += option.value * 3;
          break;
        default:
          score += option.value;
      }
    }
  }

  // Rarity bonus
  const rarityBonus = { common: 0, uncommon: 5, rare: 15, epic: 30, legendary: 50 };
  score += rarityBonus[item.rarity as keyof typeof rarityBonus] || 0;

  return score;
}

function calculateAccessoryValue(item: Item): number {
  let value = 0;
  if (item.options && Array.isArray(item.options)) {
    for (const option of item.options) {
      switch (option.type) {
        case 'critical_rate': value += option.value * 5; break;
        case 'attack_speed': value += option.value * 2; break;
        case 'life_steal': value += option.value * 10; break;
        case 'extra_damage': value += option.value * 3; break;
        case 'extra_defense': value += option.value * 2; break;
        case 'exp_bonus': value += option.value * 2; break;
        case 'critical_damage': value += option.value * 2; break;
        case 'hp_recovery': value += option.value * 3; break;
        case 'max_hp': value += option.value * 3; break;
        default: value += option.value;
      }
    }
  }
  const rarityBonus = { common: 0, uncommon: 5, rare: 15, epic: 30, legendary: 50 };
  value += rarityBonus[item.rarity as keyof typeof rarityBonus] || 0;
  return value;
}

function compareToEquipped(item: Item, equipment: Equipment): { isBetter: boolean; isWorse: boolean } {
  const slotKey = getEquipmentSlotForCategory(item.category);
  if (!slotKey) return { isBetter: false, isWorse: false };

  const equippedItem = equipment[slotKey];
  if (!equippedItem) return { isBetter: true, isWorse: false };

  const isAccessory = item.category === 12 || item.category === 13;
  if (isAccessory) {
    const diff = calculateAccessoryValue(item) - calculateAccessoryValue(equippedItem);
    return { isBetter: diff > 0, isWorse: diff < 0 };
  }

  // Use unified score for all equipment
  const itemScore = calculateItemScore(item);
  const equippedScore = calculateItemScore(equippedItem);
  const diff = itemScore - equippedScore;

  return { isBetter: diff > 0, isWorse: diff < 0 };
}

export default function InventorySlot({
  item,
  slotIndex,
  equipment,
  onEquip,
  onDestroy,
  onCraft,
}: InventorySlotProps) {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (item) {
      setShowModal(true);
    }
  };

  const handleEquip = () => {
    if (item && onEquip) {
      onEquip(item, slotIndex);
    }
    setShowModal(false);
  };

  const handleDestroy = () => {
    if (onDestroy) {
      onDestroy(slotIndex);
    }
    setShowModal(false);
  };

  const handleCraft = () => {
    if (item && onCraft) {
      onCraft(item, slotIndex);
    }
    setShowModal(false);
  };

  const borderClass = item ? RARITY_BORDERS[item.rarity || 'common'] : 'border-gray-700';
  const comparison = item && equipment ? compareToEquipped(item, equipment) : null;

  return (
    <>
      <div
        className={`relative w-12 h-12 bg-gray-800 border-2 ${borderClass} rounded cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center`}
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

        {/* Comparison indicator */}
        {comparison && (comparison.isBetter || comparison.isWorse) && (
          <span
            className={`absolute -bottom-1 -left-1 text-xs font-bold px-1 rounded ${
              comparison.isBetter ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {comparison.isBetter ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* Item Modal */}
      {showModal && item && (
        <ItemModal
          item={item}
          slotIndex={slotIndex}
          equipment={equipment}
          onEquip={handleEquip}
          onCraft={onCraft ? handleCraft : undefined}
          onDestroy={handleDestroy}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
