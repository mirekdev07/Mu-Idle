import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '50', 10), 1), 100);

  try {
    const characters = await prisma.playerCharacter.findMany({
      take: limit,
      orderBy: [
        { resetCount: 'desc' },
        { level: 'desc' },
        { experience: 'desc' },
      ],
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    const ranking = characters.map((char, index) => ({
      rank: index + 1,
      characterName: char.characterName,
      username: char.user.username,
      classType: char.classType,
      level: char.level,
      resetCount: char.resetCount,
      monstersKilled: char.monstersKilled,
      deaths: char.deaths,
    }));

    return NextResponse.json({
      success: true,
      ranking,
    });
  } catch (error) {
    console.error('Ranking error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load ranking' },
      { status: 500 }
    );
  }
}
