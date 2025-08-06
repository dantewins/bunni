import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    console.log(session);

    if (error || !session || !session.provider_token || !session.provider_refresh_token) {
        return NextResponse.json({ error: 'No valid session' }, { status: 401 });
    }

    const url = new URL(request.url);
    const rawPageId = url.searchParams.get('pageId');
    const dueDate = url.searchParams.get('dueDate');

    if (!rawPageId) {
        return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
    }

    const databaseId = rawPageId.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');

    const queryBody = dueDate ? {
        filter: {
            property: 'Due Date',
            date: {
                equals: dueDate
            }
        }
    } : {};

    let providerToken = session.provider_token;

    async function queryNotion() {
        const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${providerToken}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(queryBody),
        });
        return response;
    }

    let response = await queryNotion();

    if (!response.ok) {
        if (response.status === 401) {
            try {
                const clientId = process.env.NOTION_CLIENT_ID;
                const clientSecret = process.env.NOTION_CLIENT_SECRET;
                if (!clientId || !clientSecret) {
                    throw new Error('Missing Notion client credentials');
                }

                const authHeader = 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64');

                const refreshResponse = await fetch('https://api.notion.com/v1/oauth/token', {
                    method: 'POST',
                    headers: {
                        Authorization: authHeader,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        grant_type: 'refresh_token',
                        refresh_token: session.provider_refresh_token
                    }),
                });

                if (!refreshResponse.ok) {
                    const errBody = await refreshResponse.json();
                    throw new Error(errBody.message || 'Failed to refresh token');
                }

                const refreshData = await refreshResponse.json();
                const newAccessToken = refreshData.access_token;
                const newRefreshToken = refreshData.refresh_token;

                if (!newAccessToken || !newRefreshToken) {
                    throw new Error('Invalid refresh response');
                }

                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

                if (!supabaseUrl || !serviceKey) {
                    throw new Error('Missing Supabase admin credentials');
                }

                const serviceClient = await createServiceClient();

                const { data: identity, error: idError } = await serviceClient
                    .from('identities')
                    .select('id, identity_data')
                    .eq('user_id', session.user.id)
                    .eq('provider', 'notion')
                    .single();

                if (idError || !identity) {
                    throw new Error('Identity not found');
                }

                const newIdentityData = {
                    ...identity.identity_data,
                    access_token: newAccessToken,
                    refresh_token: newRefreshToken
                };

                const { error: updateError } = await serviceClient
                    .from('identities')
                    .update({
                        identity_data: newIdentityData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', identity.id);

                if (updateError) {
                    throw new Error('Failed to update identity: ' + updateError.message);
                }

                providerToken = newAccessToken;
                response = await queryNotion();

                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(errorBody.message || 'Notion API error after refresh');
                }
            } catch (refreshErr: unknown) {
                const errorMessage = refreshErr instanceof Error ? refreshErr.message : 'Unknown error';
                console.error('Refresh error:', errorMessage);
                return NextResponse.json({ error: 'Invalid token, please re-authenticate with Notion' }, { status: 401 });
            }
        } else {
            let errorBody;
            try {
                errorBody = await response.json();
            } catch {
                errorBody = {};
            }
            console.log('Notion error body:', errorBody);
            return NextResponse.json({ error: errorBody.message || 'Notion API error' }, { status: response.status });
        }
    }

    const data = await response.json();
    return NextResponse.json(data);
}