"use client"

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ds";


export default function InfoPage() {
    const router = useRouter();

    return (
        <Section className="flex items-start sm:items-center justify-center min-h-[100vh] w-full backdrop-blur-sm my-6">
            <Container className="flex flex-col gap-6">
                <h1 className="!mb-0 text-5xl sm:text-6xl font-semibold">
                    Welcome to Bunni!
                </h1>
                <p className="text-md sm:text-lg text-muted-foreground">
                    Bunni helps you manage assignments, assessments, and deadlines with a clear, interactive calendar integrated with Notion. Follow these steps to get started:
                </p>
                <ul className="list-none pl-0 space-y-4 text-md sm:text-lg text-muted-foreground">
                    <li className="rounded-none border bg-muted/50 p-4">
                        <strong>Sync Your Notion Pages:</strong> Go to <a href="/dashboard/sync" className="text-blue-500 hover:underline">/dashboard/sync</a> to connect your Notion workspace. Provide the parent page ID (where your databases live) and the calendar database ID. This links Bunni to your Notion data. You can obtain a notion page ID by opening the page in Notion and copying the ID from the URL.
                    </li>
                    <li className="rounded-none border bg-muted/50 p-4">
                        <strong>Set Up Your Notion Database:</strong> Ensure your calendar database in Notion includes these exact properties:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li><strong>Name</strong>: Title type – for task names.</li>
                            <li><strong>Due Date</strong>: Date type – for deadlines (supports dates with or without times).</li>
                            <li><strong>Done</strong>: Checkbox type – to mark tasks as completed.</li>
                            <li><strong>Description</strong>: Rich text type – for task details.</li>
                            <li><strong>Subject</strong>: Relation type – link to a subjects database for categorization (make sure subjects database has a name property).</li>
                        </ul>
                        Bunni will also auto-create a "Tasks" database if needed for quick additions.
                    </li>
                    <li className="rounded-none border bg-muted/50 p-4">
                        <strong>Use the Calendar:</strong> Head to the calendar page to view your week. Select a date to see tasks due that day. Add new tasks with the "+" button, mark them done with checkboxes, and navigate weeks with arrows. Everything syncs back to Notion automatically.
                    </li>
                </ul>
                <Button onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">
                    Get Started
                </Button>
            </Container>
        </Section>
    );
}