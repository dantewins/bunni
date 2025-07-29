import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')

    let errorMsg = 'Something went wrong while trying to log you in.'

    if (code) {
        const supabase = await createClient()
        const { error: supabaseError } = await supabase.auth.exchangeCodeForSession(code)

        if (supabaseError) {
            errorMsg = supabaseError.message
        } else {
            const host = request.headers.get('x-forwarded-host') ?? url.host
            const protoHdr = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
            const protocol = protoHdr.split(',')[0]
            const dest = `${protocol}://${host}/dashboard`
            return NextResponse.redirect(dest)
        }
    }

    return NextResponse.json({ success: false, message: errorMsg }, { status: 400 })
}
