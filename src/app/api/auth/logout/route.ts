import { NextResponse, NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"
import { clearSessionCookie } from "@/lib/cookies"

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request as NextRequest)
        await prisma.notionConnection.delete({ where: { userId } })
        await prisma.user.delete({ where: { id: userId } })
    } catch (err) {
        console.error("Failed to delete from Prisma:", err)
    }

    const response = NextResponse.json({ ok: true })
    clearSessionCookie(response)
    return response
}