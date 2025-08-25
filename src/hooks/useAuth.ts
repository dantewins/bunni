'use client'

import { useEffect, useState } from 'react'

export type AppUser = { id: string; name?: string | null; image?: string | null }

export function useAuth() {
    const [user, setUser] = useState<AppUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [hasFetched, setHasFetched] = useState(false)

    async function fetchUser() {
        if (hasFetched) return
        console.log('Fetching /api/me...')
        setLoading(true)
        try {
            const res = await fetch('/api/me', {
                cache: 'no-store',
                credentials: 'include',
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            console.log('API Response:', data)
            setUser(data.user ?? null)
        } catch (err) {
            console.error('Auth Fetch Error:', err)
            setUser(null)
        } finally {
            setLoading(false)
            setHasFetched(true)
        }
    }

    useEffect(() => {
        let alive = true
        if (!hasFetched) {
            fetchUser().then(() => {
                if (!alive) setLoading(false)
            })
        }
        return () => {
            alive = false
        }
    }, [hasFetched])

    const refresh = () => {
        setHasFetched(false)
        fetchUser()
    }

    return { user, loading, refresh }
}