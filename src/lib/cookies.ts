import { NextResponse } from 'next/server'

export const SESSION_COOKIE = "app_session"

export function setSessionCookie(token: string, res: NextResponse, maxAge = 60 * 60 * 24 * 7) {
    res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge,
    })
}

export function clearSessionCookie(res: NextResponse) {
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
}