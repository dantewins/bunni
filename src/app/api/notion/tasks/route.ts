import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { withValidNotionToken, notionFetch, getOrCreateTasksDb } from "@/lib/notion"
import { buildDueDateProp } from "@/lib/date"

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);

        const { title, description, dueDate, time, parentPageId } = await request.json()

        if (!title || !parentPageId) {
            return NextResponse.json(
                { error: "title and parentPageId are required" },
                { status: 400 }
            )
        }
        const page = await withValidNotionToken(userId!, async (token) => {
            const db = await getOrCreateTasksDb(token, parentPageId)

            return notionFetch(token, "/pages", {
                method: "POST",
                body: JSON.stringify({
                    parent: { database_id: db.id },
                    properties: {
                        Name: { title: [{ type: "text", text: { content: String(title) } }] },
                        Description: description
                            ? { rich_text: [{ type: "text", text: { content: String(description) } }] }
                            : { rich_text: [] },
                        "Due Date": buildDueDateProp(dueDate, time),
                        Done: { checkbox: false },
                    },
                }),
            })
        })

        return NextResponse.json({ ok: true, page }, { status: 200 })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
