import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    let errorMsg = 'Something went wrong while trying to log you in.';

    if (!code) {
        return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        errorMsg = error.message;
        return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    if (data.session?.provider_token && data.session?.provider_refresh_token) {
        await supabase.auth.updateUser({
            data: {
                notion_access_token: data.session.provider_token,
                notion_refresh_token: data.session.provider_refresh_token,
            },
        });
    }

    const host = request.headers.get('x-forwarded-host') ?? url.host;
    const proto = (request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')).split(',')[0];
    return NextResponse.redirect(`${proto}://${host}/dashboard`);
}
