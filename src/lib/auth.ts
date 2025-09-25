import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

const secret = new TextEncoder().encode(process.env.APP_JWT_SECRET!)
const ALG = "HS256"

export async function signSession(payload: { sub: string }, ttl = "7d") {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: ALG })
        .setSubject(payload.sub)
        .setIssuedAt()
        .setExpirationTime(ttl)
        .sign(secret)
}

export async function verifySession(token: string) {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] })
    return payload as { sub: string; iat: number; exp: number }
}

export async function getUserId(req?: NextRequest, { strict = true }: { strict?: boolean } = {}): Promise<string | null> {
    const token = req ? req.cookies.get("app_session")?.value : (await cookies()).get("app_session")?.value

    if (!token) {
        if (strict) throw new Error("UNAUTHENTICATED")
        return null
    }

    try {
        const { sub } = await verifySession(token)
        return sub as string
    } catch {
        if (strict) throw new Error("UNAUTHENTICATED")
        return null
    }
}

export async function getCurrentUser(req?: NextRequest) {
    const sub = await getUserId(req, { strict: false })
    if (!sub) return null

    return prisma.user.findUnique({
        where: { id: sub },
        include: {
            notion: true,
            canvas: true,
        },
    })
}