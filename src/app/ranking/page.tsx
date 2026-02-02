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
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-yellow-400">Ranking</h1>
          <Link
            href="/"
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
          >
            Back to Game
          </Link>
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

      {/* Ranking table */}
      <main className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Character
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Resets
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kills
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Deaths
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {ranking.map((entry) => (
                <tr
                  key={`${entry.username}-${entry.characterName}`}
                  className={`
                    hover:bg-gray-700/30
                    ${entry.rank === 1 ? 'bg-yellow-500/10' : ''}
                    ${entry.rank === 2 ? 'bg-gray-400/10' : ''}
                    ${entry.rank === 3 ? 'bg-orange-500/10' : ''}
                  `}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`
                        font-bold
                        ${entry.rank === 1 ? 'text-yellow-400' : ''}
                        ${entry.rank === 2 ? 'text-gray-300' : ''}
                        ${entry.rank === 3 ? 'text-orange-400' : ''}
                        ${entry.rank > 3 ? 'text-gray-500' : ''}
                      `}
                    >
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-white font-medium">
                      {entry.characterName}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                    {entry.classType}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-yellow-400 font-medium">
                      {entry.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.resetCount > 0 ? (
                      <span className="text-purple-400">{entry.resetCount}</span>
                    ) : (
                      <span className="text-gray-600">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                    {entry.monstersKilled.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-red-400">
                    {entry.deaths.toLocaleString()}
                  </td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No players found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
