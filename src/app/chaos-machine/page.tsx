'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Materials {
  chaos: number;
  archangel: number;
  bloodbone: number;
  devilskey: number;
  devilseye: number;
}

interface Tickets {
  bloodCastle: number;
  devilSquare: number;
}

interface CharacterData {
  id: number;
  name: string;
}

export default function ChaosMachinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [materials, setMaterials] = useState<Materials>({
    chaos: 0,
    archangel: 0,
    bloodbone: 0,
    devilskey: 0,
    devilseye: 0,
  });
  const [tickets, setTickets] = useState<Tickets>({
    bloodCastle: 0,
    devilSquare: 0,
  });
  const [zen, setZen] = useState<bigint>(0n);
  const [mixing, setMixing] = useState(false);
  const [mixResult, setMixResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        });
        setTickets({
          bloodCastle: data.character.bloodCastleTicket || 0,
          devilSquare: data.character.devilSquareTicket || 0,
        });
        setZen(BigInt(data.character.zen || 0));
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
          // Deduct zen locally if not returned
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

  const ZEN_REQUIRED = 300000n;
  const canMixBloodCastle = materials.archangel >= 1 && materials.bloodbone >= 1 && materials.chaos >= 1 && zen >= ZEN_REQUIRED;
  const canMixDevilSquare = materials.devilskey >= 1 && materials.devilseye >= 1 && materials.chaos >= 1 && zen >= ZEN_REQUIRED;

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
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-700 p-4">
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
                    <Link href="/characters" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50">
                      <span className="text-xl">👤</span>
                      <div>
                        <div className="font-medium">Characters</div>
                        <div className="text-xs text-gray-400">Manage your heroes</div>
                      </div>
                    </Link>
                    <Link href="/ranking" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50">
                      <span className="text-xl">🏆</span>
                      <div>
                        <div className="font-medium">Ranking</div>
                        <div className="text-xs text-gray-400">Top players</div>
                      </div>
                    </Link>
                    <Link href="/wiki" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50">
                      <span className="text-xl">📖</span>
                      <div>
                        <div className="font-medium">Wiki</div>
                        <div className="text-xs text-gray-400">Game guide</div>
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
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔮</div>
          <h2 className="text-3xl font-bold text-purple-400 mb-2">Chaos Machine</h2>
          <p className="text-gray-400">Combine materials to create powerful items</p>
        </div>

        {/* Zen Display */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6 text-center">
          <span className="text-gray-400">Your Zen: </span>
          <span className="text-xl text-green-400 font-bold">{zen.toLocaleString()}</span>
        </div>

        {/* Materials Inventory */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">Your Materials</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">💎</div>
              <div className="text-yellow-400 font-bold">{materials.chaos}</div>
              <div className="text-xs text-gray-500">Jewel of Chaos</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📜</div>
              <div className="text-blue-400 font-bold">{materials.archangel}</div>
              <div className="text-xs text-gray-500">Scroll of Archangel</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🦴</div>
              <div className="text-red-400 font-bold">{materials.bloodbone}</div>
              <div className="text-xs text-gray-500">Blood Bone</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🗝️</div>
              <div className="text-orange-400 font-bold">{materials.devilskey}</div>
              <div className="text-xs text-gray-500">Devil's Key</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">👁️</div>
              <div className="text-purple-400 font-bold">{materials.devilseye}</div>
              <div className="text-xs text-gray-500">Devil's Eye</div>
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
              <div className="text-sm text-gray-400">Blood Castle Ticket</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-purple-900/50">
              <div className="text-3xl mb-2">🎟️</div>
              <div className="text-2xl text-purple-400 font-bold">{tickets.devilSquare}</div>
              <div className="text-sm text-gray-400">Devil Square Ticket</div>
            </div>
          </div>
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

        {/* Mix Recipes */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Blood Castle Ticket */}
          <div className="bg-gray-800/50 rounded-lg p-6 border border-red-900/50">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🎫</div>
              <h3 className="text-xl font-bold text-red-400">Blood Castle Ticket</h3>
              <p className="text-xs text-gray-500 mt-1">Entry ticket for Blood Castle event</p>
            </div>

            <div className="space-y-3 mb-4">
              <div className="text-sm text-gray-400 text-center mb-2">Required Materials:</div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded p-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">📜</span>
                  <span>Scroll of Archangel</span>
                </span>
                <span className={materials.archangel >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {materials.archangel}/1
                </span>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded p-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">🦴</span>
                  <span>Blood Bone</span>
                </span>
                <span className={materials.bloodbone >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {materials.bloodbone}/1
                </span>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded p-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">💎</span>
                  <span className="text-yellow-400">Jewel of Chaos</span>
                </span>
                <span className={materials.chaos >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {materials.chaos}/1
                </span>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded p-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <span className="text-green-400">Zen</span>
                </span>
                <span className={zen >= ZEN_REQUIRED ? 'text-green-400' : 'text-red-400'}>
                  {zen >= ZEN_REQUIRED ? '✓' : `${zen.toLocaleString()}/300,000`}
                </span>
              </div>
            </div>

            <div className="text-center text-sm text-green-400 mb-4">Success Rate: 100%</div>

            <button
              onClick={() => handleMix('blood_castle_ticket')}
              disabled={!canMixBloodCastle || mixing}
              className={`w-full py-3 rounded-lg font-bold transition-colors ${
                canMixBloodCastle && !mixing
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {mixing ? 'Mixing...' : 'Mix'}
            </button>
          </div>

          {/* Devil Square Ticket */}
          <div className="bg-gray-800/50 rounded-lg p-6 border border-purple-900/50">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🎟️</div>
              <h3 className="text-xl font-bold text-purple-400">Devil Square Ticket</h3>
              <p className="text-xs text-gray-500 mt-1">Entry ticket for Devil Square event</p>
            </div>

            <div className="space-y-3 mb-4">
              <div className="text-sm text-gray-400 text-center mb-2">Required Materials:</div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded p-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">🗝️</span>
                  <span>Devil's Key</span>
                </span>
                <span className={materials.devilskey >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {materials.devilskey}/1
                </span>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded p-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">👁️</span>
                  <span>Devil's Eye</span>
                </span>
                <span className={materials.devilseye >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {materials.devilseye}/1
                </span>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded p-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">💎</span>
                  <span className="text-yellow-400">Jewel of Chaos</span>
                </span>
                <span className={materials.chaos >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {materials.chaos}/1
                </span>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded p-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <span className="text-green-400">Zen</span>
                </span>
                <span className={zen >= ZEN_REQUIRED ? 'text-green-400' : 'text-red-400'}>
                  {zen >= ZEN_REQUIRED ? '✓' : `${zen.toLocaleString()}/300,000`}
                </span>
              </div>
            </div>

            <div className="text-center text-sm text-green-400 mb-4">Success Rate: 100%</div>

            <button
              onClick={() => handleMix('devil_square_ticket')}
              disabled={!canMixDevilSquare || mixing}
              className={`w-full py-3 rounded-lg font-bold transition-colors ${
                canMixDevilSquare && !mixing
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {mixing ? 'Mixing...' : 'Mix'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Materials drop from monsters level 41+</p>
          <p className="mt-1">Jewel of Chaos: 0.5% drop rate | Other materials: 0.5% drop rate</p>
        </div>
      </main>
    </div>
  );
}
