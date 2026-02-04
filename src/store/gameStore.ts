'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  GameState,
  Item,
  Equipment,
  EquipmentBonuses,
  InventorySlot,
  DEFAULT_EQUIPMENT_BONUSES,
  CharacterStats,
  EquipmentSlotKey,
} from '@/types/game';

const EQUIPMENT_SLOT_MAP: { key: EquipmentSlotKey; categories: number[] }[] = [
  { key: 'weapon', categories: [0, 1, 2, 3, 4, 5] },
  { key: 'shield', categories: [6] },
  { key: 'helm', categories: [7] },
  { key: 'armor', categories: [8] },
  { key: 'pants', categories: [9] },
  { key: 'gloves', categories: [10] },
  { key: 'boots', categories: [11] },
  { key: 'ring', categories: [12] },
  { key: 'pendant', categories: [13] },
];

interface GameActions {
  // Inventory
  setInventory: (inventory: (Item | null)[]) => void;

  // Equipment
  setEquipment: (equipment: Equipment) => void;
  setEquipmentBonuses: (bonuses: EquipmentBonuses) => void;
  equipItem: (item: Item, fromSlot: number, characterId: number) => Promise<boolean>;
  unequipItem: (slot: EquipmentSlotKey, characterId: number) => Promise<boolean>;

  // Character stats
  setCharacterStats: (stats: CharacterStats) => void;

  // UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Tooltip
  showTooltip: (item: Item, position: { x: number; y: number }) => void;
  hideTooltip: () => void;

  // Data fetching
  loadAllData: (characterId?: number) => Promise<void>;

  // Utils
  getEquipmentSlotForCategory: (category: number) => EquipmentSlotKey | null;
  destroyItem: (slotIndex: number, characterId: number) => Promise<boolean>;
  clearInventory: (characterId: number) => Promise<boolean>;
}

export const useGameStore = create<GameState & GameActions>()(
  devtools(
    (set, get) => ({
      // Initial state
      inventory: Array(24)
        .fill(null)
        .map((_, i) => ({ item: null, slotIndex: i })),
      equipment: {},
      equipmentBonuses: { ...DEFAULT_EQUIPMENT_BONUSES },
      characterStats: {
        damage_min: 0,
        damage_max: 0,
        attack_speed: 0,
        defense: 0,
        vitality: 25,
        block: 25,
        level: 1,
      },
      isLoading: false,
      error: null,
      hoveredItem: null,
      tooltipPosition: null,

      // Inventory actions
      setInventory: (inventoryData) => {
        const inventory: InventorySlot[] = Array(24)
          .fill(null)
          .map((_, i) => ({
            item: inventoryData[i] || null,
            slotIndex: i,
          }));
        set({ inventory });
      },

      // Equipment actions
      setEquipment: (equipment) => set({ equipment }),
      setEquipmentBonuses: (bonuses) => set({ equipmentBonuses: bonuses }),

      equipItem: async (item, fromSlot, characterId) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(
            `/api/inventory/manage?character_id=${characterId}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'equip_item',
                slot_index: fromSlot,
              }),
            }
          );

          const data = await response.json();

          if (data.success) {
            get().setInventory(data.inventory);
            set({
              equipment: data.equipment,
              equipmentBonuses: data.bonuses,
            });
            return true;
          } else {
            set({ error: data.message || 'Failed to equip item' });
            return false;
          }
        } catch (error) {
          console.error('Equip error:', error);
          set({ error: 'Network error while equipping item' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      unequipItem: async (slot, characterId) => {
        set({ isLoading: true, error: null });

        const slotNumbers: Record<EquipmentSlotKey, number> = {
          weapon: 0,
          shield: 1,
          helm: 2,
          armor: 3,
          pants: 4,
          gloves: 5,
          boots: 6,
          ring: 7,
          pendant: 8,
          wings: 9,
        };

        try {
          const response = await fetch(
            `/api/inventory/manage?character_id=${characterId}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'unequip_item',
                equipment_slot: slotNumbers[slot],
              }),
            }
          );

          const data = await response.json();

          if (data.success) {
            get().setInventory(data.inventory);
            set({
              equipment: data.equipment,
              equipmentBonuses: data.bonuses,
            });
            return true;
          } else {
            set({ error: data.message || 'Failed to unequip item' });
            return false;
          }
        } catch (error) {
          console.error('Unequip error:', error);
          set({ error: 'Network error while unequipping item' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Character stats
      setCharacterStats: (stats) => set({ characterStats: stats }),

      // UI actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Tooltip actions
      showTooltip: (item, position) =>
        set({ hoveredItem: item, tooltipPosition: position }),
      hideTooltip: () => set({ hoveredItem: null, tooltipPosition: null }),

      // Data fetching
      loadAllData: async (characterId) => {
        set({ isLoading: true, error: null });

        try {
          const url = characterId
            ? `/api/inventory/manage?action=get_all&character_id=${characterId}`
            : '/api/inventory/manage?action=get_all';

          const response = await fetch(url);
          const data = await response.json();

          if (data.success) {
            get().setInventory(data.inventory);
            set({
              equipment: data.equipment,
              equipmentBonuses: data.bonuses,
            });
          } else {
            set({ error: data.message || 'Failed to load data' });
          }
        } catch (error) {
          console.error('Load data error:', error);
          set({ error: 'Network error while loading data' });
        } finally {
          set({ isLoading: false });
        }
      },

      // Utils
      getEquipmentSlotForCategory: (category) => {
        const slot = EQUIPMENT_SLOT_MAP.find((s) =>
          s.categories.includes(category)
        );
        return slot ? slot.key : null;
      },

      destroyItem: async (slotIndex, characterId) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(
            `/api/inventory/destroy?character_id=${characterId}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slot_index: slotIndex }),
            }
          );

          const data = await response.json();

          if (data.success) {
            get().setInventory(data.inventory);
            set({
              equipment: data.equipment,
              equipmentBonuses: data.bonuses,
            });
            return true;
          } else {
            set({ error: data.message || 'Failed to destroy item' });
            return false;
          }
        } catch (error) {
          console.error('Destroy error:', error);
          set({ error: 'Network error while destroying item' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      clearInventory: async (characterId) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/inventory/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id: characterId }),
          });

          const data = await response.json();

          if (data.success) {
            const emptyInventory: InventorySlot[] = Array(24)
              .fill(null)
              .map((_, i) => ({ item: null, slotIndex: i }));
            set({ inventory: emptyInventory });
            return true;
          } else {
            set({ error: data.message || 'Failed to clear inventory' });
            return false;
          }
        } catch (error) {
          console.error('Clear inventory error:', error);
          set({ error: 'Network error while clearing inventory' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    { name: 'game-store' }
  )
);
