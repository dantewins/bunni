"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container, Section } from "@/components/ds"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"

export default function DashboardPage() {
    const router = useRouter()
    const { user, loading } = useAuth()

    const signOut = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" })
            router.push("/")
        } catch (err: any) {
            toast.error(err?.message || "Could not sign out")
        }
    }

    if (loading) return null
    if (!user) {
        router.push("/")
        return null
    }

    const displayName = user.name || "there"

    return (
        <Section className="flex items-center justify-center h-[100vh] w-full backdrop-blur-sm">
            <Container className="flex flex-col gap-6">
                <h1 className="!mb-0 text-5xl sm:text-6xl font-semibold">
                    Welcome, {displayName}!
                </h1>
                <h3 className="rounded-none border bg-muted/50 p-4 text-muted-foreground text-md sm:text-lg">
                    Navigate below to use Bunni and see your assignments, assessments, and deadlines all laid out in a clear, interactive calendar so you never miss a beat.
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 w-full">
                    <Button className="w-full col-span-1 sm:col-span-3" onClick={() => router.push("/dashboard/calendar")}>
                        Calendar
                    </Button>
                    <Button className="w-full col-span-1 sm:col-span-1" onClick={() => router.push("/dashboard/sync")}>
                        Sync
                    </Button>
                    <Button className="w-full col-span-1 sm:col-span-1" onClick={() => router.push("/dashboard/info")}>
                        Info
                    </Button>
                    <Button className="w-full col-span-1 sm:col-span-1" variant="outline" onClick={signOut}>
                        Sign out
                    </Button>
                </div>
            </Container>
        </Section>
    )
}
