import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { linkCanvas } from "@/lib/canvas";

export async function POST(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
        where: {
            hasCompletedSetup: true,
            notion: { isNot: null },
        },
        select: { id: true },
    });

    if (!users.length) {
        return NextResponse.json({ ok: true, totalUsers: 0, totalSynced: 0, failures: [] });
    }

    const CONCURRENCY = 3;
    const queue = users.map(u => u.id);
    const results: Array<{ userId: string; ok: boolean; synced: number; error?: string }> = [];

    async function worker() {
        for (; ;) {
            const userId = queue.shift();
            if (!userId) break;
            try {
                const synced = await linkCanvas(userId);
                results.push({ userId, ok: true, synced });
            } catch (err: any) {
                results.push({ userId, ok: false, synced: 0, error: err?.message ?? "Unknown error" });
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, users.length) }, worker));

    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
    const failures = results.filter(r => !r.ok);

    return NextResponse.json({
        ok: failures.length === 0,
        totalUsers: users.length,
        totalSynced,
        failures,
    });
}
