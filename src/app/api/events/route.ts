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

    const now = new Date();
    const lastReset = character.lastEventResetDate;
    const needsReset = !lastReset || !isSameDay(lastReset, now);

    // Reset daily entries if it's a new day
    let bloodCastleEntries = needsReset ? 0 : character.bloodCastleEntriesToday;
    let devilSquareEntries = needsReset ? 0 : character.devilSquareEntriesToday;

    const eventType = event_type as EventType;

    // Check ticket availability
    if (eventType === 'blood_castle') {
      if (character.bloodCastleTicket < 1) {
        return errorResponse('No Blood Castle Ticket available');
      }
      if (bloodCastleEntries >= MAX_DAILY_ENTRIES) {
        return errorResponse('Daily entry limit reached (2/2)');
      }
    } else {
      if (character.devilSquareTicket < 1) {
        return errorResponse('No Devil Square Ticket available');
      }
      if (devilSquareEntries >= MAX_DAILY_ENTRIES) {
        return errorResponse('Daily entry limit reached (2/2)');
      }
    }

    // Consume ticket and increment entries
    const updateData: Record<string, unknown> = {
      lastEventResetDate: now,
    };

    if (needsReset) {
      updateData.bloodCastleEntriesToday = 0;
      updateData.devilSquareEntriesToday = 0;
    }

    if (eventType === 'blood_castle') {
      updateData.bloodCastleTicket = { decrement: 1 };
      updateData.bloodCastleEntriesToday = (needsReset ? 0 : bloodCastleEntries) + 1;
    } else {
      updateData.devilSquareTicket = { decrement: 1 };
      updateData.devilSquareEntriesToday = (needsReset ? 0 : devilSquareEntries) + 1;
    }

    const updated = await prisma.playerCharacter.update({
      where: { id: character.id },
      data: updateData,
      select: {
        bloodCastleTicket: true,
        devilSquareTicket: true,
        bloodCastleEntriesToday: true,
        devilSquareEntriesToday: true,
      },
    });

    return NextResponse.json({
      success: true,
      tickets: {
        bloodCastle: updated.bloodCastleTicket,
        devilSquare: updated.devilSquareTicket,
      },
      entries: {
        bloodCastle: updated.bloodCastleEntriesToday,
        devilSquare: updated.devilSquareEntriesToday,
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

    const now = new Date();
    const lastReset = character.lastEventResetDate;
    const needsReset = !lastReset || !isSameDay(lastReset, now);

    // If it's a new day, entries should show as 0
    const bloodCastleEntries = needsReset ? 0 : character.bloodCastleEntriesToday;
    const devilSquareEntries = needsReset ? 0 : character.devilSquareEntriesToday;

    return NextResponse.json({
      success: true,
      tickets: {
        bloodCastle: character.bloodCastleTicket,
        devilSquare: character.devilSquareTicket,
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
