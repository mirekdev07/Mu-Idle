'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CharacterData {
  id: number;
  name: string;
  class: string;
  level: number;
  experience: string;
  zen: string;
  damage: number;
  defense: number;
  vitality: number;
  levelupPoints: number;
  currentHp: number | null;
  resetCount: number;
}

interface GameData {
  character: CharacterData;
  stats: {
    minDamage: number;
    maxDamage: number;
    physicalDefense: number;
    attackSpeed: number;
    maxHp: number;
    criticalRate: number;
  };
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadGameData();
    }
  }, [status, router]);

  const loadGameData = async () => {
    try {
      const response = await fetch('/api/game/data');
      const data = await response.json();

      if (data.success) {
        setGameData(data);
      } else if (data.message === 'No character found') {
        router.push('/characters');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load game data');
      console.error(err);
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yellow-500 text-gray-900 rounded hover:bg-yellow-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No character found</p>
          <Link
            href="/characters"
            className="px-4 py-2 bg-yellow-500 text-gray-900 rounded hover:bg-yellow-400"
          >
            Create Character
          </Link>
        </div>
      </div>
    );
  }

  const { character, stats } = gameData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-yellow-400">MU Idle Adventure</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              Welcome, {session?.user?.username}
            </span>
            <Link
              href="/characters"
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
            >
              Characters
            </Link>
            <Link
              href="/ranking"
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
            >
              Ranking
            </Link>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Character Panel */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-semibold text-yellow-400 mb-4">
            {character.name}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Class:</span>
              <span>{character.class}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Level:</span>
              <span className="text-yellow-400">{character.level}</span>
            </div>
            {character.resetCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Resets:</span>
                <span className="text-purple-400">{character.resetCount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Experience:</span>
              <span>{BigInt(character.experience).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Zen:</span>
              <span className="text-green-400">
                {BigInt(character.zen).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Stat Points:</span>
              <span className="text-blue-400">{character.levelupPoints}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Base Stats
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Damage:</span>
                <span className="ml-2">{character.damage}</span>
              </div>
              <div>
                <span className="text-gray-500">Defense:</span>
                <span className="ml-2">{character.defense}</span>
              </div>
              <div>
                <span className="text-gray-500">Vitality:</span>
                <span className="ml-2">{character.vitality}</span>
              </div>
            </div>
          </div>

          {/* Combat Stats */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Combat Stats
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Attack:</span>
                <span className="ml-2">
                  {stats.minDamage}-{stats.maxDamage}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Defense:</span>
                <span className="ml-2">{stats.physicalDefense}</span>
              </div>
              <div>
                <span className="text-gray-500">Max HP:</span>
                <span className="ml-2 text-red-400">{stats.maxHp}</span>
              </div>
              <div>
                <span className="text-gray-500">Crit Rate:</span>
                <span className="ml-2">{stats.criticalRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hunting Panel */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 lg:col-span-2">
          <h2 className="text-xl font-semibold text-yellow-400 mb-4">
            Hunting Ground
          </h2>
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">
              The full hunting system will be implemented here.
            </p>
            <p className="text-gray-500 text-sm">
              This includes monster spawning, auto-combat, item drops, and more.
            </p>
          </div>
        </div>

        {/* Inventory Panel */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 lg:col-span-3">
          <h2 className="text-xl font-semibold text-yellow-400 mb-4">
            Inventory & Equipment
          </h2>
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">
              Inventory drag-and-drop system will be implemented here.
            </p>
            <p className="text-gray-500 text-sm">
              Includes 24-slot inventory, 7-slot equipment, and item tooltips.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-8 text-center text-gray-500 text-sm">
        <p>MU Idle Adventure - Next.js Edition</p>
      </footer>
    </div>
  );
}
