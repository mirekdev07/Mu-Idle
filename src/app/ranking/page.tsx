'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RankingEntry {
  rank: number;
  characterName: string;
  username: string;
  classType: string;
  level: number;
  resetCount: number;
  monstersKilled: number;
  deaths: number;
  towerMaxFloor: number;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      const response = await fetch('/api/ranking?limit=50');
      const data = await response.json();

      if (data.success) {
        setRanking(data.ranking);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load ranking');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading ranking...</p>
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
            <h1 className="hidden sm:block text-xl font-semibold">Ranking</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/" className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
              Game
            </Link>
            <Link href="/events" className="px-3 py-1 bg-orange-700 rounded hover:bg-orange-600 text-sm">
              Events
            </Link>
            <Link href="/chaos-machine" className="px-3 py-1 bg-purple-700 rounded hover:bg-purple-600 text-sm">
              Chaos Machine
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
                    <Link href="/chaos-machine" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-purple-700/30">
                      <span className="text-xl">🔮</span>
                      <div>
                        <div className="font-medium text-purple-400">Chaos Machine</div>
                        <div className="text-xs text-gray-400">Craft items & tickets</div>
                      </div>
                    </Link>
                    <Link href="/characters" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50">
                      <span className="text-xl">👤</span>
                      <div>
                        <div className="font-medium">Characters</div>
                        <div className="text-xs text-gray-400">Manage your heroes</div>
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
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400">🏆 Top Players</h2>
          <p className="text-gray-400 text-sm mt-1">Top 50 players by level and resets</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4">
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        )}

        {/* Mobile Card Layout */}
        <div className="sm:hidden space-y-3">
          {ranking.map((entry) => (
            <div
              key={`${entry.username}-${entry.characterName}`}
              className={`bg-gray-800/50 rounded-lg border p-4 ${
                entry.rank === 1 ? 'border-yellow-500/50 bg-yellow-500/10' :
                entry.rank === 2 ? 'border-gray-400/50 bg-gray-400/10' :
                entry.rank === 3 ? 'border-orange-500/50 bg-orange-500/10' :
                'border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${
                    entry.rank === 1 ? 'text-yellow-400' :
                    entry.rank === 2 ? 'text-gray-300' :
                    entry.rank === 3 ? 'text-orange-400' :
                    'text-gray-500'
                  }`}>
                    #{entry.rank}
                  </span>
                  <div>
                    <div className="font-bold text-white">{entry.characterName}</div>
                    <div className="text-xs text-gray-400">{entry.classType}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-yellow-400">Lv.{entry.level}</div>
                  {entry.resetCount > 0 && (
                    <div className="text-xs text-purple-400">Reset: {entry.resetCount}</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-gray-900/50 rounded p-2">
                  <div className="text-gray-400">Resets</div>
                  <div className={entry.resetCount > 0 ? 'text-purple-400 font-bold' : 'text-gray-600'}>
                    {entry.resetCount}
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded p-2">
                  <div className="text-gray-400">Tower</div>
                  <div className={entry.towerMaxFloor > 0 ? 'text-cyan-400 font-bold' : 'text-gray-600'}>
                    {entry.towerMaxFloor > 0 ? `F${entry.towerMaxFloor}` : '-'}
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded p-2">
                  <div className="text-gray-400">Kills</div>
                  <div className="text-green-400 font-bold">{entry.monstersKilled.toLocaleString()}</div>
                </div>
                <div className="bg-gray-900/50 rounded p-2">
                  <div className="text-gray-400">Deaths</div>
                  <div className="text-red-400 font-bold">{entry.deaths.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
          {ranking.length === 0 && (
            <div className="text-center text-gray-500 py-8">No players found</div>
          )}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden sm:block bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Character</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Class</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Resets</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tower</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Kills</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Deaths</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {ranking.map((entry) => (
                <tr
                  key={`${entry.username}-${entry.characterName}`}
                  className={`hover:bg-gray-700/30 ${
                    entry.rank === 1 ? 'bg-yellow-500/10' :
                    entry.rank === 2 ? 'bg-gray-400/10' :
                    entry.rank === 3 ? 'bg-orange-500/10' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`font-bold ${
                      entry.rank === 1 ? 'text-yellow-400' :
                      entry.rank === 2 ? 'text-gray-300' :
                      entry.rank === 3 ? 'text-orange-400' :
                      'text-gray-500'
                    }`}>
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-white font-medium">{entry.characterName}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-400">{entry.classType}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-yellow-400 font-medium">{entry.level}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.resetCount > 0 ? (
                      <span className="text-purple-400">{entry.resetCount}</span>
                    ) : (
                      <span className="text-gray-600">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.towerMaxFloor > 0 ? (
                      <span className="text-cyan-400">F{entry.towerMaxFloor}</span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-400">{entry.monstersKilled.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-red-400">{entry.deaths.toLocaleString()}</td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No players found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
