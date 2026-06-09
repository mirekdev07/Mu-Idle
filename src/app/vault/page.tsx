'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getItemImagePath } from '@/lib/game/itemImages';

interface VaultItem {
  id: string;
  slotIndex: number;
  name: string;
  type: string;
  emoji: string;
  rarity: string;
  level: number;
  damage_min: number;
  damage_max: number;
  attack_speed: number;
  defense: number;
  category: number;
  enhancementLevel: number;
  options: Array<{ type: string; value: number; display: string }> | null;
}

interface InventoryItem {
  id: string;
  slotIndex: number;
  name: string;
  type: string;
  emoji: string;
  rarity: string;
  level: number;
  damage_min: number;
  damage_max: number;
  attack_speed: number;
  defense: number;
  category: number;
  enhancementLevel: number;
  options: Array<{ type: string; value: number; display: string }> | null;
}

const VAULT_SLOTS = 100;
const INVENTORY_SLOTS = 24;

export default function VaultPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vault, setVault] = useState<(VaultItem | null)[]>(new Array(VAULT_SLOTS).fill(null));
  const [inventory, setInventory] = useState<(InventoryItem | null)[]>(new Array(INVENTORY_SLOTS).fill(null));
  const [usedVaultSlots, setUsedVaultSlots] = useState(0);
  const [selectedVaultItem, setSelectedVaultItem] = useState<number | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<VaultItem | InventoryItem | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      const [vaultRes, gameRes] = await Promise.all([
        fetch('/api/vault'),
        fetch('/api/game/data'),
      ]);

      const vaultData = await vaultRes.json();
      const gameData = await gameRes.json();

      if (vaultData.success) {
        setVault(vaultData.vault);
        setUsedVaultSlots(vaultData.usedSlots);
      }

      if (gameData.success && gameData.inventory) {
        setInventory(gameData.inventory);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (inventorySlot: number) => {
    if (processing) return;
    setProcessing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/vault/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_slot: inventorySlot }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setSelectedInventoryItem(null);
        loadData();
      } else {
        setMessage({ text: data.message || 'Failed to deposit', type: 'error' });
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setMessage({ text: 'Server error', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async (vaultSlot: number) => {
    if (processing) return;
    setProcessing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/vault/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_slot: vaultSlot }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setSelectedVaultItem(null);
        loadData();
      } else {
        setMessage({ text: data.message || 'Failed to withdraw', type: 'error' });
      }
    } catch (err) {
      console.error('Withdraw error:', err);
      setMessage({ text: 'Server error', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-orange-500 bg-orange-900/30';
      case 'epic': return 'border-purple-500 bg-purple-900/30';
      case 'rare': return 'border-yellow-500 bg-yellow-900/30';
      case 'uncommon': return 'border-green-500 bg-green-900/30';
      default: return 'border-gray-600 bg-gray-800/50';
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-orange-400';
      case 'epic': return 'text-purple-400';
      case 'rare': return 'text-yellow-400';
      case 'uncommon': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  const handleMouseEnter = (item: VaultItem | InventoryItem, e: React.MouseEvent) => {
    setHoveredItem(item);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
    setTooltipPosition(null);
  };

  const renderItemSlot = (
    item: VaultItem | InventoryItem | null,
    slotIndex: number,
    isVault: boolean,
    isSelected: boolean,
    onClick: () => void
  ) => {
    const imagePath = item ? getItemImagePath(item.name) : null;

    return (
      <button
        key={`${isVault ? 'vault' : 'inv'}-${slotIndex}`}
        onClick={onClick}
        onMouseEnter={item ? (e) => handleMouseEnter(item, e) : undefined}
        onMouseLeave={handleMouseLeave}
        className={`relative aspect-square rounded border-2 transition-all ${
          item
            ? `${getRarityColor(item.rarity)} ${isSelected ? 'ring-2 ring-white scale-105' : 'hover:scale-105'}`
            : 'border-gray-700 bg-gray-800/30 hover:bg-gray-700/30'
        }`}
      >
        {item && (
          <>
            {imagePath ? (
              <Image src={imagePath} alt={item.name} fill className="object-contain p-0.5" sizes="48px" />
            ) : (
              <span className="text-lg">{item.emoji}</span>
            )}
            {item.enhancementLevel > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[10px] text-yellow-400 text-center">
                +{item.enhancementLevel}
              </div>
            )}
          </>
        )}
      </button>
    );
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
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-yellow-400 hover:text-yellow-300">
              MU Idle
            </Link>
            <span className="hidden sm:inline text-gray-500">|</span>
            <h1 className="hidden sm:block text-xl font-semibold text-amber-400">Vault</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/" className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
              Game
            </Link>
            <Link href="/chaos-machine" className="px-3 py-1 bg-purple-700 rounded hover:bg-purple-600 text-sm">
              Chaos Machine
            </Link>
            <Link href="/events" className="px-3 py-1 bg-orange-700 rounded hover:bg-orange-600 text-sm">
              Events
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
                    <Link href="/chaos-machine" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-purple-700/30">
                      <span className="text-xl">🔮</span>
                      <div>
                        <div className="font-medium text-purple-400">Chaos Machine</div>
                        <div className="text-xs text-gray-400">Craft items</div>
                      </div>
                    </Link>
                    <Link href="/events" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-700/30">
                      <span className="text-xl">🏰</span>
                      <div>
                        <div className="font-medium text-orange-400">Events</div>
                        <div className="text-xs text-gray-400">Blood Castle & Devil Square</div>
                      </div>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏦</div>
          <h2 className="text-2xl font-bold text-amber-400 mb-1">Vault</h2>
          <p className="text-gray-400 text-sm">Store your items safely ({usedVaultSlots}/{VAULT_SLOTS} slots used)</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg border text-center ${
              message.type === 'success'
                ? 'bg-green-900/30 border-green-500 text-green-400'
                : 'bg-red-900/30 border-red-500 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Vault (larger) */}
          <div className="lg:col-span-2 bg-gray-800/50 rounded-lg p-4 border border-amber-700/50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-amber-400">Vault Storage</h3>
              {selectedVaultItem !== null && vault[selectedVaultItem] && (
                <button
                  onClick={() => handleWithdraw(selectedVaultItem)}
                  disabled={processing}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium disabled:bg-gray-600"
                >
                  {processing ? '...' : '← To Inventory'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-10 gap-1">
              {vault.map((item, index) =>
                renderItemSlot(
                  item,
                  index,
                  true,
                  selectedVaultItem === index,
                  () => setSelectedVaultItem(item ? index : null)
                )
              )}
            </div>
          </div>

          {/* Inventory (smaller) */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-yellow-400">Inventory</h3>
              {selectedInventoryItem !== null && inventory[selectedInventoryItem] && (
                <button
                  onClick={() => handleDeposit(selectedInventoryItem)}
                  disabled={processing}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-sm font-medium disabled:bg-gray-600"
                >
                  {processing ? '...' : 'To Vault →'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {inventory.map((item, index) =>
                renderItemSlot(
                  item,
                  index,
                  false,
                  selectedInventoryItem === index,
                  () => setSelectedInventoryItem(item ? index : null)
                )
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Click item → &quot;To Vault&quot; to deposit
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 bg-gray-800/30 rounded-lg p-3 border border-gray-700 text-center text-sm text-gray-400">
          <p>Click on an item to select it, then use the button to transfer.</p>
          <p className="text-xs mt-1">You can also deposit items directly from the Game page inventory.</p>
        </div>
      </main>

      {/* Tooltip */}
      {hoveredItem && tooltipPosition && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-xl pointer-events-none max-w-xs"
          style={{
            left: Math.min(tooltipPosition.x + 10, window.innerWidth - 250),
            top: tooltipPosition.y + 10,
          }}
        >
          <div className={`font-bold ${getRarityTextColor(hoveredItem.rarity)}`}>
            {hoveredItem.name}
            {hoveredItem.enhancementLevel > 0 && ` +${hoveredItem.enhancementLevel}`}
          </div>
          <div className="text-xs text-gray-400 mt-1">Level {hoveredItem.level}</div>
          {(hoveredItem.damage_min > 0 || hoveredItem.damage_max > 0) && (
            <div className="text-xs text-red-400">Damage: {hoveredItem.damage_min}-{hoveredItem.damage_max}</div>
          )}
          {hoveredItem.defense > 0 && (
            <div className="text-xs text-blue-400">Defense: {hoveredItem.defense}</div>
          )}
          {hoveredItem.options && hoveredItem.options.length > 0 && (
            <div className="mt-1 pt-1 border-t border-gray-700">
              {hoveredItem.options.map((opt, i) => (
                <div key={i} className="text-xs text-green-400">{opt.display}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
