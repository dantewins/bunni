'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Section, Container } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type HeroProps = {
    user: { id: string; name?: string | null; image?: string | null } | null
    loading: boolean
}

export default function Hero({ user, loading }: HeroProps) {
    const router = useRouter()

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId)
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    function connectNotion() {
        try {
            const u = new URL('https://api.notion.com/v1/oauth/authorize')
            u.searchParams.set('client_id', process.env.NEXT_PUBLIC_NOTION_CLIENT_ID!)
            u.searchParams.set('response_type', 'code')
            u.searchParams.set('owner', 'user')
            u.searchParams.set('redirect_uri', `${window.location.origin}/api/notion/callback`)

            const state = crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
            sessionStorage.setItem('oauth_state', state)
            u.searchParams.set('state', state)

            window.location.href = u.toString()
        } catch (err: any) {
            toast.error(err?.message || 'Could not start Notion OAuth')
        }
    }

    const onClick = user ? () => router.push('/dashboard') : connectNotion

    return (
        <Section className="flex items-center justify-center h-[100vh] w-full backdrop-blur-sm" id="hero">
            <Container className="flex flex-col gap-6">
                <Badge
                    className="rounded-none w-fit text-sm sm:text-md p-1 px-2 sm:p-2 sm:px-4 hover:cursor-pointer"
                    variant="outline"
                >
                    <a className="group flex items-center gap-1" onClick={onClick}>
                        {user ? 'Go to dashboard' : 'Continue with Notion'}
                        <ArrowRight className="ml-1 w-5 transition-all group-hover:-rotate-0 -rotate-45" />
                    </a>
                </Badge>

                <h1 className="!mb-0 text-5xl sm:text-6xl font-semibold">
                    Turn your notion pages into a dynamic calendar
                </h1>

                <h3 className="rounded-none border bg-muted/50 p-4 text-muted-foreground text-md sm:text-lg">
                    Link your Notion workspace and let Bunni fetch your assignments, assessments, and deadlines — then
                    automatically lay them out in a weekly or monthly calendar, with today highlighted so you always know what’s next.
                </h3>

                <div className="flex gap-4">
                    <Button onClick={onClick} disabled={loading}>
                        {user ? 'View calendar' : 'Get Started'}
                    </Button>
                    <Button variant="outline" onClick={() => scrollToSection('feature')}>
                        Learn More
                    </Button>
                </div>
            </Container>
        </Section>
    )
}