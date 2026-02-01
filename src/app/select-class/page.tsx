'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CLASSES = [
  {
    id: 'Dark Knight',
    name: 'Dark Knight',
    description: 'A powerful melee warrior with high damage and defense.',
    icon: '⚔️',
    color: 'red',
  },
  {
    id: 'Dark Wizard',
    name: 'Dark Wizard',
    description: 'Master of magic with devastating spells.',
    icon: '🔮',
    color: 'blue',
  },
  {
    id: 'Elf',
    name: 'Elf',
    description: 'Swift archer with ranged attacks and support abilities.',
    icon: '🏹',
    color: 'green',
  },
  {
    id: 'Magic Gladiator',
    name: 'Magic Gladiator',
    description: 'Hybrid warrior combining sword and magic.',
    icon: '✨',
    color: 'purple',
  },
  {
    id: 'Dark Lord',
    name: 'Dark Lord',
    description: 'Commander with summoning abilities and leadership.',
    icon: '👑',
    color: 'yellow',
  },
];

export default function SelectClassPage() {
  const { status } = useSession();
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass) {
      setError('Please select a class');
      return;
    }

    if (!characterName.trim()) {
      setError('Please enter a character name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/character/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_name: characterName,
          class_type: selectedClass,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/?character_id=${data.character.id}`);
      } else {
        setError(data.message || 'Failed to create character');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-yellow-400">Create Character</h1>
          <Link
            href="/characters"
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
          >
            Back
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

      {/* Class selection */}
      <main className="max-w-4xl mx-auto">
        <form onSubmit={handleCreate}>
          {/* Character name input */}
          <div className="mb-8">
            <label htmlFor="characterName" className="block text-sm font-medium text-gray-300 mb-2">
              Character Name
            </label>
            <input
              id="characterName"
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="w-full max-w-md px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="Enter character name"
              minLength={2}
              maxLength={50}
            />
          </div>

          {/* Class selection grid */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Select Your Class
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CLASSES.map((cls) => (
                <div
                  key={cls.id}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${
                      selectedClass === cls.id
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                    }
                  `}
                  onClick={() => setSelectedClass(cls.id)}
                >
                  <div className="text-4xl mb-2">{cls.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {cls.name}
                  </h3>
                  <p className="text-sm text-gray-400">{cls.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Create button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isCreating || !selectedClass || !characterName.trim()}
              className="px-8 py-3 bg-yellow-500 text-gray-900 rounded-lg font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Character'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
