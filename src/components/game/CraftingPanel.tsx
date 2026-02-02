'use client';

import { useState } from 'react';
import { Item } from '@/types/game';

interface CraftingPanelProps {
  item: Item | null;
  jewelOfBless: number;
  jewelOfSoul: number;
  jewelOfLife: number;
  onCraft: (action: 'bless' | 'soul' | 'life') => Promise<{ success: boolean; message: string; newItem?: Item }>;
  onClose: () => void;
}

export default function CraftingPanel({
  item,
  jewelOfBless,
  jewelOfSoul,
  jewelOfLife,
  onCraft,
  onClose,
}: CraftingPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Rings and Pendants cannot be crafted
  const isAccessory = item && (item.category === 12 || item.category === 13);

  if (!item) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <div className="text-center text-gray-400">
          Select an item from inventory to craft
        </div>
      </div>
    );
  }

  if (isAccessory) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-yellow-400">Crafting</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{item.emoji}</span>
            <div>
              <div className="font-bold text-gray-300">{item.name}</div>
              <div className="text-xs text-gray-400">Level {item.level}</div>
            </div>
          </div>
        </div>
        <div className="text-center text-yellow-400 p-4 bg-yellow-900/20 rounded-lg border border-yellow-700">
          Rings and Pendants cannot be enhanced with jewels.
        </div>
      </div>
    );
  }

  const currentLevel = item.enhancementLevel || 0;
  const canUseBless = currentLevel < 6 && jewelOfBless > 0;
  const canUseSoul = currentLevel >= 6 && currentLevel < 9 && jewelOfSoul > 0;

  // Check if item is a weapon (category 0-5)
  const isWeapon = item.category >= 0 && item.category <= 5;

  // Check if item already has life bonus (damage for weapons, defense for armor)
  const lifeOptionType = isWeapon ? 'craft_damage' : 'craft_defense';
  const existingLifeBonus = item.options?.find(o => o.type === lifeOptionType)?.value || 0;
  const canUseLife = existingLifeBonus < 16 && jewelOfLife > 0;

  const handleCraft = async (action: 'bless' | 'soul' | 'life') => {
    setIsProcessing(true);
    setResultMessage(null);

    try {
      const result = await onCraft(action);
      setResultMessage({ text: result.message, success: result.success });
    } catch {
      setResultMessage({ text: 'Crafting failed!', success: false });
    } finally {
      setIsProcessing(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'rare': return 'text-yellow-400';
      case 'uncommon': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-yellow-400">Crafting</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>

      {/* Selected Item Display */}
      <div className="bg-gray-900 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{item.emoji}</span>
          <div>
            <div className={`font-bold ${getRarityColor(item.rarity)}`}>
              {item.name} {currentLevel > 0 && `+${currentLevel}`}
            </div>
            <div className="text-xs text-gray-400">Level {item.level}</div>
            {item.damage_min > 0 && (
              <div className="text-xs text-red-400">DMG: {item.damage_min}-{item.damage_max}</div>
            )}
            {item.defense > 0 && (
              <div className="text-xs text-blue-400">DEF: {item.defense}</div>
            )}
            {existingLifeBonus > 0 && (
              <div className="text-xs text-orange-400">Craft Bonus: +{existingLifeBonus} {isWeapon ? 'DMG' : 'DEF'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Result Message */}
      {resultMessage && (
        <div className={`mb-4 p-2 rounded text-center text-sm ${
          resultMessage.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
        }`}>
          {resultMessage.text}
        </div>
      )}

      {/* Crafting Options */}
      <div className="space-y-3">
        {/* Jewel of Bless - Level up to +6 */}
        <div className={`p-3 rounded-lg border ${canUseBless ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-900/50 opacity-50'}`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-purple-300">💎</span>
              <span className="font-bold text-purple-300">Jewel of Bless</span>
            </div>
            <span className="text-sm text-gray-400">({jewelOfBless} owned)</span>
          </div>
          <div className="text-xs text-gray-400 mb-2">
            Upgrade item to +{Math.min(currentLevel + 1, 6)} (100% success)
            {currentLevel >= 6 && <span className="text-yellow-400 ml-2">Max level reached!</span>}
          </div>
          <button
            onClick={() => handleCraft('bless')}
            disabled={!canUseBless || isProcessing}
            className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-bold text-sm"
          >
            {isProcessing ? 'Processing...' : 'Use Jewel of Bless'}
          </button>
        </div>

        {/* Jewel of Soul - Level +7 to +9 */}
        <div className={`p-3 rounded-lg border ${canUseSoul ? 'border-pink-500 bg-pink-900/20' : 'border-gray-700 bg-gray-900/50 opacity-50'}`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-pink-400">💎</span>
              <span className="font-bold text-pink-400">Jewel of Soul</span>
            </div>
            <span className="text-sm text-gray-400">({jewelOfSoul} owned)</span>
          </div>
          <div className="text-xs text-gray-400 mb-2">
            Upgrade item to +{Math.min(currentLevel + 1, 9)} (70% success)
            {currentLevel < 6 && <span className="text-yellow-400 ml-2">Requires +6 first!</span>}
            {currentLevel >= 9 && <span className="text-yellow-400 ml-2">Max level reached!</span>}
          </div>
          <button
            onClick={() => handleCraft('soul')}
            disabled={!canUseSoul || isProcessing}
            className="w-full py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-bold text-sm"
          >
            {isProcessing ? 'Processing...' : 'Use Jewel of Soul'}
          </button>
        </div>

        {/* Jewel of Life - Add damage (weapons) or defense (armor) */}
        <div className={`p-3 rounded-lg border ${canUseLife ? 'border-orange-500 bg-orange-900/20' : 'border-gray-700 bg-gray-900/50 opacity-50'}`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-orange-400">💎</span>
              <span className="font-bold text-orange-400">Jewel of Life</span>
            </div>
            <span className="text-sm text-gray-400">({jewelOfLife} owned)</span>
          </div>
          <div className="text-xs text-gray-400 mb-2">
            Add +4 {isWeapon ? 'Damage' : 'Defense'} (current: +{existingLifeBonus}/16) (70% success)
            {existingLifeBonus >= 16 && <span className="text-yellow-400 ml-2">Max bonus reached!</span>}
          </div>
          <button
            onClick={() => handleCraft('life')}
            disabled={!canUseLife || isProcessing}
            className="w-full py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-bold text-sm"
          >
            {isProcessing ? 'Processing...' : 'Use Jewel of Life'}
          </button>
        </div>
      </div>
    </div>
  );
}
