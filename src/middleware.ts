import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const SESSION_COOKIE = "app_session"
const secret = new TextEncoder().encode(process.env.APP_JWT_SECRET!)

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    if (
        pathname === "/" ||
        pathname.startsWith("/api/notion/callback") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon")
    ) {
        return NextResponse.next()
    }

    const token = req.cookies.get(SESSION_COOKIE)?.value
    if (!token) return NextResponse.redirect(new URL("/", req.url))

    try {
        await jwtVerify(token, secret, { algorithms: ["HS256"] })
        return NextResponse.next()
    } catch {
        const res = NextResponse.redirect(new URL("/", req.url))
        res.cookies.delete(SESSION_COOKIE)
        return res
    }
}

export const config = {
    matcher: ["/dashboard/:path*"],
}
