import { NextResponse } from "next/server"
import { requireUserId } from "@/lib/auth"
import { withValidNotionToken, notionFetch, dayKeyInTZ, getOrCreateTasksDb, TZ } from "@/lib/notion"
import { isYYYYMMDD, buildDueDateDayFilter, getLocalDay } from "@/lib/date"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    let userId: string
    try {
        userId = await requireUserId()
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const parentPageId = url.searchParams.get("parentPageId")
    const rawPageId = url.searchParams.get("pageId")
    const dueDateParam = url.searchParams.get("dueDate")
    const userTz = (url.searchParams.get("tz") as string) || TZ

    if (!parentPageId || !rawPageId) {
        return NextResponse.json(
            { error: "parentPageId and pageId are required" },
            { status: 400 }
        )
    }

    const calendarDatabaseId = rawPageId.replace(
        /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/,
        "$1-$2-$3-$4-$5"
    )

    try {
        const data = await withValidNotionToken(userId, async (token) => {
            const tasksDb = await getOrCreateTasksDb(token, parentPageId)

            const queryBody: any = {}
            let day: string | undefined
            if (dueDateParam) {
                queryBody.filter = buildDueDateDayFilter(dueDateParam, userTz);
                day = isYYYYMMDD(dueDateParam) ? dueDateParam : dayKeyInTZ(new Date(dueDateParam), userTz);
            }

            const calendarQuery = await notionFetch(token, `/databases/${calendarDatabaseId}/query`, {
                method: "POST",
                body: JSON.stringify(queryBody),
            })
            let calendarResults = (calendarQuery as any).results || []

            if (day) {
                calendarResults = calendarResults.filter((page: any) => {
                    const dueDate = page.properties["Due Date"]?.date;
                    return getLocalDay(dueDate, userTz, day);
                });
            }

            const processedCalendar = await Promise.all(
                calendarResults.map(async (p: any) => {
                    const props = p.properties || {}
                    const title = props?.Name?.title?.map((t: any) => t.plain_text).join("") || ""
                    const description =
                        props?.Description?.rich_text?.map((t: any) => t.plain_text).join("") || ""
                    const due = props?.["Due Date"]?.date?.start || null
                    const done = Boolean(props?.Done?.checkbox)

                    const subjectId = props?.Subject?.relation?.[0]?.id || null
                    let subjectName = null
                    if (subjectId) {
                        const subjectPage = await notionFetch(token, `/pages/${subjectId}`, { method: "GET" })
                        subjectName =
                            subjectPage.properties?.Name?.title?.map((t: any) => t.plain_text).join("") || ""
                    }

                    return {
                        id: p.id,
                        title,
                        description,
                        dueDate: due,
                        done,
                        subjectName,
                        raw: p,
                    }
                })
            )

            const tasksQuery = await notionFetch(token, `/databases/${tasksDb.id}/query`, {
                method: "POST",
                body: JSON.stringify(queryBody),
            })
            let tasksResults = (tasksQuery as any).results || []

            if (day) {
                tasksResults = tasksResults.filter((page: any) => {
                    const dueDate = page.properties["Due Date"]?.date
                    return getLocalDay(dueDate, userTz, day!)
                })
            }

            const processedTasks = tasksResults.map((p: any) => {
                const props = p.properties || {}
                const title = props?.Name?.title?.map((t: any) => t.plain_text).join("") || ""
                const description =
                    props?.Description?.rich_text?.map((t: any) => t.plain_text).join("") || ""
                const due = props?.["Due Date"]?.date?.start || null
                const done = Boolean(props?.Done?.checkbox)

                return {
                    id: p.id,
                    title,
                    description,
                    dueDate: due,
                    done,
                    subjectName: "Task",
                    raw: p,
                }
            })

            const combinedItems = [...processedCalendar, ...processedTasks]

            return {
                items: combinedItems,
                has_more: (calendarQuery as any).has_more || (tasksQuery as any).has_more,
                next_cursor: null,
            }
        })

        return NextResponse.json(data, { status: 200 })
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
    }
}