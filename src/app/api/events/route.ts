import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, unauthorizedResponse, errorResponse } from '@/lib/auth-utils';
import { getCharacterById, getLatestCharacter } from '@/lib/services/character.service';
import prisma from '@/lib/prisma';

const MAX_DAILY_ENTRIES = 2;

type EventType = 'blood_castle' | 'devil_square';

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// POST - Start an event (consume ticket, increment daily entries)
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { character_id, event_type } = body;

    if (!event_type || !['blood_castle', 'devil_square'].includes(event_type)) {
      return errorResponse('Invalid event type');
    }

    let character;
    if (character_id) {
      character = await getCharacterById(character_id, userId);
    }
    if (!character) {
      character = await getLatestCharacter(userId);
    }
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Get user's tickets (account-wide)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bloodCastleTicket: true,
        devilSquareTicket: true,
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    const now = new Date();
    const lastReset = character.lastEventResetDate;
    const needsReset = !lastReset || !isSameDay(lastReset, now);

    // Reset daily entries if it's a new day (per character)
    let bloodCastleEntries = needsReset ? 0 : character.bloodCastleEntriesToday;
    let devilSquareEntries = needsReset ? 0 : character.devilSquareEntriesToday;

    const eventType = event_type as EventType;

    // Check ticket availability (from user account)
    if (eventType === 'blood_castle') {
      if (user.bloodCastleTicket < 1) {
        return errorResponse('No Blood Castle Ticket available');
      }
      if (bloodCastleEntries >= MAX_DAILY_ENTRIES) {
        return errorResponse('Daily entry limit reached (2/2)');
      }
    } else {
      if (user.devilSquareTicket < 1) {
        return errorResponse('No Devil Square Ticket available');
      }
      if (devilSquareEntries >= MAX_DAILY_ENTRIES) {
        return errorResponse('Daily entry limit reached (2/2)');
      }
    }

    // Update character daily entries
    const characterUpdateData: Record<string, unknown> = {
      lastEventResetDate: now,
    };

    if (needsReset) {
      characterUpdateData.bloodCastleEntriesToday = 0;
      characterUpdateData.devilSquareEntriesToday = 0;
    }

    if (eventType === 'blood_castle') {
      characterUpdateData.bloodCastleEntriesToday = (needsReset ? 0 : bloodCastleEntries) + 1;
    } else {
      characterUpdateData.devilSquareEntriesToday = (needsReset ? 0 : devilSquareEntries) + 1;
    }

    // Update user tickets and character entries in parallel
    const [updatedUser, updatedCharacter] = await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: {
          [eventType === 'blood_castle' ? 'bloodCastleTicket' : 'devilSquareTicket']: { decrement: 1 },
        },
        select: {
          bloodCastleTicket: true,
          devilSquareTicket: true,
        },
      }),
      prisma.playerCharacter.update({
        where: { id: character.id },
        data: characterUpdateData,
        select: {
          bloodCastleEntriesToday: true,
          devilSquareEntriesToday: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      tickets: {
        bloodCastle: updatedUser.bloodCastleTicket,
        devilSquare: updatedUser.devilSquareTicket,
      },
      entries: {
        bloodCastle: updatedCharacter.bloodCastleEntriesToday,
        devilSquare: updatedCharacter.devilSquareEntriesToday,
      },
      maxEntries: MAX_DAILY_ENTRIES,
    });
  } catch (error) {
    console.error('Event start error:', error);
    return errorResponse('Server error', 500);
  }
}

// GET - Get event status (tickets, daily entries)
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('character_id');

    let character;
    if (characterId) {
      character = await getCharacterById(parseInt(characterId), userId);
    }
    if (!character) {
      character = await getLatestCharacter(userId);
    }
    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Get user's tickets (account-wide)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bloodCastleTicket: true,
        devilSquareTicket: true,
      },
    });

    const now = new Date();
    const lastReset = character.lastEventResetDate;
    const needsReset = !lastReset || !isSameDay(lastReset, now);

    // If it's a new day, entries should show as 0 (per character)
    const bloodCastleEntries = needsReset ? 0 : character.bloodCastleEntriesToday;
    const devilSquareEntries = needsReset ? 0 : character.devilSquareEntriesToday;

    return NextResponse.json({
      success: true,
      tickets: {
        bloodCastle: user?.bloodCastleTicket ?? 0,
        devilSquare: user?.devilSquareTicket ?? 0,
      },
      entries: {
        bloodCastle: bloodCastleEntries,
        devilSquare: devilSquareEntries,
      },
      maxEntries: MAX_DAILY_ENTRIES,
    });
  } catch (error) {
    console.error('Event status error:', error);
    return errorResponse('Server error', 500);
  }
}
