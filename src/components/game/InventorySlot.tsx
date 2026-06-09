'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Item, Equipment, EQUIPMENT_SLOTS } from '@/types/game';
import ItemModal from './ItemModal';
import { getItemImagePath, getItemImageSize } from '@/lib/game/itemImages';

interface InventorySlotProps {
  item: Item | null;
  slotIndex: number;
  equipment?: Equipment;
  onEquip?: (item: Item, slotIndex: number) => void;
  onDestroy?: (slotIndex: number) => void;
  onCraft?: (item: Item, slotIndex: number) => void;
  onDeposit?: (slotIndex: number) => void;
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

// Calculate item's main stat (DMG or DEF) at +9 enhancement + max Jewel of Life bonus (+16)
// Current damage/defense already includes enhancement bonus, so we calculate the difference
function calculateStatAt9(item: Item): { value: number; type: 'dmg' | 'def' } {
  const isWeapon = item.category >= 0 && item.category <= 5;
  const currentEnhancement = item.enhancementLevel ?? 0;
  const levelsToAdd = 9 - currentEnhancement;

  // Check current Jewel of Life bonus from options
  let currentLifeBonus = 0;
  if (item.options && Array.isArray(item.options)) {
    const lifeOption = item.options.find(
      (o) => o.type === 'craft_damage' || o.type === 'craft_defense'
    );
    if (lifeOption) {
      currentLifeBonus = lifeOption.value || 0;
    }
  }
  // Calculate remaining potential from Jewel of Life (max is +16)
  const maxLifeBonus = 16;
  const remainingLifeBonus = maxLifeBonus - currentLifeBonus;

  if (isWeapon) {
    // Weapons: current avg damage + additional enhancement bonus (+3 per level) + remaining life bonus
    const currentAvgDmg = (item.damage_min + item.damage_max) / 2;
    const additionalBonus = levelsToAdd * 3;
    return { value: Math.floor(currentAvgDmg + additionalBonus + remainingLifeBonus), type: 'dmg' };
  } else {
    // Armor: current defense + additional enhancement bonus (+2 per level) + remaining life bonus
    const additionalBonus = levelsToAdd * 2;
    return { value: Math.floor(item.defense + additionalBonus + remainingLifeBonus), type: 'def' };
  }
}

interface ComparisonResult {
  isBetter: boolean;
  isWorse: boolean;
  itemValue: number;
  equippedValue: number;
  statType: 'dmg' | 'def' | 'acc';
  isAccessory: boolean;
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

function compareToEquipped(item: Item, equipment: Equipment): ComparisonResult | null {
  const slotKey = getEquipmentSlotForCategory(item.category);
  if (!slotKey) return null;

  const equippedItem = equipment[slotKey];

  const isAccessory = item.category === 12 || item.category === 13;

  if (isAccessory) {
    const itemValue = calculateAccessoryValue(item);
    const equippedValue = equippedItem ? calculateAccessoryValue(equippedItem) : 0;
    const diff = itemValue - equippedValue;
    return {
      isBetter: diff > 0,
      isWorse: diff < 0,
      itemValue,
      equippedValue,
      statType: 'acc',
      isAccessory: true
    };
  }

  // Calculate stats at +9 for both items (ONLY DMG or DEF, no options)
  const itemAt9 = calculateStatAt9(item);
  const equippedAt9 = equippedItem ? calculateStatAt9(equippedItem) : { value: 0, type: itemAt9.type };

  const diff = itemAt9.value - equippedAt9.value;

  return {
    isBetter: diff > 0,
    isWorse: diff < 0,
    itemValue: itemAt9.value,
    equippedValue: equippedAt9.value,
    statType: itemAt9.type,
    isAccessory: false
  };
}

export default function InventorySlot({
  item,
  slotIndex,
  equipment,
  onEquip,
  onDestroy,
  onCraft,
  onDeposit,
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

  const handleDeposit = () => {
    if (onDeposit) {
      onDeposit(slotIndex);
    }
    setShowModal(false);
  };

  const borderClass = item ? RARITY_BORDERS[item.rarity || 'common'] : 'border-gray-700';
  const comparison = item && equipment ? compareToEquipped(item, equipment) : null;

  return (
    <>
      <div
        className={`relative w-16 h-16 bg-gray-800 border-2 ${borderClass} rounded cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center`}
        onClick={handleClick}
      >
        {item ? (
          getItemImagePath(item.name) ? (
            <Image
              src={getItemImagePath(item.name)!}
              alt={item.name}
              width={getItemImageSize(item.name)}
              height={getItemImageSize(item.name)}
              className="object-contain"
            />
          ) : (
            <span className="text-2xl">{item.emoji}</span>
          )
        ) : (
          <span className="text-gray-600 text-xs">{slotIndex + 1}</span>
        )}

        {/* Enhancement indicator */}
        {item && (item.enhancementLevel ?? 0) > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold px-1 rounded">
            +{item.enhancementLevel}
          </span>
        )}

        {/* Comparison indicator - shows stat at +9 */}
        {comparison && (comparison.isBetter || comparison.isWorse) && (
          <div
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1 rounded whitespace-nowrap ${
              comparison.isBetter ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
            title={comparison.isAccessory
              ? `This: ${comparison.itemValue} vs Equipped: ${comparison.equippedValue}`
              : `+9: ${comparison.itemValue} ${comparison.statType.toUpperCase()} vs Equipped +9: ${comparison.equippedValue} ${comparison.statType.toUpperCase()}`
            }
          >
            {comparison.isBetter ? '▲' : '▼'}
            {!comparison.isAccessory && `+9`}
          </div>
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
          onDeposit={onDeposit ? handleDeposit : undefined}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
