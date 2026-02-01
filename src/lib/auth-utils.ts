import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUserId(): Promise<number | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return parseInt(session.user.id, 10);
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, message: 'Unauthorized' },
    { status: 401 }
  );
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export function successResponse<T>(data: T) {
  return NextResponse.json({ success: true, ...data });
}
