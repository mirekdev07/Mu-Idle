'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getItemImagePath } from '@/lib/game/itemImages';

interface Materials {
  chaos: number;
  archangel: number;
  bloodbone: number;
  devilskey: number;
  devilseye: number;
  feather: number;
}

interface Tickets {
  bloodCastle: number;
  devilSquare: number;
}

interface CharacterData {
  id: number;
  name: string;
}

interface InventoryItem {
  slotIndex: number;
  name: string;
  emoji: string;
  rarity: string;
  level: number;
  enhancementLevel: number;
  options: Array<{ type: string; value: number; display: string }> | null;
  damage_min: number;
  damage_max: number;
  defense: number;
  category: number;
}

type TabType = 'tickets' | 'chaos_items' | 'wings' | 'wings2';

export default function ChaosMachinePage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [materials, setMaterials] = useState<Materials>({
    chaos: 0,
    archangel: 0,
    bloodbone: 0,
    devilskey: 0,
    devilseye: 0,
    feather: 0,
  });
  const [tickets, setTickets] = useState<Tickets>({
    bloodCastle: 0,
    devilSquare: 0,
  });
  const [zen, setZen] = useState<bigint>(0n);
  const [mixing, setMixing] = useState(false);
  const [mixResult, setMixResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('tickets');

  // Chaos Item Crafting state
  const [chaosEligibleItems, setChaosEligibleItems] = useState<InventoryItem[]>([]);
  const [selectedChaosItems, setSelectedChaosItems] = useState<number[]>([]);
  const [chaosSuccessRate, setChaosSuccessRate] = useState(0);

  // Wings Crafting state
  const [chaosWeapons, setChaosWeapons] = useState<InventoryItem[]>([]);
  const [wingsEligibleItems, setWingsEligibleItems] = useState<InventoryItem[]>([]);
  const [selectedChaosWeapon, setSelectedChaosWeapon] = useState<number | null>(null);
  const [selectedWingsItems, setSelectedWingsItems] = useState<number[]>([]);
  const [wingsSuccessRate, setWingsSuccessRate] = useState(0);

  // Wings Level 2 Crafting state
  const [wingsLvl1Items, setWingsLvl1Items] = useState<InventoryItem[]>([]);
  const [wings2EligibleItems, setWings2EligibleItems] = useState<InventoryItem[]>([]);
  const [selectedWingsLvl1, setSelectedWingsLvl1] = useState<number | null>(null);
  const [selectedWings2Items, setSelectedWings2Items] = useState<number[]>([]);
  const [wings2SuccessRate, setWings2SuccessRate] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const getLifeBonus = (item: InventoryItem): number => {
    if (!item.options) return 0;
    const craftOption = item.options.find(o => o.type === 'craft_damage' || o.type === 'craft_defense');
    return craftOption?.value || 0;
  };

  const hasExcellentOption = (item: InventoryItem): boolean => {
    if (!item.options) return false;
    // Check for any option that's not craft_damage or craft_defense
    return item.options.some(o => o.type !== 'craft_damage' && o.type !== 'craft_defense');
  };

  // Calculate Chaos Item success rate
  useEffect(() => {
    if (selectedChaosItems.length === 0) {
      setChaosSuccessRate(0);
      return;
    }

    const selectedInventory = chaosEligibleItems.filter(item => selectedChaosItems.includes(item.slotIndex));
    let rate = 0;

    for (const item of selectedInventory) {
      const itemLevel = item.level || 1;
      const enhancementLevel = item.enhancementLevel || 0;
      const lifeBonus = getLifeBonus(item);

      const levelContribution = Math.min(10, itemLevel / 10);
      const enhancementContribution = enhancementLevel >= 4 ? (enhancementLevel - 3) * 2.5 + 2.5 : 0;
      const lifeContribution = Math.floor(lifeBonus / 4) * 3.75;

      rate += levelContribution + enhancementContribution + lifeContribution;
    }

    setChaosSuccessRate(Math.min(90, Math.floor(rate)));
  }, [selectedChaosItems, chaosEligibleItems]);

  // Calculate Wings success rate
  useEffect(() => {
    if (selectedChaosWeapon === null) {
      setWingsSuccessRate(0);
      return;
    }

    const chaosItem = chaosWeapons.find(item => item.slotIndex === selectedChaosWeapon);
    if (!chaosItem) {
      setWingsSuccessRate(0);
      return;
    }

    // Base rate from Chaos Item
    const chaosEnhancement = chaosItem.enhancementLevel || 0;
    const chaosLifeBonus = getLifeBonus(chaosItem);

    let rate = 20 + (chaosEnhancement - 4) * 5;
    rate += Math.floor(chaosLifeBonus / 4) * 5;

    // Additional items contribution
    const additionalItems = wingsEligibleItems.filter(item => selectedWingsItems.includes(item.slotIndex));
    for (const item of additionalItems) {
      const itemLevel = item.level || 1;
      const enhancementLevel = item.enhancementLevel || 0;
      const lifeBonus = getLifeBonus(item);

      const levelContribution = Math.min(10, itemLevel / 10);
      const enhancementContribution = enhancementLevel >= 4 ? (enhancementLevel - 3) * 2.5 + 2.5 : 0;
      const lifeContribution = Math.floor(lifeBonus / 4) * 3.75;

      rate += levelContribution + enhancementContribution + lifeContribution;
    }

    setWingsSuccessRate(Math.min(90, Math.floor(rate)));
  }, [selectedChaosWeapon, selectedWingsItems, chaosWeapons, wingsEligibleItems]);

  // Calculate Wings Level 2 success rate
  useEffect(() => {
    if (selectedWingsLvl1 === null) {
      setWings2SuccessRate(0);
      return;
    }

    const wingsItem = wingsLvl1Items.find(item => item.slotIndex === selectedWingsLvl1);
    if (!wingsItem) {
      setWings2SuccessRate(0);
      return;
    }

    // Base rate from Wings Level 1
    const wingsEnhancement = wingsItem.enhancementLevel || 0;
    const wingsLifeBonus = getLifeBonus(wingsItem);

    let rate = 15 + (wingsEnhancement - 7) * 3;
    rate += Math.floor(wingsLifeBonus / 4) * 3;

    // Additional items contribution (must have excellent option)
    const additionalItems = wings2EligibleItems.filter(item => selectedWings2Items.includes(item.slotIndex));
    for (const item of additionalItems) {
      const itemLevel = item.level || 1;
      const enhancementLevel = item.enhancementLevel || 0;
      const lifeBonus = getLifeBonus(item);

      const levelContribution = Math.min(8, itemLevel / 12);
      const enhancementContribution = enhancementLevel >= 4 ? (enhancementLevel - 3) * 2 + 1 : 0;
      const lifeContribution = Math.floor(lifeBonus / 4) * 2;

      rate += levelContribution + enhancementContribution + lifeContribution;
    }

    setWings2SuccessRate(Math.min(80, Math.floor(rate)));
  }, [selectedWingsLvl1, selectedWings2Items, wingsLvl1Items, wings2EligibleItems]);

  const loadData = async () => {
    try {
      const response = await fetch('/api/game/data');
      const data = await response.json();

      if (data.success) {
        setCharacter({ id: data.character.id, name: data.character.name });
        setMaterials({
          chaos: data.character.jewelOfChaos || 0,
          archangel: data.character.scrollOfArchangel || 0,
          bloodbone: data.character.bloodBone || 0,
          devilskey: data.character.devilsKey || 0,
          devilseye: data.character.devilsEye || 0,
          feather: data.character.feather || 0,
        });
        setTickets({
          bloodCastle: data.character.bloodCastleTicket || 0,
          devilSquare: data.character.devilSquareTicket || 0,
        });
        setZen(BigInt(data.character.zen || 0));

        if (data.inventory) {
          // Filter for Chaos Item crafting (weapons/armor with +4 enhancement and +4 life)
          const chaosEligible = data.inventory.filter((item: InventoryItem | null) => {
            if (!item) return false;
            if (item.category > 11) return false;
            if ((item.enhancementLevel || 0) < 4) return false;
            const lifeBonus = item.options?.find(
              (o: { type: string }) => o.type === 'craft_damage' || o.type === 'craft_defense'
            )?.value || 0;
            if (lifeBonus < 4) return false;
            return true;
          });
          setChaosEligibleItems(chaosEligible);

          // Filter Chaos Weapons (category 14) with +4 enhancement and +4 life for Wings crafting
          const chaosWeaponsEligible = data.inventory.filter((item: InventoryItem | null) => {
            if (!item) return false;
            if (item.category !== 14) return false;
            if ((item.enhancementLevel || 0) < 4) return false;
            const lifeBonus = item.options?.find(
              (o: { type: string }) => o.type === 'craft_damage' || o.type === 'craft_defense'
            )?.value || 0;
            if (lifeBonus < 4) return false;
            return true;
          });
          setChaosWeapons(chaosWeaponsEligible);

          // Filter for Wings additional items (same as Chaos Item requirements but exclude Chaos Weapons)
          const wingsEligible = data.inventory.filter((item: InventoryItem | null) => {
            if (!item) return false;
            if (item.category >= 14) return false; // Exclude Chaos weapons and wings
            if ((item.enhancementLevel || 0) < 4) return false;
            const lifeBonus = item.options?.find(
              (o: { type: string }) => o.type === 'craft_damage' || o.type === 'craft_defense'
            )?.value || 0;
            if (lifeBonus < 4) return false;
            return true;
          });
          setWingsEligibleItems(wingsEligible);

          // Filter Wings Level 1 (category 15) with +7 enhancement and +4 life for Wings Level 2 crafting
          const wingsLvl1Eligible = data.inventory.filter((item: InventoryItem | null) => {
            if (!item) return false;
            if (item.category !== 15) return false;
            if ((item.enhancementLevel || 0) < 7) return false;
            const lifeBonus = item.options?.find(
              (o: { type: string }) => o.type === 'craft_damage' || o.type === 'craft_defense'
            )?.value || 0;
            if (lifeBonus < 4) return false;
            return true;
          });
          setWingsLvl1Items(wingsLvl1Eligible);

          // Filter for Wings Level 2 additional items (must have +4, +4 life AND at least 1 excellent option)
          const wings2Eligible = data.inventory.filter((item: InventoryItem | null) => {
            if (!item) return false;
            if (item.category >= 14) return false; // Exclude Chaos, Wings
            if ((item.enhancementLevel || 0) < 4) return false;
            const lifeBonus = item.options?.find(
              (o: { type: string }) => o.type === 'craft_damage' || o.type === 'craft_defense'
            )?.value || 0;
            if (lifeBonus < 4) return false;
            // Must have at least 1 excellent option
            const hasExcellent = item.options?.some(
              (o: { type: string }) => o.type !== 'craft_damage' && o.type !== 'craft_defense'
            );
            if (!hasExcellent) return false;
            return true;
          });
          setWings2EligibleItems(wings2Eligible);
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMix = async (mixType: 'blood_castle_ticket' | 'devil_square_ticket') => {
    if (!character || mixing) return;

    setMixing(true);
    setMixResult(null);

    try {
      const response = await fetch('/api/chaos-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: character.id,
          mix_type: mixType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(data.materials);
        setTickets(data.tickets);
        if (data.zen !== undefined) {
          setZen(BigInt(data.zen));
        } else {
          setZen(prev => prev - 300000n);
        }
        setMixResult({
          success: data.mixSuccess,
          message: data.mixSuccess
            ? `Success! You created ${data.resultName}!`
            : `Mix failed! Materials were consumed.`,
        });
      } else {
        setMixResult({
          success: false,
          message: data.message || 'Mix failed',
        });
      }
    } catch (err) {
      console.error('Mix failed:', err);
      setMixResult({
        success: false,
        message: 'Server error',
      });
    } finally {
      setMixing(false);
    }
  };

  const handleChaosItemCraft = async () => {
    if (!character || mixing || selectedChaosItems.length === 0) return;

    setMixing(true);
    setMixResult(null);

    try {
      const response = await fetch('/api/chaos-machine/chaos-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: character.id,
          item_slots: selectedChaosItems,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(prev => ({ ...prev, chaos: data.jewelOfChaos }));
        setZen(BigInt(data.zen));
        setMixResult({
          success: data.mixSuccess,
          message: data.message,
        });
        setSelectedChaosItems([]);
        loadData();
      } else {
        setMixResult({
          success: false,
          message: data.message || 'Crafting failed',
        });
      }
    } catch (err) {
      console.error('Chaos item craft failed:', err);
      setMixResult({
        success: false,
        message: 'Server error',
      });
    } finally {
      setMixing(false);
    }
  };

  const handleWingsCraft = async () => {
    if (!character || mixing || selectedChaosWeapon === null) return;

    setMixing(true);
    setMixResult(null);

    try {
      const response = await fetch('/api/chaos-machine/wings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: character.id,
          chaos_item_slot: selectedChaosWeapon,
          additional_item_slots: selectedWingsItems,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(prev => ({ ...prev, chaos: data.jewelOfChaos }));
        setZen(BigInt(data.zen));
        setMixResult({
          success: data.mixSuccess,
          message: data.message,
        });
        setSelectedChaosWeapon(null);
        setSelectedWingsItems([]);
        loadData();
      } else {
        setMixResult({
          success: false,
          message: data.message || 'Crafting failed',
        });
      }
    } catch (err) {
      console.error('Wings craft failed:', err);
      setMixResult({
        success: false,
        message: 'Server error',
      });
    } finally {
      setMixing(false);
    }
  };

  const toggleChaosItemSelection = (slotIndex: number) => {
    setSelectedChaosItems(prev =>
      prev.includes(slotIndex) ? prev.filter(s => s !== slotIndex) : [...prev, slotIndex]
    );
  };

  const toggleWingsItemSelection = (slotIndex: number) => {
    setSelectedWingsItems(prev =>
      prev.includes(slotIndex) ? prev.filter(s => s !== slotIndex) : [...prev, slotIndex]
    );
  };

  const toggleWings2ItemSelection = (slotIndex: number) => {
    setSelectedWings2Items(prev =>
      prev.includes(slotIndex) ? prev.filter(s => s !== slotIndex) : [...prev, slotIndex]
    );
  };

  const handleWings2Craft = async () => {
    if (!character || mixing || selectedWingsLvl1 === null) return;

    setMixing(true);
    setMixResult(null);

    try {
      const response = await fetch('/api/chaos-machine/wings2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: character.id,
          wings_slot: selectedWingsLvl1,
          additional_item_slots: selectedWings2Items,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(prev => ({ ...prev, chaos: data.jewelOfChaos, feather: data.feather }));
        setZen(BigInt(data.zen));
        setMixResult({
          success: data.mixSuccess,
          message: data.message,
        });
        setSelectedWingsLvl1(null);
        setSelectedWings2Items([]);
        loadData();
      } else {
        setMixResult({
          success: false,
          message: data.message || 'Crafting failed',
        });
      }
    } catch (err) {
      console.error('Wings Level 2 craft failed:', err);
      setMixResult({
        success: false,
        message: 'Server error',
      });
    } finally {
      setMixing(false);
    }
  };

  const ZEN_REQUIRED = 300000n;
  const canMixBloodCastle = materials.archangel >= 1 && materials.bloodbone >= 1 && materials.chaos >= 1 && zen >= ZEN_REQUIRED;
  const canMixDevilSquare = materials.devilskey >= 1 && materials.devilseye >= 1 && materials.chaos >= 1 && zen >= ZEN_REQUIRED;

  const chaosItemZenCost = BigInt(chaosSuccessRate * 10000);
  const canCraftChaosItem = selectedChaosItems.length > 0 && materials.chaos >= 1 && zen >= chaosItemZenCost;

  const wingsZenCost = BigInt(wingsSuccessRate * 10000);
  const canCraftWings = selectedChaosWeapon !== null && materials.chaos >= 1 && zen >= wingsZenCost;

  const wings2ZenCost = BigInt(wings2SuccessRate * 10000);
  const canCraftWings2 = selectedWingsLvl1 !== null && materials.chaos >= 1 && materials.feather >= 1 && zen >= wings2ZenCost;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-orange-500 bg-orange-900/30';
      case 'epic': return 'border-purple-500 bg-purple-900/30';
      case 'rare': return 'border-yellow-500 bg-yellow-900/30';
      case 'uncommon': return 'border-green-500 bg-green-900/30';
      default: return 'border-gray-600 bg-gray-800/50';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Mobile Header - hidden on desktop (has global menu) */}
      <header className="lg:hidden sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-yellow-400 hover:text-yellow-300">
              MU Idle
            </Link>
            <span className="hidden sm:inline text-gray-500">|</span>
            <h1 className="hidden sm:block text-xl font-semibold text-purple-400">Chaos Machine</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/" className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
              Game
            </Link>
            <Link href="/events" className="px-3 py-1 bg-orange-700 rounded hover:bg-orange-600 text-sm">
              Events
            </Link>
            <Link href="/ranking" className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
              Ranking
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {mobileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-56 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
                  <div className="py-2">
                    <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50">
                      <span className="text-xl">🎮</span>
                      <div>
                        <div className="font-medium text-yellow-400">Game</div>
                        <div className="text-xs text-gray-400">Back to hunting</div>
                      </div>
                    </Link>
                    <Link href="/events" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-700/30">
                      <span className="text-xl">🏰</span>
                      <div>
                        <div className="font-medium text-orange-400">Events</div>
                        <div className="text-xs text-gray-400">Blood Castle & Devil Square</div>
                      </div>
                    </Link>
                    <Link href="/ranking" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50">
                      <span className="text-xl">🏆</span>
                      <div>
                        <div className="font-medium">Ranking</div>
                        <div className="text-xs text-gray-400">Top players</div>
                      </div>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {/* Chaos Machine Title */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔮</div>
          <h2 className="text-3xl font-bold text-purple-400 mb-2">Chaos Machine</h2>
          <p className="text-gray-400">Combine materials to create powerful items</p>
        </div>

        {/* Zen & Jewel Display */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-4 text-center">
          <span className="text-gray-400">Zen: </span>
          <span className="text-xl text-green-400 font-bold">{zen.toLocaleString()}</span>
          <span className="text-gray-400 ml-4">Jewel of Chaos: </span>
          <span className="text-xl text-yellow-400 font-bold">{materials.chaos}</span>
          <span className="text-gray-400 ml-4">Feather: </span>
          <span className="text-xl text-emerald-400 font-bold">{materials.feather}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('tickets'); setMixResult(null); }}
            className={`flex-1 py-3 px-2 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'tickets'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🎫 Tickets
          </button>
          <button
            onClick={() => { setActiveTab('chaos_items'); setMixResult(null); }}
            className={`flex-1 py-3 px-2 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'chaos_items'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ⚔️ Chaos Items
          </button>
          <button
            onClick={() => { setActiveTab('wings'); setMixResult(null); }}
            className={`flex-1 py-3 px-2 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'wings'
                ? 'bg-sky-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🪽 Wings
          </button>
          <button
            onClick={() => { setActiveTab('wings2'); setMixResult(null); }}
            className={`flex-1 py-3 px-2 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'wings2'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🪽 Wings 2
          </button>
        </div>

        {/* Mix Result */}
        {mixResult && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              mixResult.success
                ? 'bg-green-900/30 border-green-500 text-green-400'
                : 'bg-red-900/30 border-red-500 text-red-400'
            }`}
          >
            <div className="text-center font-bold">{mixResult.message}</div>
          </div>
        )}

        {/* ============ TICKETS TAB ============ */}
        {activeTab === 'tickets' && (
          <>
            {/* Materials */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4">Materials</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">💎</div>
                  <div className="text-yellow-400 font-bold">{materials.chaos}</div>
                  <div className="text-xs text-gray-500">J. of Chaos</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📜</div>
                  <div className="text-blue-400 font-bold">{materials.archangel}</div>
                  <div className="text-xs text-gray-500">Scroll</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🦴</div>
                  <div className="text-red-400 font-bold">{materials.bloodbone}</div>
                  <div className="text-xs text-gray-500">Blood Bone</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🗝️</div>
                  <div className="text-orange-400 font-bold">{materials.devilskey}</div>
                  <div className="text-xs text-gray-500">Devil&apos;s Key</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">👁️</div>
                  <div className="text-purple-400 font-bold">{materials.devilseye}</div>
                  <div className="text-xs text-gray-500">Devil&apos;s Eye</div>
                </div>
              </div>
            </div>

            {/* Tickets */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4">Your Tickets</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-red-900/50">
                  <div className="text-3xl mb-2">🎫</div>
                  <div className="text-2xl text-red-400 font-bold">{tickets.bloodCastle}</div>
                  <div className="text-sm text-gray-400">Blood Castle</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-purple-900/50">
                  <div className="text-3xl mb-2">🎟️</div>
                  <div className="text-2xl text-purple-400 font-bold">{tickets.devilSquare}</div>
                  <div className="text-sm text-gray-400">Devil Square</div>
                </div>
              </div>
            </div>

            {/* Mix Recipes */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-6 border border-red-900/50">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🎫</div>
                  <h3 className="text-xl font-bold text-red-400">Blood Castle Ticket</h3>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span>📜 Scroll of Archangel</span>
                    <span className={materials.archangel >= 1 ? 'text-green-400' : 'text-red-400'}>{materials.archangel}/1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🦴 Blood Bone</span>
                    <span className={materials.bloodbone >= 1 ? 'text-green-400' : 'text-red-400'}>{materials.bloodbone}/1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💎 Jewel of Chaos</span>
                    <span className={materials.chaos >= 1 ? 'text-green-400' : 'text-red-400'}>{materials.chaos}/1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💰 300,000 Zen</span>
                    <span className={zen >= ZEN_REQUIRED ? 'text-green-400' : 'text-red-400'}>{zen >= ZEN_REQUIRED ? '✓' : '✗'}</span>
                  </div>
                </div>
                <div className="text-center text-sm text-green-400 mb-4">100% Success</div>
                <button
                  onClick={() => handleMix('blood_castle_ticket')}
                  disabled={!canMixBloodCastle || mixing}
                  className={`w-full py-3 rounded-lg font-bold ${canMixBloodCastle && !mixing ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 cursor-not-allowed'}`}
                >
                  {mixing ? 'Mixing...' : 'Mix'}
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-6 border border-purple-900/50">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🎟️</div>
                  <h3 className="text-xl font-bold text-purple-400">Devil Square Ticket</h3>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span>🗝️ Devil&apos;s Key</span>
                    <span className={materials.devilskey >= 1 ? 'text-green-400' : 'text-red-400'}>{materials.devilskey}/1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>👁️ Devil&apos;s Eye</span>
                    <span className={materials.devilseye >= 1 ? 'text-green-400' : 'text-red-400'}>{materials.devilseye}/1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💎 Jewel of Chaos</span>
                    <span className={materials.chaos >= 1 ? 'text-green-400' : 'text-red-400'}>{materials.chaos}/1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💰 300,000 Zen</span>
                    <span className={zen >= ZEN_REQUIRED ? 'text-green-400' : 'text-red-400'}>{zen >= ZEN_REQUIRED ? '✓' : '✗'}</span>
                  </div>
                </div>
                <div className="text-center text-sm text-green-400 mb-4">100% Success</div>
                <button
                  onClick={() => handleMix('devil_square_ticket')}
                  disabled={!canMixDevilSquare || mixing}
                  className={`w-full py-3 rounded-lg font-bold ${canMixDevilSquare && !mixing ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-700 cursor-not-allowed'}`}
                >
                  {mixing ? 'Mixing...' : 'Mix'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============ CHAOS ITEMS TAB ============ */}
        {activeTab === 'chaos_items' && (
          <>
            <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-orange-400 mb-2">Chaos Item Crafting</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Create Chaos Items for Wings crafting!</p>
                <ul className="list-disc list-inside ml-2 text-gray-400">
                  <li>1x Jewel of Chaos</li>
                  <li>Items enhanced to <span className="text-yellow-400">+4</span> or higher</li>
                  <li>Items with Life bonus <span className="text-orange-400">+4</span> or higher</li>
                </ul>
                <p className="mt-2 text-gray-400">Results: Chaos Axe, Chaos Bow, Chaos Staff</p>
                <p className="text-xs text-red-400">Note: Chaos Items cannot be equipped - they are used for Wings crafting!</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">Select Items</h3>
              <p className="text-xs text-gray-500 mb-4">Only items with +4 enhancement and +4 Life bonus shown.</p>

              {chaosEligibleItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No eligible items found.</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {chaosEligibleItems.map(item => {
                    const isSelected = selectedChaosItems.includes(item.slotIndex);
                    const imagePath = getItemImagePath(item.name);

                    return (
                      <button
                        key={item.slotIndex}
                        onClick={() => toggleChaosItemSelection(item.slotIndex)}
                        className={`relative aspect-square rounded-lg border-2 transition-all ${
                          isSelected ? 'border-orange-500 bg-orange-900/50 ring-2 ring-orange-400' : getRarityColor(item.rarity)
                        } hover:scale-105`}
                        title={`${item.name} +${item.enhancementLevel}`}
                      >
                        {imagePath ? (
                          <Image src={imagePath} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                        ) : (
                          <span className="text-2xl">{item.emoji}</span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-center">+{item.enhancementLevel}</div>
                        {isSelected && <div className="absolute top-0 right-0 bg-orange-500 rounded-bl px-1 text-xs">✓</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-orange-700">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-400">Selected: {selectedChaosItems.length} | Success Rate:</div>
                <div className="text-3xl font-bold">
                  <span className={chaosSuccessRate >= 50 ? 'text-green-400' : chaosSuccessRate >= 25 ? 'text-yellow-400' : 'text-red-400'}>
                    {chaosSuccessRate}%
                  </span>
                </div>
                {chaosSuccessRate > 0 && <div className="text-sm text-gray-400">Zen Cost: {chaosItemZenCost.toLocaleString()}</div>}
              </div>
              <button
                onClick={handleChaosItemCraft}
                disabled={!canCraftChaosItem || mixing}
                className={`w-full py-4 rounded-lg font-bold text-lg ${
                  canCraftChaosItem && !mixing
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'
                    : 'bg-gray-700 cursor-not-allowed'
                }`}
              >
                {mixing ? 'Crafting...' : '🔮 Combine'}
              </button>
            </div>
          </>
        )}

        {/* ============ WINGS TAB ============ */}
        {activeTab === 'wings' && (
          <>
            <div className="bg-sky-900/20 border border-sky-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-sky-400 mb-2">Wings Level 1 Crafting</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Create powerful Wings!</p>
                <ul className="list-disc list-inside ml-2 text-gray-400">
                  <li>1x Jewel of Chaos</li>
                  <li>1x Chaos Item (category 14) enhanced to <span className="text-yellow-400">+4</span> with Life <span className="text-orange-400">+4</span></li>
                  <li>Optional: Additional items to increase success rate</li>
                </ul>
                <p className="mt-2 text-gray-400">Results: Wings of Elf, Wings of Heaven, Wings of Satan</p>
                <p className="text-sky-300">All Wings have +5% Damage and +5% Defense built-in!</p>
              </div>
            </div>

            {/* Chaos Weapon Selection */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-700 mb-4">
              <h3 className="text-lg font-semibold text-purple-400 mb-2">1. Select Chaos Item (Required)</h3>
              <p className="text-xs text-gray-500 mb-4">Chaos Items with +4 enhancement and +4 Life bonus.</p>

              {chaosWeapons.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  <p>No eligible Chaos Items found.</p>
                  <p className="text-sm mt-1">Craft a Chaos Item and enhance it to +4 with +4 Life bonus first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {chaosWeapons.map(item => {
                    const isSelected = selectedChaosWeapon === item.slotIndex;
                    const imagePath = getItemImagePath(item.name);

                    return (
                      <button
                        key={item.slotIndex}
                        onClick={() => setSelectedChaosWeapon(isSelected ? null : item.slotIndex)}
                        className={`relative aspect-square rounded-lg border-2 transition-all ${
                          isSelected ? 'border-purple-500 bg-purple-900/50 ring-2 ring-purple-400' : getRarityColor(item.rarity)
                        } hover:scale-105`}
                        title={`${item.name} +${item.enhancementLevel}`}
                      >
                        {imagePath ? (
                          <Image src={imagePath} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                        ) : (
                          <span className="text-2xl">{item.emoji}</span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-center">+{item.enhancementLevel}</div>
                        {isSelected && <div className="absolute top-0 right-0 bg-purple-500 rounded-bl px-1 text-xs">✓</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Additional Items Selection */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">2. Additional Items (Optional)</h3>
              <p className="text-xs text-gray-500 mb-4">Add more items to increase success rate.</p>

              {wingsEligibleItems.length === 0 ? (
                <div className="text-center text-gray-500 py-6">No additional eligible items.</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {wingsEligibleItems.map(item => {
                    const isSelected = selectedWingsItems.includes(item.slotIndex);
                    const imagePath = getItemImagePath(item.name);

                    return (
                      <button
                        key={item.slotIndex}
                        onClick={() => toggleWingsItemSelection(item.slotIndex)}
                        className={`relative aspect-square rounded-lg border-2 transition-all ${
                          isSelected ? 'border-sky-500 bg-sky-900/50 ring-2 ring-sky-400' : getRarityColor(item.rarity)
                        } hover:scale-105`}
                        title={`${item.name} +${item.enhancementLevel}`}
                      >
                        {imagePath ? (
                          <Image src={imagePath} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                        ) : (
                          <span className="text-2xl">{item.emoji}</span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-center">+{item.enhancementLevel}</div>
                        {isSelected && <div className="absolute top-0 right-0 bg-sky-500 rounded-bl px-1 text-xs">✓</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Success Rate & Craft Button */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-sky-700">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-400">
                  Chaos Item: {selectedChaosWeapon !== null ? '✓' : '✗'} | Additional: {selectedWingsItems.length}
                </div>
                <div className="text-3xl font-bold">
                  <span className={wingsSuccessRate >= 50 ? 'text-green-400' : wingsSuccessRate >= 25 ? 'text-yellow-400' : 'text-red-400'}>
                    {wingsSuccessRate}%
                  </span>
                  <span className="text-lg text-gray-500 ml-2">Success Rate</span>
                </div>
                {wingsSuccessRate > 0 && <div className="text-sm text-gray-400">Zen Cost: {wingsZenCost.toLocaleString()}</div>}
              </div>
              <button
                onClick={handleWingsCraft}
                disabled={!canCraftWings || mixing}
                className={`w-full py-4 rounded-lg font-bold text-lg ${
                  canCraftWings && !mixing
                    ? 'bg-gradient-to-r from-sky-600 to-purple-600 hover:from-sky-500 hover:to-purple-500'
                    : 'bg-gray-700 cursor-not-allowed'
                }`}
              >
                {mixing ? 'Crafting...' : '🪽 Create Wings'}
              </button>
            </div>
          </>
        )}

        {/* ============ WINGS LEVEL 2 TAB ============ */}
        {activeTab === 'wings2' && (
          <>
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-emerald-400 mb-2">Wings Level 2 Crafting</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Upgrade Wings Level 1 to powerful Wings Level 2!</p>
                <ul className="list-disc list-inside ml-2 text-gray-400">
                  <li>1x Jewel of Chaos</li>
                  <li>1x Feather <span className="text-emerald-400">(you have: {materials.feather})</span></li>
                  <li>1x Wings Level 1 enhanced to <span className="text-yellow-400">+7</span> with Life <span className="text-orange-400">+4</span></li>
                  <li>Optional: Items with <span className="text-purple-400">excellent options</span> (+4, Life+4)</li>
                </ul>
                <p className="mt-2 text-gray-400">Results: Wings of Spirits, Wings of Soul, Wings of Dragon, Wings of Darkness</p>
                <p className="text-emerald-300">All Wings Level 2 have +10% Damage and +10% Defense built-in!</p>
                <p className="text-xs text-yellow-400">Max success rate: 80%</p>
              </div>
            </div>

            {/* Wings Level 1 Selection */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-emerald-700 mb-4">
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">1. Select Wings Level 1 (Required)</h3>
              <p className="text-xs text-gray-500 mb-4">Wings Level 1 with +7 enhancement and +4 Life bonus.</p>

              {wingsLvl1Items.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  <p>No eligible Wings Level 1 found.</p>
                  <p className="text-sm mt-1">Craft Wings Level 1 and enhance it to +7 with +4 Life bonus first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {wingsLvl1Items.map(item => {
                    const isSelected = selectedWingsLvl1 === item.slotIndex;
                    const imagePath = getItemImagePath(item.name);

                    return (
                      <button
                        key={item.slotIndex}
                        onClick={() => setSelectedWingsLvl1(isSelected ? null : item.slotIndex)}
                        className={`relative aspect-square rounded-lg border-2 transition-all ${
                          isSelected ? 'border-emerald-500 bg-emerald-900/50 ring-2 ring-emerald-400' : getRarityColor(item.rarity)
                        } hover:scale-105`}
                        title={`${item.name} +${item.enhancementLevel}`}
                      >
                        {imagePath ? (
                          <Image src={imagePath} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                        ) : (
                          <span className="text-2xl">{item.emoji}</span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-center">+{item.enhancementLevel}</div>
                        {isSelected && <div className="absolute top-0 right-0 bg-emerald-500 rounded-bl px-1 text-xs">✓</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Additional Items Selection */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">2. Additional Items with Excellent Options (Optional)</h3>
              <p className="text-xs text-gray-500 mb-4">Items must have +4, Life+4, AND at least 1 excellent option to increase success rate.</p>

              {wings2EligibleItems.length === 0 ? (
                <div className="text-center text-gray-500 py-6">No items with excellent options found.</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {wings2EligibleItems.map(item => {
                    const isSelected = selectedWings2Items.includes(item.slotIndex);
                    const imagePath = getItemImagePath(item.name);

                    return (
                      <button
                        key={item.slotIndex}
                        onClick={() => toggleWings2ItemSelection(item.slotIndex)}
                        className={`relative aspect-square rounded-lg border-2 transition-all ${
                          isSelected ? 'border-emerald-500 bg-emerald-900/50 ring-2 ring-emerald-400' : getRarityColor(item.rarity)
                        } hover:scale-105`}
                        title={`${item.name} +${item.enhancementLevel}`}
                      >
                        {imagePath ? (
                          <Image src={imagePath} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                        ) : (
                          <span className="text-2xl">{item.emoji}</span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-center">+{item.enhancementLevel}</div>
                        {isSelected && <div className="absolute top-0 right-0 bg-emerald-500 rounded-bl px-1 text-xs">✓</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Success Rate & Craft Button */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-emerald-700">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-400">
                  Wings Lvl 1: {selectedWingsLvl1 !== null ? '✓' : '✗'} | Feather: {materials.feather >= 1 ? '✓' : '✗'} | Additional: {selectedWings2Items.length}
                </div>
                <div className="text-3xl font-bold">
                  <span className={wings2SuccessRate >= 50 ? 'text-green-400' : wings2SuccessRate >= 25 ? 'text-yellow-400' : 'text-red-400'}>
                    {wings2SuccessRate}%
                  </span>
                  <span className="text-lg text-gray-500 ml-2">Success Rate (max 80%)</span>
                </div>
                {wings2SuccessRate > 0 && <div className="text-sm text-gray-400">Zen Cost: {wings2ZenCost.toLocaleString()}</div>}
              </div>
              <button
                onClick={handleWings2Craft}
                disabled={!canCraftWings2 || mixing}
                className={`w-full py-4 rounded-lg font-bold text-lg ${
                  canCraftWings2 && !mixing
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                    : 'bg-gray-700 cursor-not-allowed'
                }`}
              >
                {mixing ? 'Crafting...' : '🪽 Create Wings Level 2'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
