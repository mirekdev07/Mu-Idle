'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Character {
  id: number;
  name: string;
  class: string;
  level: number;
  resetCount: number;
  lastPlayed: string;
}

export default function CharactersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadCharacters();
    }
  }, [status, router]);

  const loadCharacters = async () => {
    try {
      const response = await fetch('/api/characters');
      const data = await response.json();

      if (data.success) {
        setCharacters(data.characters);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load characters');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectCharacter = (characterId: number) => {
    router.push(`/?character_id=${characterId}`);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading characters...</p>
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
            <h1 className="hidden sm:block text-xl font-semibold">Characters</h1>
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
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-3 py-1 bg-red-700 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
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
                  <div className="p-2 border-t border-gray-700">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut({ callbackUrl: '/login' });
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-red-700/30 rounded-lg"
                    >
                      <span className="text-xl">🚪</span>
                      <div>
                        <div className="font-medium text-red-400">Logout</div>
                        <div className="text-xs text-gray-400">Sign out</div>
                      </div>
                    </button>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400">👤 Your Characters</h2>
          <p className="text-gray-400 text-sm mt-1">Select a character to play</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4">
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        )}

        {/* Characters list */}
        {characters.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-gray-400 mb-4">You don&apos;t have any characters yet.</p>
            <Link
              href="/select-class"
              className="inline-block px-6 py-3 bg-yellow-500 text-gray-900 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
            >
              Create Your First Character
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {characters.map((character) => (
              <div
                key={character.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-yellow-500/50 transition-colors cursor-pointer"
                onClick={() => selectCharacter(character.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {character.name}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {character.class} - Level {character.level}
                      {character.resetCount > 0 && (
                        <span className="text-purple-400 ml-2">
                          (Reset {character.resetCount})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">Last played</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(character.lastPlayed).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Create new character button */}
            {characters.length < 5 && (
              <Link
                href="/select-class"
                className="block text-center py-4 bg-gray-800/30 rounded-lg border border-dashed border-gray-600 hover:border-yellow-500/50 transition-colors"
              >
                <span className="text-gray-400 hover:text-yellow-400">
                  + Create New Character
                </span>
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
