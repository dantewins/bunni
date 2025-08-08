import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withValidNotionToken, notionFetch, dayKeyInTZ, getOrCreateTasksDb, TZ } from '@/lib/notion';

function isYYYYMMDD(s: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function nextDay(yyyyMmDd: string) {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    const y2 = dt.getUTCFullYear();
    const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d2 = String(dt.getUTCDate()).padStart(2, '0');
    return `${y2}-${m2}-${d2}`;
}

function getTimezoneOffsetString(yyyyMmDd: string, tz: string): string {
    const [year, month, day] = yyyyMmDd.split('-').map(Number);
    const utcTime = Date.UTC(year, month - 1, day, 12, 0, 0, 0);
    const date = new Date(utcTime);

    const utcFormatter = new Intl.DateTimeFormat('en', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    });

    const tzFormatter = new Intl.DateTimeFormat('en', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    });

    const utcParts = utcFormatter.formatToParts(date);
    const tzParts = tzFormatter.formatToParts(date);

    function partsToUTC(parts: Intl.DateTimeFormatPart[]): number {
        const get = (type: string) => Number(parts.find(p => p.type === type)!.value);
        const y = get('year');
        const mo = get('month') - 1;
        const d = get('day');
        const h = get('hour');
        const m = get('minute');
        const s = get('second');
        return Date.UTC(y, mo, d, h, m, s);
    }

    const utcMs = partsToUTC(utcParts);
    const tzMs = partsToUTC(tzParts);

    const offsetMs = tzMs - utcMs;
    const offsetMin = Math.round(offsetMs / 60000);
    const absOffsetMin = Math.abs(offsetMin);
    const hours = Math.floor(absOffsetMin / 60);
    const minutes = absOffsetMin % 60;
    const sign = offsetMin >= 0 ? '+' : '-';
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function buildDueDateDayFilter(target: string, tz = TZ) {
    const day = isYYYYMMDD(target) ? target : dayKeyInTZ(new Date(target), tz);
    const next = nextDay(day);

    const offsetStr = getTimezoneOffsetString(day, tz);
    const nextOffsetStr = getTimezoneOffsetString(next, tz);

    const localStart = `${day}T00:00:00${offsetStr}`;
    const localEnd = `${next}T00:00:00${nextOffsetStr}`;
    const utcStart = `${day}T00:00:00+00:00`;
    const utcEnd = `${next}T00:00:00+00:00`;

    const localStartTs = new Date(localStart).getTime();
    const utcStartTs = new Date(utcStart).getTime();
    const localEndTs = new Date(localEnd).getTime();
    const utcEndTs = new Date(utcEnd).getTime();

    const filterStartStr = localStartTs <= utcStartTs ? localStart : utcStart;
    const filterEndStr = localEndTs >= utcEndTs ? localEnd : utcEnd;

    return {
        and: [
            {
                property: 'Due Date',
                date: {
                    on_or_after: filterStartStr,
                },
            },
            {
                property: 'Due Date',
                date: {
                    before: filterEndStr,
                },
            },
        ],
    };
}

function getLocalDay(dateObj: any, tz: string, targetDay: string) {
    if (!dateObj || !dateObj.start) return false;
    const start = dateObj.start;
    if (isYYYYMMDD(start)) {
        return start === targetDay;
    } else {
        const d = new Date(start);
        if (isNaN(d.getTime())) return false;
        const itemDay = dayKeyInTZ(d, tz);
        return itemDay === targetDay;
    }
}

export async function GET(request: Request) {
    const supabase = await createClient();
    const url = new URL(request.url);
    const parentPageId = url.searchParams.get('parentPageId');
    const rawPageId = url.searchParams.get('pageId');
    const dueDateParam = url.searchParams.get('dueDate');
    const userTz = url.searchParams.get('tz') || TZ;

    if (!parentPageId || !rawPageId) {
        return NextResponse.json(
            { error: 'parentPageId and pageId are required' },
            { status: 400 }
        );
    }

    const calendarDatabaseId = rawPageId.replace(
        /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/,
        '$1-$2-$3-$4-$5'
    );

    try {
        const data = await withValidNotionToken(supabase, async (token) => {
            const tasksDb = await getOrCreateTasksDb(token, parentPageId);

            const queryBody: any = {};
            let day: string | undefined;
            if (dueDateParam) {
                queryBody.filter = buildDueDateDayFilter(dueDateParam, userTz);
                day = isYYYYMMDD(dueDateParam) ? dueDateParam : dayKeyInTZ(new Date(dueDateParam), userTz);
            }

            const calendarQuery = await notionFetch(token, `/databases/${calendarDatabaseId}/query`, {
                method: 'POST',
                body: JSON.stringify(queryBody),
            });

            let calendarResults = calendarQuery.results || [];

            if (day) {
                calendarResults = calendarResults.filter((page: any) => {
                    const dueDate = page.properties['Due Date']?.date;
                    return getLocalDay(dueDate, userTz, day!);
                });
            }

            const processedCalendar = await Promise.all(calendarResults.map(async (p: any) => {
                const props = p.properties || {};
                const title =
                    props?.Name?.title?.map((t: any) => t.plain_text).join('') || '';
                const description =
                    props?.Description?.rich_text?.map((t: any) => t.plain_text).join('') || '';
                const due = props?.['Due Date']?.date?.start || null;
                const done = Boolean(props?.Done?.checkbox);

                const subjectId = props?.Subject?.relation?.[0]?.id || null;
                let subjectName = null;
                if (subjectId) {
                    const subjectPage = await notionFetch(token, `/pages/${subjectId}`, {
                        method: 'GET',
                    });
                    subjectName = subjectPage.properties?.Name?.title?.map((t: any) => t.plain_text).join('') || '';
                }

                return {
                    id: p.id,
                    title,
                    description,
                    dueDate: due,
                    done,
                    subjectName,
                    raw: p,
                };
            }));

            const tasksQuery = await notionFetch(token, `/databases/${tasksDb.id}/query`, {
                method: 'POST',
                body: JSON.stringify(queryBody),
            });

            let tasksResults = tasksQuery.results || [];

            if (day) {
                tasksResults = tasksResults.filter((page: any) => {
                    const dueDate = page.properties['Due Date']?.date;
                    return getLocalDay(dueDate, userTz, day!);
                });
            }

            const processedTasks = tasksResults.map((p: any) => {
                const props = p.properties || {};
                const title =
                    props?.Name?.title?.map((t: any) => t.plain_text).join('') || '';
                const description =
                    props?.Description?.rich_text?.map((t: any) => t.plain_text).join('') || '';
                const due = props?.['Due Date']?.date?.start || null;
                const done = Boolean(props?.Done?.checkbox);

                return {
                    id: p.id,
                    title,
                    description,
                    dueDate: due,
                    done,
                    subjectName: 'Task',
                    raw: p,
                };
            });

            const combinedItems = [...processedCalendar, ...processedTasks];

            return {
                items: combinedItems,
                has_more: calendarQuery.has_more || tasksQuery.has_more,
                next_cursor: null,
            };
        });

        return NextResponse.json(data, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}