import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import { getInventory } from '@/lib/services/inventory.service';
import { getEquipment, getEquipmentBonuses } from '@/lib/services/equipment.service';
import { calculateStats, calculateUpgradeCost } from '@/lib/services/stats.service';
import prisma from '@/lib/prisma';

// Offline rewards constants
const OFFLINE_RATE = 0.05; // 5% of normal production
const MAX_OFFLINE_SECONDS = 28800; // 8 hours
const MIN_OFFLINE_SECONDS = 60; // 1 minute minimum
const MAX_EXP_PER_SECOND = 50000; // Safety limit for exp/sec
const MAX_ZEN_PER_SECOND = 25000; // Safety limit for zen/sec

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const characterIdParam = searchParams.get('character_id');

  try {
    let character;

    if (characterIdParam) {
      character = await getCharacterById(parseInt(characterIdParam, 10), userId);
    }

    if (!character) {
      character = await getLatestCharacter(userId);
    }

    if (!character) {
      return errorResponse('No character found', 404);
    }

    // Get all data in parallel
    const [inventory, equipment, bonuses, user] = await Promise.all([
      getInventory(character.id),
      getEquipment(character.id),
      getEquipmentBonuses(character.id),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          jewelOfBless: true,
          jewelOfSoul: true,
          jewelOfLife: true,
          jewelOfChaos: true,
          scrollOfArchangel: true,
          bloodBone: true,
          devilsKey: true,
          devilsEye: true,
          feather: true,
          bloodCastleTicket: true,
          devilSquareTicket: true,
        },
      }),
    ]);

    // Calculate stats (including ascension bonuses)
    const calculatedStats = calculateStats(
      {
        id: character.id,
        level: character.level,
        damage: character.damage,
        defense: character.defense,
        vitality: character.vitality,
        speedStat: character.speedStat,
        // Ascension bonuses
        ascDamage: character.ascDamage,
        ascCritical: character.ascCritical,
        ascHealth: character.ascHealth,
        ascLifeSteal: character.ascLifeSteal,
        ascZen: character.ascZen,
        ascExp: character.ascExp,
        ascPoison: character.ascPoison,
        ascExcellent: character.ascExcellent,
      },
      bonuses
    );

    // Calculate offline rewards
    let offlineRewards = null;
    const now = new Date();
    const lastHeartbeat = character.lastHeartbeat;
    const secondsElapsed = Math.floor(
      Math.abs(now.getTime() - lastHeartbeat.getTime()) / 1000
    );

    // Sanitize exp/zen per second - must be positive, finite, and within limits
    const rawExpPerSecond = character.lastExpPerSecond || 0;
    const rawZenPerSecond = character.lastZenPerSecond || 0;

    const expPerSecond = (Number.isFinite(rawExpPerSecond) && rawExpPerSecond > 0)
      ? Math.min(rawExpPerSecond, MAX_EXP_PER_SECOND)
      : 0;
    const zenPerSecond = (Number.isFinite(rawZenPerSecond) && rawZenPerSecond > 0)
      ? Math.min(rawZenPerSecond, MAX_ZEN_PER_SECOND)
      : 0;

    if (secondsElapsed > MIN_OFFLINE_SECONDS && (expPerSecond > 0 || zenPerSecond > 0)) {
      const offlineSeconds = Math.min(secondsElapsed, MAX_OFFLINE_SECONDS);
      const offlineExp = Math.floor(expPerSecond * offlineSeconds * OFFLINE_RATE);
      const offlineZen = Math.floor(zenPerSecond * offlineSeconds * OFFLINE_RATE);

      // Extra safety: ensure values are positive and reasonable
      const safeOfflineExp = (offlineExp > 0 && offlineExp < 1000000000) ? offlineExp : 0;
      const safeOfflineZen = (offlineZen > 0 && offlineZen < 1000000000) ? offlineZen : 0;

      if (safeOfflineExp > 0 || safeOfflineZen > 0) {
        // Calculate new experience
        let newExp = character.experience + BigInt(safeOfflineExp);
        let newZen = character.zen + BigInt(safeOfflineZen);

        // Calculate level ups (max level 400)
        const MAX_LEVEL = 400;
        let newLevel = character.level;

        // Quadratic formula: level² × 3.75 (reduced by 25%)
        while (newExp >= BigInt(Math.floor(newLevel * newLevel * 3.75)) && newLevel < MAX_LEVEL) {
          newExp -= BigInt(Math.floor(newLevel * newLevel * 3.75));
          newLevel++;
        }

        // Cap exp at 0 if max level
        if (newLevel >= MAX_LEVEL) {
          newExp = 0n;
        }

        // Update character with level ups
        await prisma.playerCharacter.update({
          where: { id: character.id },
          data: {
            experience: newExp,
            zen: newZen,
            level: newLevel,
            lastHeartbeat: now,
          },
        });

        // Update local values for response
        character.experience = newExp;
        character.zen = newZen;
        character.level = newLevel;

        offlineRewards = {
          exp: safeOfflineExp,
          zen: safeOfflineZen,
          seconds: offlineSeconds,
        };
      }
    }

    // Calculate upgrade costs
    const upgradeCosts = {
      dmg: calculateUpgradeCost(character.damage, 1).toString(),
      def: calculateUpgradeCost(character.defense, 1).toString(),
      speed: calculateUpgradeCost(character.speedStat, 1).toString(),
      hp: calculateUpgradeCost(character.vitality, 1).toString(),
      zen: calculateUpgradeCost(character.zenMultiplier, 1).toString(),
    };

    return NextResponse.json({
      success: true,
      character: {
        id: character.id,
        name: character.characterName,
        class: character.classType,
        level: character.level,
        experience: character.experience.toString(),
        zen: character.zen.toString(),
        // Stat levels for upgrades
        dmgLevel: character.damage,
        defLevel: character.defense,
        speedLevel: character.speedStat,
        hpLevel: character.vitality,
        zenLevel: character.zenMultiplier,
        // Other
        currentHp: character.currentHp,
        resetCount: character.resetCount,
        monstersKilled: character.monstersKilled,
        deaths: character.deaths,
        totalPlaytime: character.totalPlaytime,
        // Jewels and materials from user account (shared)
        jewelOfBless: user?.jewelOfBless ?? 0,
        jewelOfSoul: user?.jewelOfSoul ?? 0,
        jewelOfLife: user?.jewelOfLife ?? 0,
        jewelOfChaos: user?.jewelOfChaos ?? 0,
        scrollOfArchangel: user?.scrollOfArchangel ?? 0,
        bloodBone: user?.bloodBone ?? 0,
        devilsKey: user?.devilsKey ?? 0,
        devilsEye: user?.devilsEye ?? 0,
        feather: user?.feather ?? 0,
        bloodCastleTicket: user?.bloodCastleTicket ?? 0,
        devilSquareTicket: user?.devilSquareTicket ?? 0,
        // Daily entries per character
        bloodCastleEntriesToday: character.bloodCastleEntriesToday,
        devilSquareEntriesToday: character.devilSquareEntriesToday,
        // Skill cooldowns
        burstCooldownEnd: character.burstCooldownEnd?.toISOString() ?? null,
        // Ascension system
        ascensionPoints: character.ascensionPoints,
        ascDamage: character.ascDamage,
        ascCritical: character.ascCritical,
        ascHealth: character.ascHealth,
        ascLifeSteal: character.ascLifeSteal,
        ascZen: character.ascZen,
        ascExp: character.ascExp,
        ascPoison: character.ascPoison,
        ascExcellent: character.ascExcellent,
      },
      inventory,
      equipment,
      bonuses,
      stats: calculatedStats,
      upgradeCosts,
      offlineRewards,
    });
  } catch (error) {
    console.error('Get game data error:', error);
    return errorResponse('Failed to load game data', 500);
  }
}
