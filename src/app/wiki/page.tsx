'use client';

import Link from 'next/link';

export default function WikiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-yellow-400">MU Idle Wiki</h1>
          <Link href="/" className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm">
            Back to Game
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-8">

        {/* Table of Contents */}
        <nav className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-bold text-yellow-400 mb-3">Table of Contents</h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <li><a href="#stats" className="text-blue-400 hover:text-blue-300">Character Stats</a></li>
            <li><a href="#combat" className="text-blue-400 hover:text-blue-300">Combat System</a></li>
            <li><a href="#items" className="text-blue-400 hover:text-blue-300">Items & Rarity</a></li>
            <li><a href="#options" className="text-blue-400 hover:text-blue-300">Item Options</a></li>
            <li><a href="#enhancement" className="text-blue-400 hover:text-blue-300">Enhancement (+1-9)</a></li>
            <li><a href="#crafting" className="text-blue-400 hover:text-blue-300">Crafting & Jewels</a></li>
            <li><a href="#drops" className="text-blue-400 hover:text-blue-300">Drop Rates</a></li>
            <li><a href="#locations" className="text-blue-400 hover:text-blue-300">Locations</a></li>
            <li><a href="#reset" className="text-blue-400 hover:text-blue-300">Character Reset</a></li>
            <li><a href="#rebuild" className="text-blue-400 hover:text-blue-300">Stat Rebuild</a></li>
            <li><a href="#accessories" className="text-blue-400 hover:text-blue-300">Accessories</a></li>
          </ul>
        </nav>

        {/* Character Stats */}
        <section id="stats" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Character Stats</h2>

          <p className="text-gray-300 mb-4">
            Each level gives you <span className="text-blue-400 font-bold">5 stat points</span> to distribute among three main attributes.
          </p>

          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-red-400 mb-2">Strength (STR)</h3>
              <p className="text-gray-300 text-sm mb-2">Primary damage stat for all classes.</p>
              <ul className="text-sm space-y-1">
                <li><span className="text-gray-400">Min Damage:</span> <span className="text-white">STR × 1.1</span></li>
                <li><span className="text-gray-400">Max Damage:</span> <span className="text-white">STR × 1.6</span></li>
                <li><span className="text-gray-400">Critical Rate:</span> <span className="text-white">+1% per 200 STR</span></li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-blue-400 mb-2">Agility (AGI)</h3>
              <p className="text-gray-300 text-sm mb-2">Defensive stat that also improves attack speed.</p>
              <ul className="text-sm space-y-1">
                <li><span className="text-gray-400">Defense:</span> <span className="text-white">AGI × 0.5</span></li>
                <li><span className="text-gray-400">Attack Speed:</span> <span className="text-white">AGI × 0.15</span></li>
                <li><span className="text-gray-400">Defense Rate:</span> <span className="text-white">AGI × 0.3</span></li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-green-400 mb-2">Vitality (VIT)</h3>
              <p className="text-gray-300 text-sm mb-2">Health and survivability stat.</p>
              <ul className="text-sm space-y-1">
                <li><span className="text-gray-400">HP:</span> <span className="text-white">+5 HP per point</span></li>
                <li><span className="text-gray-400">HP Recovery:</span> <span className="text-white">+1 per 8 VIT</span></li>
              </ul>
            </div>
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
                <p><span className="text-gray-400">Final Damage:</span> <span className="text-white">Base - (Monster Defense / 4)</span></p>
                <p><span className="text-gray-400">Critical Hit:</span> <span className="text-white">Base × 1.5</span></p>
                <p><span className="text-gray-400">Excellent Hit:</span> <span className="text-white">Base × 2.0 (5% chance)</span></p>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-cyan-400 mb-2">Critical Rate</h3>
              <p className="text-sm text-gray-300">
                <span className="text-white font-mono">1% + (Level / 40) + (STR / 200) + Equipment Bonuses</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Maximum: 25%</p>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-yellow-400 mb-2">Attack Speed</h3>
              <p className="text-sm text-gray-300">
                Higher attack speed means faster combat ticks.
              </p>
              <p className="text-sm mt-1">
                <span className="text-gray-400">Formula:</span> <span className="text-white font-mono">AGI × 0.15 + Weapon Speed</span>
              </p>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-red-400 mb-2">HP & Recovery</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-gray-400">Max HP:</span> <span className="text-white">100 + (VIT × 5) + (Level × 3)</span></p>
                <p><span className="text-gray-400">HP Recovery:</span> <span className="text-white">3 + (VIT / 8) + (Level / 15)</span></p>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-pink-400 mb-2">Life Steal</h3>
              <p className="text-sm text-gray-300">
                Heals you for a percentage of damage dealt. Only available from item options.
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

        {/* Items & Rarity */}
        <section id="items" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Items & Rarity</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-gray-900/50 rounded p-3">
              <span className="w-24 text-gray-400 font-bold border-2 border-gray-600 rounded px-2 py-1 text-center">Common</span>
              <span className="text-sm text-gray-300">Base stats, no special bonuses</span>
              <span className="ml-auto text-gray-500">60%</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-900/50 rounded p-3">
              <span className="w-24 text-green-400 font-bold border-2 border-green-600 rounded px-2 py-1 text-center">Uncommon</span>
              <span className="text-sm text-gray-300">Slightly better stats</span>
              <span className="ml-auto text-gray-500">25%</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-900/50 rounded p-3">
              <span className="w-24 text-blue-400 font-bold border-2 border-blue-600 rounded px-2 py-1 text-center">Rare</span>
              <span className="text-sm text-gray-300">Good stats, may have 1 option</span>
              <span className="ml-auto text-gray-500">10%</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-900/50 rounded p-3">
              <span className="w-24 text-purple-400 font-bold border-2 border-purple-600 rounded px-2 py-1 text-center">Epic</span>
              <span className="text-sm text-gray-300">Great stats, 1-2 options</span>
              <span className="ml-auto text-gray-500">4%</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-900/50 rounded p-3">
              <span className="w-24 text-yellow-400 font-bold border-2 border-yellow-500 rounded px-2 py-1 text-center">Legendary</span>
              <span className="text-sm text-gray-300">Best stats, 2-3 options</span>
              <span className="ml-auto text-gray-500">1%</span>
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
                  <th className="text-left py-2 text-gray-400">Drop Rate</th>
                  <th className="text-left py-2 text-gray-400">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="py-2 text-cyan-400">Critical Rate</td>
                  <td className="py-2">+1% to +5%</td>
                  <td className="py-2 text-gray-500">20%</td>
                  <td className="py-2 text-gray-400">Increases critical hit chance</td>
                </tr>
                <tr>
                  <td className="py-2 text-orange-400">Attack Speed</td>
                  <td className="py-2">+5% to +15%</td>
                  <td className="py-2 text-gray-500">15%</td>
                  <td className="py-2 text-gray-400">Faster attack rate</td>
                </tr>
                <tr>
                  <td className="py-2 text-pink-400">Life Steal</td>
                  <td className="py-2">+1% to +5%</td>
                  <td className="py-2 text-gray-500">10%</td>
                  <td className="py-2 text-gray-400">Heal % of damage dealt</td>
                </tr>
                <tr>
                  <td className="py-2 text-red-400">Extra Damage</td>
                  <td className="py-2">+5% to +15%</td>
                  <td className="py-2 text-gray-500">15%</td>
                  <td className="py-2 text-gray-400">Increases all damage</td>
                </tr>
                <tr>
                  <td className="py-2 text-blue-400">Extra Defense</td>
                  <td className="py-2">+5% to +15%</td>
                  <td className="py-2 text-gray-500">15%</td>
                  <td className="py-2 text-gray-400">Increases total defense</td>
                </tr>
                <tr>
                  <td className="py-2 text-purple-400">EXP Bonus</td>
                  <td className="py-2">+5% to +20%</td>
                  <td className="py-2 text-gray-500">10%</td>
                  <td className="py-2 text-gray-400">More experience per kill</td>
                </tr>
                <tr>
                  <td className="py-2 text-green-400">Zen Bonus</td>
                  <td className="py-2">+10% to +30%</td>
                  <td className="py-2 text-gray-500">10%</td>
                  <td className="py-2 text-gray-400">More gold per kill</td>
                </tr>
                <tr>
                  <td className="py-2 text-yellow-400">Excellent Damage</td>
                  <td className="py-2">+10% to +30%</td>
                  <td className="py-2 text-gray-500">5%</td>
                  <td className="py-2 text-gray-400">Bonus on excellent hits</td>
                </tr>
                <tr>
                  <td className="py-2 text-red-300">Max HP</td>
                  <td className="py-2">+5% to +20%</td>
                  <td className="py-2 text-gray-500">10%</td>
                  <td className="py-2 text-gray-400">Increases maximum HP</td>
                </tr>
                <tr>
                  <td className="py-2 text-amber-400">HP Recovery</td>
                  <td className="py-2">+10% to +50%</td>
                  <td className="py-2 text-gray-500">10%</td>
                  <td className="py-2 text-gray-400">Faster HP regeneration</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-300">Damage Decrease</td>
                  <td className="py-2">+3% to +10%</td>
                  <td className="py-2 text-gray-500">10%</td>
                  <td className="py-2 text-gray-400">Reduces incoming damage</td>
                </tr>
                <tr>
                  <td className="py-2 text-purple-300">Reflect Damage</td>
                  <td className="py-2">+3% to +10%</td>
                  <td className="py-2 text-gray-500">5%</td>
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
              <h3 className="font-bold text-purple-400 mb-2">Jewel Drops</h3>
              <p className="text-sm text-gray-300 mb-2">
                Only from monsters <span className="text-yellow-400 font-bold">level 41+</span>
              </p>
              <ul className="text-sm space-y-1">
                <li><span className="text-purple-300">💎 Jewel of Bless:</span> <span className="text-white">1%</span> per kill</li>
                <li><span className="text-pink-400">💎 Jewel of Soul:</span> <span className="text-white">1%</span> per kill</li>
                <li><span className="text-orange-400">💎 Jewel of Life:</span> <span className="text-white">1%</span> per kill</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 rounded p-3">
              <h3 className="font-bold text-yellow-400 mb-2">Experience & Zen</h3>
              <p className="text-sm text-gray-300">
                EXP and Zen gained scales with monster level. Higher level monsters give more rewards.
              </p>
              <p className="text-sm mt-2">
                <span className="text-gray-400">Level up requirement:</span> <span className="text-white">Level × 100 EXP</span>
              </p>
            </div>
          </div>
        </section>

        {/* Locations */}
        <section id="locations" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Locations</h2>

          <p className="text-gray-300 mb-4">
            Travel between locations to find monsters appropriate for your level.
          </p>

          <div className="grid gap-2 text-sm">
            {[
              { name: 'Newbie Valley', levels: '1-10', color: 'green' },
              { name: 'Forest Entrance', levels: '11-20', color: 'green' },
              { name: 'Mountain Pass', levels: '21-30', color: 'blue' },
              { name: 'Dark Forest', levels: '31-40', color: 'blue' },
              { name: 'Haunted Cemetery', levels: '41-50', color: 'purple' },
              { name: 'Ice Caverns', levels: '51-60', color: 'purple' },
              { name: 'Cursed Lands', levels: '61-80', color: 'orange' },
              { name: 'Hell Grounds', levels: '81-100', color: 'red' },
              { name: 'End Game', levels: '101-180', color: 'yellow' },
            ].map((loc) => (
              <div key={loc.name} className="flex justify-between items-center bg-gray-900/50 rounded p-2">
                <span className={`text-${loc.color}-400 font-medium`}>{loc.name}</span>
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
                <span>All stats reset to base (25 each)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Reset count increases by 1</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 font-bold">★</span>
                <span><strong>You receive 500 bonus stat points!</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Inventory and equipment are <strong>kept!</strong></span>
              </li>
            </ul>

            <div className="mt-4 p-3 bg-green-900/30 rounded border border-green-700">
              <p className="text-sm text-green-300">
                <strong>Reset Bonus:</strong> Each reset gives you <span className="text-yellow-400 font-bold">500 free stat points</span> to distribute!
                This lets you build a stronger character each time.
              </p>
            </div>

            <div className="mt-3 p-3 bg-purple-900/30 rounded border border-purple-700">
              <p className="text-sm text-purple-300">
                <strong>Why reset?</strong> Resets are tracked on the ranking board.
                More resets = more prestige and stronger builds with bonus points!
              </p>
            </div>
          </div>
        </section>

        {/* Stat Rebuild */}
        <section id="rebuild" className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Stat Rebuild</h2>

          <div className="bg-gray-900/50 rounded p-4">
            <p className="text-gray-300 mb-4">
              Made a mistake with your stat points? Use the <span className="text-amber-400 font-bold">Rebuild</span> feature to reset and redistribute them!
            </p>

            <div className="bg-amber-900/30 rounded p-4 border border-amber-700 mb-4">
              <h3 className="font-bold text-amber-400 mb-2">Cost: 1,000,000 Zen</h3>
              <p className="text-sm text-gray-300">
                You need at least 1 million Zen to use this feature.
              </p>
            </div>

            <h3 className="font-bold text-purple-400 mb-2">What happens on rebuild:</h3>
            <ul className="text-sm space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>STR, AGI, and VIT reset to base value (25 each)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>All spent stat points are returned to you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">-</span>
                <span>1,000,000 Zen is deducted from your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Level, EXP, equipment, and inventory remain unchanged</span>
              </li>
            </ul>

            <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-700">
              <p className="text-sm text-blue-300">
                <strong>How to use:</strong> Find the &quot;Rebuild (1M Zen)&quot; button in the Stats section, below the stat allocation buttons.
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
