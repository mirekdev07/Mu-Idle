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
): Promise<{ success: boolean; message?: string }> {
  const character = await prisma.playerCharacter.findUnique({
    where: { id: characterId },
  });

  if (!character) {
    return { success: false, message: 'Character not found' };
  }

  if (character.level < 400) {
    return { success: false, message: 'Character must be level 400+ to reset' };
  }

  await prisma.playerCharacter.update({
    where: { id: characterId },
    data: {
      level: 1,
      experience: 0n,
      // Stats are NOT reset - they are purchased with zen
      resetCount: { increment: 1 },
      currentHp: null,
      // Reset heartbeat and rates to prevent offline rewards after reset
      lastHeartbeat: new Date(),
      lastExpPerSecond: 0,
      lastZenPerSecond: 0,
    },
  });

  return { success: true };
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

// Experience required for next level (exponential formula)
export function getExpForLevel(level: number): bigint {
  // Simple exponential formula: base * level^2 * multiplier
  const base = 100n;
  const levelBigInt = BigInt(level);
  return base * levelBigInt * levelBigInt;
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
