"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ds";

export default function SetupPage() {
    const [parentPageId, setParentPageId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    // const handleSetup = async () => {
    //     if (!parentPageId) {
    //         setError("Parent page ID is required");
    //         return;
    //     }
    //     setLoading(true);
    //     setError("");
    //     try {
    //         const res = await fetch("/api/notion/sync", {  // Adjust the API path if it's different (e.g., /api/sync)
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({ parentPageId }),
    //         });
    //         if (!res.ok) {
    //             const data = await res.json();
    //             throw new Error(data.error || "Setup failed");
    //         }
    //         router.push("/dashboard");
    //     } catch (err: any) {
    //         setError(err.message);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    return (
        <Section className="flex items-start sm:items-center justify-center min-h-[100vh] w-full backdrop-blur-sm my-6">
            <Container className="flex flex-col gap-6">
                <h1 className="!mb-0 text-5xl sm:text-6xl font-semibold hover:cursor-pointer" onClick={() => router.push('/dashboard')}>
                    Automatic setup
                </h1>
                <p className="text-md sm:text-lg text-muted-foreground">
                    Make sure you already provided the parent page ID from Notion in <a href="/dashboard/sync" className="text-blue-500 hover:underline">/dashboard/sync</a>. We'll automatically setup your notion workspace with the necessary pages for Bunni to work seamlessly (Academic Database, Subjects, and Contacts).
                </p>
                {error && <p className="text-red-500">{error}</p>}
                <Button disabled={true} className="w-full sm:w-auto" size="lg">
                    {loading ? "Setting Up..." : "Setup"}
                </Button>
            </Container>
        </Section>
    );
}