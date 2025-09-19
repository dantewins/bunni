import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { linkCanvas } from "@/lib/canvas"

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);

        if (!userId) throw new Error('Unauthorized');

        const url = new URL(request.url)
        const parentPageId = url.searchParams.get("parentPageId")
        const rawPageId = url.searchParams.get("pageId")

        if (!parentPageId || !rawPageId) {
            return NextResponse.json(
                { error: "parentPageId and pageId are required" },
                { status: 400 }
            )
        }

        const numberSynced = await linkCanvas(userId);
        
        return NextResponse.json({ ok: true, numberSynced }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}