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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-yellow-400">Your Characters</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{session?.user?.username}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-3 py-1 bg-red-600/50 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Characters list */}
      <main className="max-w-4xl mx-auto">
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
