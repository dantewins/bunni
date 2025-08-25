import { prisma } from "@/lib/prisma"

const NOTION_API = "https://api.notion.com/v1"
const NOTION_VERSION = "2022-06-28"

export const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone
const HHMM = /^\d{2}:\d{2}$/

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

export function dayKeyInTZ(d: Date, tz = TZ) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(d)
    const get = (t: string) => parts.find((p) => p.type === t)?.value!
    return `${get("year")}-${get("month")}-${get("day")}`
}

export function getCurrentDay(tz = TZ) {
    return dayKeyInTZ(new Date(), tz)
}

export function buildDueDateProp(dueDate?: string, time?: string) {
    if (!dueDate && !time) return { date: null }

    const dateStr = dueDate || getCurrentDay()

    if (time && HHMM.test(time)) {
        return { date: { start: `${dateStr}T${time}:00`, time_zone: TZ } }
    }
    return { date: { start: dateStr } }
}

export async function getOrCreateTasksDb(token: string, parentPageId: string) {
    const search = await notionFetch(token, "/search", {
        method: "POST",
        body: JSON.stringify({
            query: "Tasks",
            filter: { value: "database", property: "object" },
            sort: { direction: "descending", timestamp: "last_edited_time" },
        }),
    })

    const existing = (search as any).results?.find(
        (r: any) => r.object === "database" && (r.title?.[0]?.plain_text || "").trim() === "Tasks"
    )
    if (existing) return existing

    return notionFetch(token, "/databases", {
        method: "POST",
        body: JSON.stringify({
            parent: { type: "page_id", page_id: parentPageId },
            title: [{ type: "text", text: { content: "Tasks" } }],
            properties: {
                Name: { title: {} },
                Description: { rich_text: {} },
                "Due Date": { date: {} },
                Done: { checkbox: {} },
            },
        }),
    })
}
