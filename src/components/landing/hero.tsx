"use client"

import { ArrowRight } from "lucide-react";
import { Section, Container } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner";

export default function Hero() {
    const supabase = createClient();

    async function signInWithNotion(): Promise<void> {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'notion',
                options: {
                    redirectTo: `${window.location.origin}/api/notion/callback`,
                },
            })

            if (error) throw new Error(error.message)
        } catch (err: any) {
            toast.error(err.message || 'An unexpected error occurred while signing in with Notion')
        }
    }

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <Section className="flex items-center justify-center h-[100vh] w-full backdrop-blur-sm" id="hero">
            <Container className="flex flex-col gap-6">
                <Badge className="rounded-none w-fit text-sm sm:text-md p-1 px-2 sm:p-2 sm:px-4 hover:cursor-pointer" variant="outline">
                    <a className="group flex items-center gap-1" onClick={signInWithNotion}>
                        Connect your notion
                        <ArrowRight className="ml-1 w-5 transition-all group-hover:-rotate-0 -rotate-45" />
                    </a>
                </Badge>
                <h1 className="!mb-0 text-5xl sm:text-6xl font-semibold">
                    Turn your notion pages into a dynamic calendar
                </h1>
                <h3 className="rounded-none border bg-muted/50 p-4 text-muted-foreground text-md sm:text-lg">
                    Link your Notion workspace and let Bunni fetch your assignments,
                    assessments, and deadlines — then automatically lay them out in a
                    weekly or monthly calendar, with today highlighted so you always know
                    what’s next.
                </h3>
                <div className="flex gap-4">
                    <Button onClick={signInWithNotion}>Get Started</Button>
                    <Button variant="outline" onClick={() => scrollToSection('feature')}>Learn More</Button>
                </div>
            </Container>
        </Section>
    )
};
