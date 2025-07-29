"use client"

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ds";
import { createClient } from '@/utils/supabase/client';
import { toast } from "sonner";

export default function DashboardPage() {
    const supabase = createClient()
    const router = useRouter()

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();

            if (error) throw new Error(error.message)

            router.push('/')
        } catch (err: any) {
            toast.error(err.message || 'An unexpected error occurred while signing in with Notion')
        }
    };

    return (
        <Section className="flex items-center justify-center h-[100vh] w-full backdrop-blur-sm">
            <Container className="flex flex-col gap-6">
                <h1 className="!mb-0 text-5xl sm:text-6xl font-semibold">
                    Welcome, Danny!
                </h1>
                <h3 className="rounded-none border bg-muted/50 p-4 text-muted-foreground text-md sm:text-lg">
                    Navigate below to use Bunni and see your assignments, assessments, and deadlines all laid out in a clear, interactive calendar so you never miss a beat.
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                    <Button className="w-full hover:cursor-pointer">Daily</Button>
                    <Button className="w-full hover:cursor-pointer">Weekly</Button>
                    <Button className="w-full hover:cursor-pointer">Monthly</Button>
                    <Button className="w-full hover:cursor-pointer" variant="outline" onClick={signOut}>Sign out</Button>
                </div>
            </Container>
        </Section>
    );
}