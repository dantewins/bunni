'use client'

import { useEffect, useState } from 'react'
import Hero from '@/components/landing/hero'
import Feature from '@/components/landing/feature'
import FAQ from '@/components/landing/faq'
import CTA from '@/components/landing/cta'
import Footer from '@/components/landing/footer'
import { ArrowDown } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

export default function LandingPage() {
    const [visible, setVisible] = useState(true)
    const { user, loading, refresh } = useAuth()

    const scrollDown = () =>
        document?.getElementById('feature')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    useEffect(() => {
        const handleScroll = () => setVisible(window.scrollY === 0)
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    if (loading) return null

    return (
        <>
            <Hero user={user} loading={loading} />
            <Feature />
            <FAQ />
            <CTA />
            <Footer />
            <div
                onClick={scrollDown}
                className={`hover:cursor-pointer border bg-white animate-bounce fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 p-3 transition-all duration-200 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'
                    } hover:bg-gray-100`}
            >
                <ArrowDown className="w-6 h-6" />
            </div>
        </>
    )
}