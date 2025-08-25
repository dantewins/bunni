import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySession } from "@/lib/auth"
import { SESSION_COOKIE } from "@/lib/cookies"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return NextResponse.json({ user: null })

    try {
        const payload = await verifySession(token)
        const user = await prisma.user.findUnique({ where: { id: payload.sub } })
        return NextResponse.json({ user })
    } catch {
        return NextResponse.json({ user: null })
    }
}
