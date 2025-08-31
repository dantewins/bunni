import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/cookies";
import { NOTION_API } from "@/lib/notion";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) {
        return NextResponse.json({ success: false, message: "Missing code" }, { status: 400 });
    }

    const tokenRes = await fetch(NOTION_API + '/oauth/token', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization:
                "Basic " +
                Buffer.from(
                    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
                ).toString("base64"),
        },
        body: JSON.stringify({
            grant_type: "authorization_code",
            code,
            redirect_uri: `${url.origin}/api/notion/callback`,
        }),
    });

    if (!tokenRes.ok) {
        const t = await tokenRes.text();
        return NextResponse.json({ success: false, message: t }, { status: 400 });
    }

    const tokens: any = await tokenRes.json();

    const name = tokens.owner?.user?.name || "Unknown";
    const image = tokens.owner?.user?.avatar_url || null;
    const notionUserId = tokens.owner?.user?.id;

    if (!notionUserId) {
        return NextResponse.json({ success: false, message: "Missing Notion user ID" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
        where: { notionUserId },
        update: { name, image },
        create: { name, image, notionUserId },
    });

    await prisma.notionConnection.upsert({
        where: { userId: user.id },
        update: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? null,
            expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
            workspaceId: tokens.workspace_id ?? null,
            botId: tokens.bot_id ?? null,
        },
        create: {
            userId: user.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? null,
            expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
            workspaceId: tokens.workspace_id ?? null,
            botId: tokens.bot_id ?? null,
        },
    });

    const jwt = await signSession({ sub: user.id }, "7d");

    const host = req.headers.get("x-forwarded-host") ?? url.host;
    const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0];

    const response = NextResponse.redirect(`${proto}://${host}/dashboard`);
    setSessionCookie(jwt, response);

    return response;
}