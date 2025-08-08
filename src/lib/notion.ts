import { SupabaseClient } from '@supabase/supabase-js';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const HHMM = /^\d{2}:\d{2}$/;

export async function notionFetch<T = any>(token: string, path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${NOTION_API}${path}`, {
        ...init,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });

    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const err: any = new Error(errBody?.message || res.statusText);
        err.status = res.status;
        err.body = errBody;
        throw err;
    }

    return res.json();
}

async function refreshNotionToken(refreshToken: string) {
    const { NOTION_CLIENT_ID, NOTION_CLIENT_SECRET } = process.env;

    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
        throw new Error('Missing Notion OAuth client credentials');
    }

    const basic = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64');

    const res = await fetch(`${NOTION_API}/oauth/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        const err: any = new Error(b?.message || 'Failed to refresh Notion token');
        err.body = b;
        throw err;
    }

    return res.json() as Promise<{ access_token: string; refresh_token: string; }>;
}

export async function withValidNotionToken<T>(supabase: SupabaseClient, fn: (token: string) => Promise<T>): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();

    if (!session || !user) {
        throw new Error('No Supabase session');
    }

    let accessToken: string | undefined = session.provider_token || (user.user_metadata as any)?.notion_access_token;
    let refreshToken: string | undefined = session.provider_refresh_token || (user.user_metadata as any)?.notion_refresh_token;

    if (!accessToken) throw new Error('Missing Notion access token');

    try { return await fn(accessToken); } catch (err: any) {
        if (err.status === 401 && refreshToken) {
            const fresh = await refreshNotionToken(refreshToken);
            accessToken = fresh.access_token;
            refreshToken = fresh.refresh_token;

            await supabase.auth.updateUser({
                data: {
                    notion_access_token: accessToken,
                    notion_refresh_token: refreshToken,
                },
            });

            return await fn(accessToken);
        }

        throw err;
    }
}

export function dayKeyInTZ(d: Date, tz = TZ) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(d);
    const get = (t: string) => parts.find(p => p.type === t)?.value!;
    return `${get('year')}-${get('month')}-${get('day')}`;
}

export function getCurrentDay(tz = TZ) {
    return dayKeyInTZ(new Date(), tz);
}

export function buildDueDateProp(dueDate?: string, time?: string) {
    if (!dueDate && !time) return { date: null };

    const dateStr = dueDate || getCurrentDay();

    if (time && HHMM.test(time)) {
        return { date: { start: `${dateStr}T${time}:00`, time_zone: TZ } };
    }

    return { date: { start: dateStr } };
}

export async function getOrCreateTasksDb(token: string, parentPageId: string) {
    const search = await notionFetch(token, '/search', {
        method: 'POST',
        body: JSON.stringify({
            query: 'Tasks',
            filter: { value: 'database', property: 'object' },
            sort: { direction: 'descending', timestamp: 'last_edited_time' },
        }),
    });

    const existing = (search.results || []).find(
        (r: any) =>
            r.object === 'database' &&
            (r.title?.[0]?.plain_text || '').trim() === 'Tasks'
    );
    if (existing) return existing;

    return notionFetch(token, '/databases', {
        method: 'POST',
        body: JSON.stringify({
            parent: { type: 'page_id', page_id: parentPageId },
            title: [{ type: 'text', text: { content: 'Tasks' } }],
            properties: {
                Name: { title: {} },
                Description: { rich_text: {} },
                'Due Date': { date: {} },
                Done: { checkbox: {} },
            },
        }),
    });
}