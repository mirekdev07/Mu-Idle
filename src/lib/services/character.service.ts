import prisma from '@/lib/prisma';
import { CharacterClass } from '@/types/game';

export interface CreateCharacterData {
  userId: number;
  characterName: string;
  classType: CharacterClass;
}

export async function getCharactersByUserId(userId: number) {
  return prisma.playerCharacter.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCharacterById(characterId: number, userId: number) {
  return prisma.playerCharacter.findFirst({
    where: { id: characterId, userId },
  });
}

export async function getLatestCharacter(userId: number) {
  return prisma.playerCharacter.findFirst({
    where: { userId },
    orderBy: { lastPlayed: 'desc' },
  });
}

export async function createCharacter(data: CreateCharacterData) {
  // Check if character name already exists for this user
  const existing = await prisma.playerCharacter.findFirst({
    where: {
      userId: data.userId,
      characterName: data.characterName,
    },
  });

  if (existing) {
    throw new Error('Character name already exists');
  }

  return prisma.playerCharacter.create({
    data: {
      userId: data.userId,
      characterName: data.characterName,
      classType: data.classType,
      level: 1,
      experience: 0n,
      zen: 0n,
      // All stats start at 1
      damage: 1,
      defense: 1,
      vitality: 1,
      speedStat: 1,
      currentHp: null, // Will be calculated on first load
    },
  });
}

export async function updateCharacterProgress(
  characterId: number,
  data: {
    level?: number;
    experience?: bigint;
    zen?: bigint;
    monstersKilled?: number;
    totalPlaytime?: number;
  }
) {
  return prisma.playerCharacter.update({
    where: { id: characterId },
    data: {
      ...data,
      lastPlayed: new Date(),
    },
  });
}

export async function updateCurrentHp(characterId: number, hp: number) {
  return prisma.playerCharacter.update({
    where: { id: characterId },
    data: { currentHp: hp },
  });
}

export async function resetCharacter(
  characterId: number
): Promise<{ success: boolean; message?: string; newResetCount?: number }> {
  const character = await prisma.playerCharacter.findUnique({
    where: { id: characterId },
  });

  if (!character) {
    return { success: false, message: 'Character not found' };
  }

  if (character.level < 400) {
    return { success: false, message: 'Character must be level 400+ to reset' };
  }

  // 2 million zen × reset number (1st reset = 2M, 2nd = 4M, 3rd = 6M, etc.)
  const newResetNumber = character.resetCount + 1;
  const RESET_ZEN_BONUS = BigInt(2000000 * newResetNumber);

  const updated = await prisma.playerCharacter.update({
    where: { id: characterId },
    data: {
      level: 1,
      experience: 0n,
      // Stats are kept after reset (DMG, DEF, Speed, HP, Zen%)
      // Add zen bonus (2M × reset number)
      zen: character.zen + RESET_ZEN_BONUS,
      // Increment reset count
      resetCount: { increment: 1 },
      // Grant 1 Ascension Point per reset
      ascensionPoints: { increment: 1 },
      currentHp: null,
      // Reset heartbeat and rates to prevent offline rewards after reset
      lastHeartbeat: new Date(),
      lastExpPerSecond: 0,
      lastZenPerSecond: 0,
    },
  });

  return { success: true, newResetCount: updated.resetCount };
}

export async function deleteCharacter(characterId: number, userId: number) {
  // Verify ownership
  const character = await prisma.playerCharacter.findFirst({
    where: { id: characterId, userId },
  });

  if (!character) {
    return { success: false, message: 'Character not found' };
  }

  await prisma.playerCharacter.delete({
    where: { id: characterId },
  });

  return { success: true };
}

// Experience required for next level (quadratic formula - slower progression)
export function getExpForLevel(level: number): bigint {
  // Quadratic formula: level² × 3.75 (reduced by 25%)
  // Level 1: 3 EXP, Level 100: 37,500 EXP, Level 400: 600,000 EXP
  return BigInt(Math.floor(level * level * 3.75));
}

// Calculate how many level ups and remaining exp
export function calculateLevelUp(
  currentLevel: number,
  currentExp: bigint,
  maxLevel: number = 400
): { newLevel: number; remainingExp: bigint } {
  let level = currentLevel;
  let exp = currentExp;

  while (level < maxLevel) {
    const expNeeded = getExpForLevel(level);
    if (exp >= expNeeded) {
      exp -= expNeeded;
      level++;
    } else {
      break;
    }
  }

  return { newLevel: level, remainingExp: exp };
}
