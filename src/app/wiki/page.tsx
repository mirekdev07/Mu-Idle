'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function WikiPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <h1 className="hidden sm:block text-xl font-semibold">Wiki</h1>
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
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-8">

        {/* Table of Contents */}
        <nav className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-bold text-yellow-400 mb-3">Table of Contents</h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <li><a href="#stats" className="text-blue-400 hover:text-blue-300">Upgrade Stats</a></li>
            <li><a href="#combat" className="text-blue-400 hover:text-blue-300">Combat System</a></li>
            <li><a href="#ascension" className="text-blue-400 hover:text-blue-300">Ascension System</a></li>
            <li><a href="#items" className="text-blue-400 hover:text-blue-300">Items & Rarity</a></li>
            <li><a href="#options" className="text-blue-400 hover:text-blue-300">Item Options</a></li>
            <li><a href="#enhancement" className="text-blue-400 hover:text-blue-300">Enhancement (+1-9)</a></li>
            <li><a href="#crafting" className="text-blue-400 hover:text-blue-300">Crafting & Jewels</a></li>
            <li><a href="#drops" className="text-blue-400 hover:text-blue-300">Drop Rates</a></li>
            <li><a href="#locations" className="text-blue-400 hover:text-blue-300">Locations</a></li>
            <li><a href="#reset" className="text-blue-400 hover:text-blue-300">Character Reset</a></li>
            <li><a href="#accessories" className="text-blue-400 hover:text-blue-300">Accessories</a></li>
          </ul>
        </nav>

        {/* Upgrade Stats */}
        <section id="stats" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Upgrade Stats</h2>

          <p className="text-gray-300 mb-4">
            Spend <span className="text-green-400 font-bold">Zen</span> to upgrade your character stats. Each upgrade increases the stat level by 1.
          </p>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-red-400 mb-2">⚔️ DMG (Damage)</h3>
              <ul className="text-sm space-y-1">
                <li><span className="text-gray-400">Min Damage:</span> <span className="text-white">+2 per level</span></li>
                <li><span className="text-gray-400">Max Damage:</span> <span className="text-white">+3 per level</span></li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-blue-400 mb-2">🛡️ DEF (Defense)</h3>
              <ul className="text-sm space-y-1">
                <li><span className="text-gray-400">Physical Defense:</span> <span className="text-white">+1 per level</span></li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-cyan-400 mb-2">💨 Speed (Attack Speed)</h3>
              <ul className="text-sm space-y-1">
                <li><span className="text-gray-400">Attack Speed:</span> <span className="text-white">+1 per level</span></li>
                <li><span className="text-yellow-400">Maximum: 350</span> <span className="text-gray-500">(cannot upgrade beyond this)</span></li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-green-400 mb-2">❤️ HP (Vitality)</h3>
              <ul className="text-sm space-y-1">
                <li><span className="text-gray-400">Max HP:</span> <span className="text-white">+10 HP per level</span></li>
                <li><span className="text-gray-400">Base HP:</span> <span className="text-white">50</span></li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-yellow-400 mb-2">💰 Zen% (Zen Bonus)</h3>
              <ul className="text-sm space-y-1">
                <li><span className="text-gray-400">Zen Drop Bonus:</span> <span className="text-white">+1% per level</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-700">
            <p className="text-sm text-blue-300">
              <strong>Upgrade Cost:</strong> 50 × level^1.5 Zen per upgrade
            </p>
          </div>
        </section>

        {/* Combat System */}
        <section id="combat" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Combat System</h2>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-orange-400 mb-2">Damage Calculation</h3>
              <div className="text-sm space-y-2">
                <p><span className="text-gray-400">Base Damage:</span> <span className="text-white">Random between Min and Max damage</span></p>
                <p><span className="text-gray-400">Final Damage:</span> <span className="text-white">Base - (Monster Defense × 0.3)</span></p>
                <p><span className="text-gray-400">Minimum Damage:</span> <span className="text-white">1 (always deal at least 1 damage)</span></p>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-cyan-400 mb-2">Critical Rate</h3>
              <p className="text-sm text-gray-300">
                <span className="text-white font-mono">5% base + 1% per 50 character levels + Equipment Bonuses + Ascension</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Maximum: 50%</p>
              <p className="text-sm mt-2">
                <span className="text-gray-400">Critical Damage:</span> <span className="text-white">150% (1.5x damage)</span>
              </p>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-yellow-400 mb-2">Attack Speed</h3>
              <p className="text-sm text-gray-300">
                Higher attack speed means faster attacks.
              </p>
              <p className="text-sm mt-1">
                <span className="text-gray-400">Formula:</span> <span className="text-white font-mono">Speed Level + Weapon Attack Speed</span>
              </p>
              <p className="text-xs text-yellow-400 mt-1">Maximum: 350 (hard cap)</p>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-red-400 mb-2">HP & Recovery</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-gray-400">Max HP:</span> <span className="text-white">50 + (HP Level × 10) + Ascension Bonus</span></p>
                <p><span className="text-gray-400">HP Recovery:</span> <span className="text-white">5 + (HP Level / 5) per tick</span></p>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-pink-400 mb-2">Life Steal</h3>
              <p className="text-sm text-gray-300">
                Heals you for a percentage of damage dealt. Available from item options and Ascension.
              </p>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-purple-400 mb-2">Reflect Damage</h3>
              <p className="text-sm text-gray-300">
                Returns a percentage of received damage back to the monster. Only available from item options.
              </p>
            </div>
          </div>
        </section>

        {/* Ascension System */}
        <section id="ascension" className="bg-gray-800/50 rounded-lg p-4 border border-purple-700">
          <h2 className="text-xl font-bold text-purple-400 mb-4">⭐ Ascension System</h2>

          <p className="text-gray-300 mb-4">
            The Ascension system is a prestige mechanic. Each time you <span className="text-yellow-400 font-bold">reset at level 400</span>,
            you earn <span className="text-purple-400 font-bold">+1 Ascension Point</span> to spend on permanent bonuses.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400">Skill</th>
                  <th className="text-left py-2 text-gray-400">Bonus per Point</th>
                  <th className="text-left py-2 text-gray-400">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="py-2 text-red-400">⚔️ Damage</td>
                  <td className="py-2">+2% DMG</td>
                  <td className="py-2 text-gray-400">Increases all damage dealt</td>
                </tr>
                <tr>
                  <td className="py-2 text-yellow-400">💥 Critical</td>
                  <td className="py-2">+1% Crit</td>
                  <td className="py-2 text-gray-400">Increases critical hit chance</td>
                </tr>
                <tr>
                  <td className="py-2 text-green-400">❤️ Health</td>
                  <td className="py-2">+5% HP</td>
                  <td className="py-2 text-gray-400">Increases maximum HP</td>
                </tr>
                <tr>
                  <td className="py-2 text-pink-400">🩸 Life Steal</td>
                  <td className="py-2">+0.5% LS</td>
                  <td className="py-2 text-gray-400">Heal % of damage dealt</td>
                </tr>
                <tr>
                  <td className="py-2 text-amber-400">💰 Zen</td>
                  <td className="py-2">+3% Zen</td>
                  <td className="py-2 text-gray-400">Increases zen drops</td>
                </tr>
                <tr>
                  <td className="py-2 text-cyan-400">📈 Experience</td>
                  <td className="py-2">+2% EXP</td>
                  <td className="py-2 text-gray-400">Increases experience gain</td>
                </tr>
                <tr>
                  <td className="py-2 text-lime-400">🧪 Poison</td>
                  <td className="py-2">+0.5% chance</td>
                  <td className="py-2 text-gray-400">Chance to poison (deals 10% of monster&apos;s current HP)</td>
                </tr>
                <tr>
                  <td className="py-2 text-indigo-400">✨ Excellent</td>
                  <td className="py-2">+0.25% chance</td>
                  <td className="py-2 text-gray-400">Chance for excellent damage (2x damage)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-purple-900/30 rounded border border-purple-700">
            <p className="text-sm text-purple-300">
              <strong>How to access:</strong> Click the &quot;⭐ Ascension&quot; button in the top navigation bar (desktop)
              or find it in the Stats tab (mobile).
            </p>
          </div>
        </section>

        {/* Items & Rarity */}
        <section id="items" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Items & Rarity</h2>

          <div className="space-y-3">
            <div className="bg-gray-900/50 rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 font-bold">Common</span>
                <span className="text-gray-500 text-sm">60%</span>
              </div>
              <p className="text-xs text-gray-400">Base stats, no special bonuses</p>
            </div>
            <div className="bg-gray-900/50 rounded p-3 border-l-2 border-green-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-400 font-bold">Uncommon</span>
                <span className="text-gray-500 text-sm">25%</span>
              </div>
              <p className="text-xs text-gray-400">Slightly better stats</p>
            </div>
            <div className="bg-gray-900/50 rounded p-3 border-l-2 border-blue-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-blue-400 font-bold">Rare</span>
                <span className="text-gray-500 text-sm">10%</span>
              </div>
              <p className="text-xs text-gray-400">Good stats, may have 1 option</p>
            </div>
            <div className="bg-gray-900/50 rounded p-3 border-l-2 border-purple-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-purple-400 font-bold">Epic</span>
                <span className="text-gray-500 text-sm">4%</span>
              </div>
              <p className="text-xs text-gray-400">Great stats, 1-2 options</p>
            </div>
            <div className="bg-gray-900/50 rounded p-3 border-l-2 border-yellow-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-yellow-400 font-bold">Legendary</span>
                <span className="text-gray-500 text-sm">1%</span>
              </div>
              <p className="text-xs text-gray-400">Best stats, 2-3 options</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-700">
            <p className="text-sm text-blue-300">
              <strong>Item Level:</strong> Items drop within ±15 levels of the monster you killed.
              Higher level items have better base stats.
            </p>
          </div>
        </section>

        {/* Item Options */}
        <section id="options" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Item Options</h2>

          <p className="text-gray-300 mb-4">
            Rare, Epic, and Legendary items can have special options that provide additional bonuses.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400">Option</th>
                  <th className="text-left py-2 text-gray-400">Value Range</th>
                  <th className="text-left py-2 text-gray-400">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="py-2 text-cyan-400">Critical Rate</td>
                  <td className="py-2">+1% to +5%</td>
                  <td className="py-2 text-gray-400">Increases critical hit chance</td>
                </tr>
                <tr>
                  <td className="py-2 text-orange-400">Attack Speed</td>
                  <td className="py-2">+5% to +15%</td>
                  <td className="py-2 text-gray-400">Faster attack rate</td>
                </tr>
                <tr>
                  <td className="py-2 text-pink-400">Life Steal</td>
                  <td className="py-2">+1% to +5%</td>
                  <td className="py-2 text-gray-400">Heal % of damage dealt</td>
                </tr>
                <tr>
                  <td className="py-2 text-red-400">Extra Damage</td>
                  <td className="py-2">+5% to +15%</td>
                  <td className="py-2 text-gray-400">Increases all damage</td>
                </tr>
                <tr>
                  <td className="py-2 text-blue-400">Extra Defense</td>
                  <td className="py-2">+5% to +15%</td>
                  <td className="py-2 text-gray-400">Increases total defense</td>
                </tr>
                <tr>
                  <td className="py-2 text-purple-400">EXP Bonus</td>
                  <td className="py-2">+5% to +20%</td>
                  <td className="py-2 text-gray-400">More experience per kill</td>
                </tr>
                <tr>
                  <td className="py-2 text-green-400">Zen Bonus</td>
                  <td className="py-2">+10% to +30%</td>
                  <td className="py-2 text-gray-400">More gold per kill</td>
                </tr>
                <tr>
                  <td className="py-2 text-yellow-400">Excellent Damage</td>
                  <td className="py-2">+10% to +30%</td>
                  <td className="py-2 text-gray-400">Bonus on excellent hits</td>
                </tr>
                <tr>
                  <td className="py-2 text-red-300">Max HP</td>
                  <td className="py-2">+5% to +20%</td>
                  <td className="py-2 text-gray-400">Increases maximum HP</td>
                </tr>
                <tr>
                  <td className="py-2 text-amber-400">HP Recovery</td>
                  <td className="py-2">+10% to +50%</td>
                  <td className="py-2 text-gray-400">Faster HP regeneration</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-300">Damage Decrease</td>
                  <td className="py-2">+3% to +10%</td>
                  <td className="py-2 text-gray-400">Reduces incoming damage</td>
                </tr>
                <tr>
                  <td className="py-2 text-purple-300">Reflect Damage</td>
                  <td className="py-2">+3% to +10%</td>
                  <td className="py-2 text-gray-400">Returns damage to attacker</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-purple-900/30 rounded border border-purple-700">
            <p className="text-sm text-purple-300">
              <strong>Number of Options:</strong><br/>
              Rare: 0-1 options | Epic: 1-2 options | Legendary: 2-3 options
            </p>
          </div>
        </section>

        {/* Enhancement */}
        <section id="enhancement" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Enhancement System (+1 to +9)</h2>

          <p className="text-gray-300 mb-4">
            Items can be enhanced from +0 to +9, increasing their base stats.
          </p>

          <div className="bg-gray-900/50 rounded p-3 mb-4">
            <h3 className="font-bold text-orange-400 mb-2">Enhancement Bonuses</h3>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-400">Weapons:</span> <span className="text-white">+3 min/max damage per level</span></p>
              <p><span className="text-gray-400">Armor:</span> <span className="text-white">+2 defense per level</span></p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400">Level</th>
                  <th className="text-left py-2 text-gray-400">Weapon Bonus</th>
                  <th className="text-left py-2 text-gray-400">Armor Bonus</th>
                  <th className="text-left py-2 text-gray-400">How to Get</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="py-2 text-purple-300">+1 to +6</td>
                  <td className="py-2">+3 to +18 damage</td>
                  <td className="py-2">+2 to +12 defense</td>
                  <td className="py-2 text-purple-400">Jewel of Bless (100%)</td>
                </tr>
                <tr>
                  <td className="py-2 text-pink-300">+7 to +9</td>
                  <td className="py-2">+21 to +27 damage</td>
                  <td className="py-2">+14 to +18 defense</td>
                  <td className="py-2 text-pink-400">Jewel of Soul (70%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Crafting & Jewels */}
        <section id="crafting" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Crafting & Jewels</h2>

          <p className="text-gray-300 mb-4">
            Use jewels to upgrade your items. Click on an item in your inventory and select &quot;Craft&quot; to open the crafting panel.
          </p>

          <div className="space-y-4">
            <div className="bg-purple-900/30 rounded p-4 border border-purple-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl text-purple-300">💎</span>
                <h3 className="font-bold text-purple-300">Jewel of Bless</h3>
              </div>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Upgrades item from +0 to +6</li>
                <li>• <span className="text-green-400 font-bold">100% success rate</span></li>
                <li>• Each use increases enhancement by +1</li>
                <li>• Cannot be used on items +6 or higher</li>
              </ul>
            </div>

            <div className="bg-pink-900/30 rounded p-4 border border-pink-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl text-pink-400">💎</span>
                <h3 className="font-bold text-pink-400">Jewel of Soul</h3>
              </div>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Upgrades item from +6 to +9</li>
                <li>• <span className="text-yellow-400 font-bold">70% success rate</span></li>
                <li>• Each use increases enhancement by +1</li>
                <li>• Requires item to be +6 first</li>
                <li>• <span className="text-red-400">On failure: nothing happens (item stays same level)</span></li>
              </ul>
            </div>

            <div className="bg-orange-900/30 rounded p-4 border border-orange-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl text-orange-400">💎</span>
                <h3 className="font-bold text-orange-400">Jewel of Life</h3>
              </div>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• <span className="text-red-400">Weapons:</span> Adds +4 Damage (min &amp; max)</li>
                <li>• <span className="text-blue-400">Armor:</span> Adds +4 Defense</li>
                <li>• <span className="text-yellow-400 font-bold">70% success rate</span></li>
                <li>• Can be used multiple times (max +16 bonus)</li>
                <li>• Bonus stacks: +4 → +8 → +12 → +16</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Drop Rates */}
        <section id="drops" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Drop Rates</h2>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-green-400 mb-2">Item Drops</h3>
              <p className="text-sm text-gray-300">
                <span className="text-white font-bold">2.5%</span> chance per monster kill
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Items drop within ±15 levels of monster level
              </p>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-purple-400 mb-2">Jewel & Material Drops</h3>
              <p className="text-sm text-gray-300 mb-2">
                Only from monsters <span className="text-yellow-400 font-bold">level 41+</span>
              </p>
              <ul className="text-sm space-y-1">
                <li><span className="text-purple-300">💎 Jewel of Bless:</span> <span className="text-white">0.8%</span></li>
                <li><span className="text-pink-400">💎 Jewel of Soul:</span> <span className="text-white">0.8%</span></li>
                <li><span className="text-orange-400">💎 Jewel of Life:</span> <span className="text-white">0.8%</span></li>
                <li><span className="text-yellow-400">💎 Jewel of Chaos:</span> <span className="text-white">0.4%</span></li>
                <li><span className="text-cyan-400">📜 Scroll of Archangel:</span> <span className="text-white">0.8%</span></li>
                <li><span className="text-red-400">🦴 Blood Bone:</span> <span className="text-white">0.8%</span></li>
                <li><span className="text-amber-400">🗝️ Devil&apos;s Key:</span> <span className="text-white">0.8%</span></li>
                <li><span className="text-green-400">👁️ Devil&apos;s Eye:</span> <span className="text-white">0.8%</span></li>
              </ul>
              <p className="text-sm text-gray-300 mt-2">
                From monsters <span className="text-yellow-400 font-bold">level 81+</span>:
              </p>
              <ul className="text-sm space-y-1">
                <li><span className="text-emerald-400">🪶 Feather:</span> <span className="text-white">0.1%</span></li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-yellow-400 mb-2">Experience & Zen</h3>
              <p className="text-sm text-gray-300">
                EXP and Zen gained scales with monster level. Higher level monsters give more rewards.
              </p>
              <p className="text-sm mt-2">
                <span className="text-gray-400">Level up requirement:</span> <span className="text-white">Level² × 5 EXP</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Example: Level 100 needs 50,000 EXP, Level 400 needs 800,000 EXP
              </p>
            </div>
          </div>
        </section>

        {/* Locations */}
        <section id="locations" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Locations</h2>

          <p className="text-gray-300 mb-4">
            Travel between locations to find monsters appropriate for your level. Max level is 400.
          </p>

          <div className="grid gap-2 text-sm">
            {[
              { name: '🌿 Newbie Valley', levels: '1-10', color: 'text-green-400' },
              { name: '🌲 Forest Entrance', levels: '11-20', color: 'text-green-400' },
              { name: '⛰️ Mountain Pass', levels: '21-30', color: 'text-blue-400' },
              { name: '🌑 Dark Forest', levels: '31-40', color: 'text-blue-400' },
              { name: '⚰️ Haunted Cemetery', levels: '41-50', color: 'text-purple-400' },
              { name: '❄️ Ice Caverns', levels: '51-60', color: 'text-purple-400' },
              { name: '💀 Cursed Lands', levels: '61-80', color: 'text-orange-400' },
              { name: '🔥 Hell Grounds', levels: '81-100', color: 'text-red-400' },
              { name: '⚔️ End Game', levels: '101-180', color: 'text-yellow-400' },
              { name: '🌋 Volcanic Crater', levels: '181-210', color: 'text-orange-500' },
              { name: '🕳️ Abyss Ruins', levels: '211-240', color: 'text-purple-500' },
              { name: '✨ Celestial Rift', levels: '241-280', color: 'text-cyan-400' },
              { name: '👑 Chaos Throne', levels: '281-400', color: 'text-yellow-500' },
            ].map((loc) => (
              <div key={loc.name} className="flex justify-between items-center bg-gray-900/50 rounded p-2">
                <span className={`${loc.color} font-medium`}>{loc.name}</span>
                <span className="text-gray-400">Lv. {loc.levels}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-yellow-900/30 rounded border border-yellow-700">
            <p className="text-sm text-yellow-300">
              <strong>Tip:</strong> Hunt monsters close to your level for best EXP efficiency.
              Too easy monsters give less EXP, too hard ones may kill you!
            </p>
          </div>
        </section>

        {/* Character Reset */}
        <section id="reset" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Character Reset</h2>

          <div className="bg-gray-900/50 rounded p-4">
            <p className="text-gray-300 mb-4">
              When you reach <span className="text-yellow-400 font-bold">level 400</span>, you can reset your character.
            </p>

            <h3 className="font-bold text-purple-400 mb-2">What happens on reset:</h3>
            <ul className="text-sm space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Level resets to 1</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>All upgrade stats reset to level 1</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Reset count increases by 1</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">⭐</span>
                <span><strong>You receive +1 Ascension Point!</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Inventory and equipment are <strong>kept!</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>All Ascension bonuses are <strong>kept!</strong></span>
              </li>
            </ul>

            <div className="mt-4 p-3 bg-purple-900/30 rounded border border-purple-700">
              <p className="text-sm text-purple-300">
                <strong>Ascension Points:</strong> Spend these in the Ascension Tree to permanently
                boost your character with bonuses like +2% damage, +1% crit, +5% HP, and more!
              </p>
            </div>

            <div className="mt-3 p-3 bg-green-900/30 rounded border border-green-700">
              <p className="text-sm text-green-300">
                <strong>Reset Bonuses:</strong> Each reset also gives <span className="text-yellow-400">+0.1% EXP</span> and
                <span className="text-yellow-400"> +0.1% Zen</span> permanent bonus (stacks with each reset).
              </p>
            </div>
          </div>
        </section>

        {/* Equipment Slots */}
        <section className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Equipment Slots</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { slot: 'Weapon', icon: '⚔️', desc: 'Main damage source' },
              { slot: 'Shield', icon: '🛡️', desc: 'Defense bonus' },
              { slot: 'Helm', icon: '⛑️', desc: 'Head protection' },
              { slot: 'Armor', icon: '🦺', desc: 'Body protection' },
              { slot: 'Pants', icon: '👖', desc: 'Leg protection' },
              { slot: 'Gloves', icon: '🧤', desc: 'Hand protection' },
              { slot: 'Boots', icon: '🥾', desc: 'Foot protection' },
              { slot: 'Ring', icon: '💍', desc: 'Special options only' },
              { slot: 'Pendant', icon: '📿', desc: 'Special options only' },
            ].map((eq) => (
              <div key={eq.slot} className="bg-gray-900/50 rounded p-3 text-center">
                <div className="text-2xl mb-1">{eq.icon}</div>
                <div className="font-bold text-gray-200">{eq.slot}</div>
                <div className="text-xs text-gray-500">{eq.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Accessories */}
        <section id="accessories" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Accessories (Ring & Pendant)</h2>

          <div className="bg-gray-900/50 rounded p-4 mb-4">
            <p className="text-gray-300 mb-4">
              Rings and Pendants are special accessories that provide <span className="text-purple-400 font-bold">bonus options only</span> - they have no base damage or defense.
            </p>

            <div className="bg-yellow-900/30 rounded p-3 border border-yellow-700 mb-4">
              <p className="text-sm text-yellow-300">
                <strong>Important:</strong> Accessories cannot be enhanced with Jewels (Bless, Soul, or Life).
              </p>
            </div>

            <div className="bg-blue-900/30 rounded p-3 border border-blue-700">
              <p className="text-sm text-blue-300">
                <strong>Drop Requirement:</strong> Minimum monster level 41 to drop rings and pendants.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-pink-400 mb-2">💍 Rings</h3>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Ring of Ice (Lv. 41)</li>
                <li>• Ring of Poison (Lv. 50)</li>
                <li>• Ring of Fire (Lv. 60)</li>
                <li>• Ring of Earth (Lv. 70)</li>
                <li>• Ring of Wind (Lv. 80)</li>
                <li>• Ring of Magic (Lv. 100)</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-cyan-400 mb-2">📿 Pendants</h3>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Pendant of Lightning (Lv. 41)</li>
                <li>• Pendant of Fire (Lv. 50)</li>
                <li>• Pendant of Ice (Lv. 60)</li>
                <li>• Pendant of Wind (Lv. 70)</li>
                <li>• Pendant of Water (Lv. 80)</li>
                <li>• Pendant of Ability (Lv. 100)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm py-8">
          <p>MU Idle Adventure - Wiki</p>
          <p className="mt-1">Game inspired by MU Online</p>
        </footer>
      </main>
    </div>
  );
}
