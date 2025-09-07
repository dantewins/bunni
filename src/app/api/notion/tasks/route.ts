import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { withValidNotionToken, fetchNotionDb, createNotionObject } from "@/lib/notion"
import { buildDueDateProp } from "@/lib/date"

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);

        if (!userId) throw new Error('Unauthorized');

        const { title, description, dueDate, time, parentPageId } = await request.json()

        if (!title || !parentPageId) {
            return NextResponse.json(
                { error: "title and parentPageId are required" },
                { status: 400 }
            )
        }
        const page = await withValidNotionToken(userId, async (token) => {
            let db = await fetchNotionDb(token, "Tasks")

            if (!db) {
                db = await createNotionObject(token, parentPageId, "Tasks", {
                    Name: { title: {} },
                    Description: { rich_text: {} },
                    "Due Date": { date: {} },
                    Done: { checkbox: {} },
                }, true)
            }

            return createNotionObject(token, db.id, String(title), {
                Description: description
                    ? { rich_text: [{ type: "text", text: { content: String(description) } }] }
                    : { rich_text: [] },
                "Due Date": buildDueDateProp(dueDate, time),
                Done: { checkbox: false },
            }, false, { type: "external", external: { url: "https://www.notion.so/icons/checkmark-square_gray.svg" } })
        })

        return NextResponse.json({ ok: true, page }, { status: 200 })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}