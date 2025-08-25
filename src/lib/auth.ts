import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server"

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

export async function requireUserId() {
    const cookieStore = await cookies()
    const token = cookieStore.get("app_session")?.value
    if (!token) throw new Error("UNAUTHENTICATED")

    const { sub } = await verifySession(token)
    return sub as string
}

export async function optionalUserId() {
    const cookieStore = await cookies()
    const token = cookieStore.get("app_session")?.value
    if (!token) return null

    try {
        const { sub } = await verifySession(token)
        return sub as string
    } catch {
        return null
    }
}

export async function getCurrentUserId(request: NextRequest) {
    const token = request.cookies.get("app_session")?.value
    if (!token) throw new Error("UNAUTHENTICATED")

    const { sub } = await verifySession(token)
    return sub as string
}
