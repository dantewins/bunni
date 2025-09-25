'use client'

import { useRouter } from "next/navigation";
import { Container, Section } from "@/components/ds";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { SyncForm } from "@/components/forms/SyncForm";
import { useAuth } from "@/context/AuthContext";

export default function SyncPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [defaultValues, setDefaultValues] = useState<Partial<{ parentPageId: string; calendarDatabaseId: string }>>({});

    useEffect(() => {
        if (!user) return;
        setDefaultValues({
            parentPageId: user.notion?.parentPageId || "",
            calendarDatabaseId: user.notion?.calendarDatabaseId || "",
        });
    }, [user]);

    const handleSubmit = async (values: { parentPageId: string; calendarDatabaseId: string }) => {
        setLoading(true);
        try {
            const res = await fetch('/api/notion/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to sync');
            }
            toast.success('Synced successfully!');
            router.push('/dashboard');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/dashboard');
    };

    if (authLoading || !user) return null;

    return (
        <Section className="flex items-start items-center justify-center min-h-[100vh] w-full backdrop-blur-sm">
            <Container className="flex flex-col gap-6">
                <h1 className="!mb-0 text-5xl sm:text-6xl font-semibold hover:cursor-pointer" onClick={() => router.push('/dashboard')}>
                    Sync with notion
                </h1>
                <p className="text-md sm:text-lg text-muted-foreground">
                    Provide your Notion parent page ID and calendar database ID. We'll verify the setup and save it for you.
                </p>
                <SyncForm loading={loading} onSubmit={handleSubmit} onCancel={handleCancel} defaultValues={defaultValues} />
            </Container>
        </Section>
    );
}