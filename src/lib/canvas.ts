import { prisma } from "@/lib/prisma";

async function canvasFetch(userId: string, path: string, init?: RequestInit) {
    // const connection = await prisma.canvasConnection.findUnique({ where: { userId } });
    // if (!connection) throw new Error('No Canvas connection found');

    // const { baseUrl, accessToken } = connection;
    const url = `https://pinescharter.instructure.com/api/v1${path.startsWith('/') ? '' : '/'}${path}`;
    // const url = `${baseUrl}/api/v1${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer 11793~7t4G2YHQ4nFrQP8V4ZXVrMUMwamYQrBrG98BaT9CwHQBLN8XAPCC9GLXwBu9Ex62`,
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });
    // const res = await fetch(url, {
    //     ...init,
    //     headers: {
    //         Authorization: `Bearer ${accessToken}`,
    //         'Content-Type': 'application/json',
    //         ...(init?.headers || {}),
    //     },
    // });
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || res.statusText);
    }
    return res.json();
}

async function getAllCanvas(userId: string, path: string, params: string = '') {
    // const connection = await prisma.canvasConnection.findUnique({ where: { userId } });
    // if (!connection) throw new Error('No Canvas connection found');

    // const { baseUrl, accessToken } = connection;
    let url = `https://pinescharter.instructure.com/api/v1${path.startsWith('/') ? '' : '/'}${path}${params ? `?${params}` : ''}`;
    // let url = `${baseUrl}/api/v1${path.startsWith('/') ? '' : '/'}${path}${params ? `?${params}` : ''}`;
    const results: any[] = [];
    while (url) {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer 11793~7t4G2YHQ4nFrQP8V4ZXVrMUMwamYQrBrG98BaT9CwHQBLN8XAPCC9GLXwBu9Ex62` },
        });
        // const res = await fetch(url, {
        //     headers: { Authorization: `Bearer ${accessToken}` },
        // });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || res.statusText);
        }
        const data = await res.json();
        results.push(...(Array.isArray(data) ? data : [data]));
        const link = res.headers.get('link');
        if (!link) break;
        const nextMatch = link.split(',').find((l: string) => l.includes('rel="next"'));
        if (!nextMatch) break;
        url = nextMatch.match(/<([^>]+)>/)?.[1] || '';
    }
    return results;
}

export { canvasFetch, getAllCanvas };