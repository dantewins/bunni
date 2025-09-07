import { prisma } from "@/lib/prisma"

export const NOTION_API = "https://api.notion.com/v1"
const NOTION_VERSION = "2022-06-28"

export const undash = (id: string) => id.replace(/-/g, '').toLowerCase();
export const dash = (id: string) => {
    const m = undash(id).match(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i);
    return m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}-${m[5]}` : id;
};

export async function notionFetch<T = any>(token: string, path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${NOTION_API}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
    })

    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        const err: any = new Error(errBody?.message || res.statusText)
            ; (err as any).status = res.status
            ; (err as any).body = errBody
        throw err
    }

    return res.json()
}

type NotionTokenResponse = {
    access_token: string
    refresh_token?: string
    expires_in?: number
    workspace_id?: string
    bot_id?: string
}

export async function refreshNotionToken(refreshToken: string): Promise<NotionTokenResponse> {
    const { NOTION_CLIENT_ID, NOTION_CLIENT_SECRET } = process.env
    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) throw new Error("Missing Notion OAuth client credentials")

    const basic = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString("base64")

    const res = await fetch(`${NOTION_API}/oauth/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    })

    if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        const err: any = new Error(b?.message || "Failed to refresh Notion token")
        err.body = b
        throw err
    }

    return res.json()
}

export async function getValidNotionAccessToken(userId: string): Promise<string> {
    const conn = await prisma.notionConnection.findUnique({ where: { userId } })
    if (!conn) throw new Error("Notion not connected")

    const needsRefresh = !!conn.expiresAt && conn.expiresAt.getTime() - Date.now() < 2 * 60 * 1000

    if (!needsRefresh) return conn.accessToken

    if (!conn.refreshToken) return conn.accessToken

    const fresh = await refreshNotionToken(conn.refreshToken)

    const newExpiresAt = fresh.expires_in ? new Date(Date.now() + fresh.expires_in * 1000) : null
    await prisma.notionConnection.update({
        where: { userId },
        data: {
            accessToken: fresh.access_token,
            refreshToken: fresh.refresh_token ?? conn.refreshToken,
            expiresAt: newExpiresAt,
            workspaceId: fresh.workspace_id ?? conn.workspaceId,
            botId: fresh.bot_id ?? conn.botId,
        },
    })

    return fresh.access_token
}

export async function withValidNotionToken<T>(
    userId: string,
    fn: (token: string) => Promise<T>
): Promise<T> {
    let token = await getValidNotionAccessToken(userId)

    try {
        return await fn(token)
    } catch (err: any) {
        if (err?.status === 401) {
            const conn = await prisma.notionConnection.findUnique({ where: { userId } })
            if (conn?.refreshToken) {
                const fresh = await refreshNotionToken(conn.refreshToken)
                const newExpiresAt = fresh.expires_in ? new Date(Date.now() + fresh.expires_in * 1000) : null

                await prisma.notionConnection.update({
                    where: { userId },
                    data: {
                        accessToken: fresh.access_token,
                        refreshToken: fresh.refresh_token ?? conn.refreshToken,
                        expiresAt: newExpiresAt,
                        workspaceId: fresh.workspace_id ?? conn.workspaceId,
                        botId: fresh.bot_id ?? conn.botId,
                    },
                })

                return await fn(fresh.access_token)
            }
        }
        throw err
    }
}

export async function getAllNotionPages(token: string, dbId: string, filter?: any) {
    let hasMore = true;
    let nextCursor: string | undefined;
    const results: any[] = [];
    while (hasMore) {
        const body = {
            ...(filter ? { filter } : {}),
            ...(nextCursor ? { start_cursor: nextCursor } : {}),
        };
        const res = await notionFetch<any>(token, `/databases/${dash(dbId)}/query`, { method: 'POST', body: JSON.stringify(body) });
        results.push(...res.results);
        hasMore = res.has_more;
        nextCursor = res.next_cursor;
    }
    return results;
}

export async function fetchNotionPage(token: string, pageId: string) {
    return notionFetch<any>(token, `/pages/${dash(pageId)}`, { method: "GET" })
}

export async function createNotionObject(token: string, parentId: string, title: string, properties: any, isDb: boolean = false, icon?: any) {
    const isParentDb = !isDb;
    const endpoint = isDb ? '/databases' : '/pages';
    const parentType = isParentDb ? 'database_id' : 'page_id';
    const parentKey = isParentDb ? 'database_id' : 'page_id';

    const body: any = {
        parent: { type: parentType, [parentKey]: dash(parentId) },
        properties,
    };

    if (isDb) {
        body.title = [{ type: "text", text: { content: title } }];
    } else {
        if (!properties.Name) {
            properties.Name = { title: [{ type: "text", text: { content: title } }] };
        }

        if (icon) {
            body.icon = icon;
        }
    }

    return notionFetch<any>(token, endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function fetchNotionDb(token: string, identifier: string): Promise<any | null> {
    const isId = /^[0-9a-fA-F]{32}$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    if (isId) {
        const dbId = dash(identifier)
        return notionFetch<any>(token, `/databases/${dbId}`, { method: "GET" });
    } else {
        const search = await notionFetch(token, "/search", {
            method: "POST",
            body: JSON.stringify({
                query: identifier,
                filter: { value: "database", property: "object" },
                sort: { direction: "descending", timestamp: "last_edited_time" },
            }),
        });

        const existing = (search as any).results?.find(
            (r: any) => r.object === "database" && (r.title?.[0]?.plain_text || "").trim() === identifier
        );

        return existing || null;
    }
}