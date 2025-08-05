"use client"

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ds";
import { createClient } from '@/utils/supabase/client';
import { toast } from "sonner";
import { useUser } from "@/app/hooks/useUser";

export default function DashboardPage() {
    const supabase = createClient()
    const router = useRouter()
    const { user, loading } = useUser()

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();

            if (error) throw new Error(error.message)

            router.push('/')
        } catch (err: any) {
            toast.error(err.message || 'An unexpected error occurred while signing in with Notion')
        }
    };

    if (loading) return ""

    return (
        <Section className="flex items-center justify-center h-[100vh] w-full backdrop-blur-sm">
            <Container className="flex flex-col gap-6">
                <h1 className="!mb-0 text-5xl sm:text-6xl font-semibold">
                    Welcome, {user?.user_metadata.full_name}!
                </h1>
                <h3 className="rounded-none border bg-muted/50 p-4 text-muted-foreground text-md sm:text-lg">
                    Navigate below to use Bunni and see your assignments, assessments, and deadlines all laid out in a clear, interactive calendar so you never miss a beat.
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                    <Button className="w-full col-span-3" onClick={() => router.push('/dashboard/calendar')}>Calendar</Button>
                    <Button className="w-full" variant="outline" onClick={signOut}>Sign out</Button>
                </div>
            </Container>
        </Section>
    );
}