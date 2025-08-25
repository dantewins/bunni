import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const connection = await prisma.notionConnection.findUnique({
            where: { userId },
            select: { parentPageId: true, calendarDatabaseId: true },
        });
        return NextResponse.json({
            parentPageId: connection?.parentPageId || '',
            calendarDatabaseId: connection?.calendarDatabaseId || '',
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}