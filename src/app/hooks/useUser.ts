'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useUser() {
    const supabase = createClient()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        supabase.auth.getUser()
            .then(({ data: { user: u }, error }) => {
                if (isMounted) setUser(error ? null : u)
            })
            .catch(err => {
                console.error('useUser getUser error', err)
                if (isMounted) setUser(null)
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'SIGNED_OUT') && isMounted) {
                setUser(session?.user ?? null)
            }
        })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [supabase])

    return { user, loading }
}