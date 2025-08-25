import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notionFetch, withValidNotionToken } from '@/lib/notion';
import { getCurrentUserId } from '@/lib/auth';

const undash = (id: string) => id.replace(/-/g, '').toLowerCase();
const dash = (id: string) => {
    const m = undash(id).match(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i);
    return m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}-${m[5]}` : id;
};

export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId(request);
        const connection = await prisma.notionConnection.findUnique({ where: { userId } });
        console.log(connection)
        if (!connection) {
            return NextResponse.json({ error: 'No Notion connection found' }, { status: 401 });
        }

        const body = await request.json();
        let { parentPageId, calendarDatabaseId } = body;
        if (!parentPageId || !calendarDatabaseId) {
            return NextResponse.json({ error: 'parentPageId and calendarDatabaseId are required' }, { status: 400 });
        }

        await withValidNotionToken(connection.userId, async (token) => {
            const parentIdDashed = dash(parentPageId);
            const dbIdDashed = dash(calendarDatabaseId);
            await notionFetch(token, `/pages/${parentIdDashed}`);
            const db = await notionFetch<any>(token, `/databases/${dbIdDashed}`);
            let parent = db.parent;
            if (parent.type === 'block_id') {
                let block = await notionFetch<any>(token, `/blocks/${parent.block_id}`);
                while (block.parent && block.parent.type === 'block_id') {
                    block = await notionFetch<any>(token, `/blocks/${block.parent.block_id}`);
                }
                parent = block.parent;
            }
            if (parent.type === 'workspace') {
                throw new Error('Calendar database is in the workspace, not under a page');
            }
            if (parent.type !== 'page_id') {
                throw new Error(`Unsupported parent type '${parent.type}' for calendar database (must be under a page)`);
            }
            if (undash(parent.page_id) !== undash(parentIdDashed)) {
                throw new Error('Calendar database is not a child of the provided parent page');
            }
            const props = db.properties;
            if (props?.Name?.type !== 'title') throw new Error('Missing or incorrect "Name" (title) property');
            if (props?.['Due Date']?.type !== 'date') throw new Error('Missing or incorrect "Due Date" (date) property');
            if (props?.Done?.type !== 'checkbox') throw new Error('Missing or incorrect "Done" (checkbox) property');
            if (props?.Description?.type !== 'rich_text') throw new Error('Missing or incorrect "Description" (rich_text) property');
            if (!props?.Subject || props.Subject.type !== 'relation') {
                throw new Error('Missing or incorrect "Subject" (relation) property');
            }
            const subjectDbIdDashed = dash(props.Subject.relation.database_id);
            const subjectDb = await notionFetch<any>(token, `/databases/${subjectDbIdDashed}`);
            const subjectProps = subjectDb.properties;
            if (!subjectProps?.Name || subjectProps.Name.type !== 'title') {
                throw new Error('Missing or incorrect "Name" (title) property in the related Subjects database');
            }
            await prisma.notionConnection.update({
                where: { userId },
                data: {
                    parentPageId: undash(parentIdDashed),
                    calendarDatabaseId: undash(dbIdDashed),
                },
            });
        });
        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}