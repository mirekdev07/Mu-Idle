import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import { getInventory } from '@/lib/services/inventory.service';
import { getEquipment, getEquipmentBonuses } from '@/lib/services/equipment.service';
import { calculateStats } from '@/lib/services/stats.service';
import prisma from '@/lib/prisma';

// Offline rewards constants
const OFFLINE_RATE = 0.20; // 20% of normal production
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
    const [inventory, equipment, bonuses] = await Promise.all([
      getInventory(character.id),
      getEquipment(character.id),
      getEquipmentBonuses(character.id),
    ]);

    // Calculate stats
    const calculatedStats = calculateStats(
      {
        id: character.id,
        level: character.level,
        damage: character.damage,
        defense: character.defense,
        vitality: character.vitality,
        blockStat: character.blockStat,
        attackSpeedStat: character.attackSpeedStat,
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
        let newPoints = character.levelupPoints;

        while (newExp >= BigInt(newLevel * 100) && newLevel < MAX_LEVEL) {
          newExp -= BigInt(newLevel * 100);
          newLevel++;
          newPoints += 5;
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
            levelupPoints: newPoints,
            lastHeartbeat: now,
          },
        });

        // Update local values for response
        character.experience = newExp;
        character.zen = newZen;
        character.level = newLevel;
        character.levelupPoints = newPoints;

        offlineRewards = {
          exp: safeOfflineExp,
          zen: safeOfflineZen,
          seconds: offlineSeconds,
        };
      }
    }

    return NextResponse.json({
      success: true,
      character: {
        id: character.id,
        name: character.characterName,
        class: character.classType,
        level: character.level,
        experience: character.experience.toString(),
        zen: character.zen.toString(),
        damage: character.damage,
        defense: character.defense,
        vitality: character.vitality,
        blockStat: character.blockStat,
        attackSpeedStat: character.attackSpeedStat,
        levelupPoints: character.levelupPoints,
        currentHp: character.currentHp,
        resetCount: character.resetCount,
        monstersKilled: character.monstersKilled,
        deaths: character.deaths,
        totalPlaytime: character.totalPlaytime,
        jewelOfBless: character.jewelOfBless,
        jewelOfSoul: character.jewelOfSoul,
        jewelOfLife: character.jewelOfLife,
        jewelOfChaos: character.jewelOfChaos,
        scrollOfArchangel: character.scrollOfArchangel,
        bloodBone: character.bloodBone,
        devilsKey: character.devilsKey,
        devilsEye: character.devilsEye,
        bloodCastleTicket: character.bloodCastleTicket,
        devilSquareTicket: character.devilSquareTicket,
        bloodCastleEntriesToday: character.bloodCastleEntriesToday,
        devilSquareEntriesToday: character.devilSquareEntriesToday,
      },
      inventory,
      equipment,
      bonuses,
      stats: calculatedStats,
      offlineRewards,
    });
  } catch (error) {
    console.error('Get game data error:', error);
    return errorResponse('Failed to load game data', 500);
  }
}
