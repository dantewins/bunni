import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const SESSION_COOKIE = "app_session"
const secret = new TextEncoder().encode(process.env.APP_JWT_SECRET!)

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    if (
        pathname === "/" ||
        pathname.startsWith("/api/cron/multilink") ||
        pathname.startsWith("/api/notion/callback") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon")
    ) {
        return NextResponse.next()
    }

    const token = req.cookies.get(SESSION_COOKIE)?.value
    if (!token) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
        }
        return NextResponse.redirect(new URL("/", req.url))
    }

    try {
        const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
        const userId = payload.sub as string

        if (pathname.startsWith("/api/")) {
            const requestHeaders = new Headers(req.headers)
            requestHeaders.set("x-user-id", userId)
            return NextResponse.next({
                request: { headers: requestHeaders },
            })
        }

        return NextResponse.next()
    } catch {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 })
        }
        const res = NextResponse.redirect(new URL("/", req.url))
        res.cookies.delete(SESSION_COOKIE)
        return res
    }
}

export const config = {
    matcher: ["/dashboard/:path*", "/api/:path*"],
}