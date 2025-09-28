"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2, Plus, CalendarSync } from "lucide-react";
import { Section, Container } from "@/components/ds";
import { toast } from "sonner";
import { TaskForm } from "@/components/forms/TaskForm";
import { useAuth } from "@/context/AuthContext";

type Ids = Partial<{ parentPageId: string; calendarDatabaseId: string }>;

export default function CalendarPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const today = useMemo(() => {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate());
    }, []);

    const [startDate, setStartDate] = useState(() => {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay());
    });
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(today);
    const [showForm, setShowForm] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [ids, setIds] = useState<Ids>({});
    const [linkLoading, setLinkLoading] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/");
            return;
        }
        if (!user.notion) {
            toast.error("Please sync page IDs first");
            router.push("/dashboard/sync");
            return;
        }
        setIds({
            parentPageId: user.notion.parentPageId || "",
            calendarDatabaseId: user.notion.calendarDatabaseId || "",
        });
        setInitializing(false);
    }, [authLoading, user, router]);

    const monthLabel = useMemo(() => {
        const mid = new Date(startDate);
        mid.setDate(startDate.getDate() + 3);
        return new Intl.DateTimeFormat(undefined, {
            month: "long",
            year: "numeric",
        }).format(mid);
    }, [startDate]);

    const weekDates = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) => {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                return d;
            }),
        [startDate]
    );

    const changeWeek = (dir: number) =>
        setStartDate((prev) => {
            const d = new Date(prev);
            d.setDate(prev.getDate() + dir * 7);
            return d;
        });

    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const scrollerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            const { deltaX, deltaY } = e;
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX !== 0) return;
            if (deltaY !== 0) {
                el.scrollLeft += deltaY;
                e.preventDefault();
            }
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    function formatYMD(date: Date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    async function fetchCalendar() {
        if (!ids.parentPageId || !ids.calendarDatabaseId) return;

        if (abortControllerRef.current) abortControllerRef.current.abort();

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            setLoading(true);
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const res = await fetch(
                `/api/notion/calendar?parentPageId=${ids.parentPageId}&pageId=${ids.calendarDatabaseId}&dueDate=${formatYMD(
                    selectedDate
                )}&tz=${encodeURIComponent(userTimezone)}`,
                { signal, credentials: "include" }
            );
            if (res.status === 401) {
                router.push("/");
                return;
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch daily tasks");
            setTasks(data.items);
        } catch (error: any) {
            if (error.name !== "AbortError") {
                toast.error(error.message || "An unexpected error occurred while fetching your daily tasks");
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCalendar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, ids.parentPageId, ids.calendarDatabaseId]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    const onSubmit = async (values: { title: string; desc?: string; time?: string }) => {
        try {
            setLoading(true);
            const res = await fetch("/api/notion/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: values.title.trim(),
                    description: values.desc?.trim() ?? "",
                    dueDate: formatYMD(selectedDate),
                    parentPageId: ids.parentPageId,
                    time: values.time,
                }),
                credentials: "include",
            });
            if (res.status === 401) {
                router.push("/");
                return;
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add task");

            toast.success("Task added");
            await fetchCalendar();
            setShowForm(false);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const test = async () => {
        try {
            const res = await fetch(`/api/cron/multilink`, {
                method: 'GET',
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer b39ce9322de048af765aa2e76507332287a605954e4b37c368312484a9c084fc`,
                },
            });

            const data = await res.json();
            toast.success("cron job work");
            console.log(data);
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    const canvasLink = async () => {
        setLinkLoading(true);
        try {
            const res = await fetch(`/api/canvas/link?parentPageId=${ids.parentPageId}&pageId=${ids.calendarDatabaseId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to link Canvas');
            }

            toast.success(data.amountSynced > 0 ? `Synced ${data.amountSynced} task${data.amountSynced > 1 ? 's' : ''} from Canvas successfully!` : 'Already up to date');
        } catch (err: any) {
            toast.error(err.message);
            if (err.message === 'Invalid setup') {
                router.push('/dashboard/setup')
            }
        } finally {
            setLinkLoading(false);
        }
    }

    if (initializing) return null;

    return (
        <Section className="flex items-center justify-center h-[100vh] w-full backdrop-blur-sm">
            <Container className="flex flex-col gap-6">
                <div className="flex items-center justify-between mb-3">
                    <h1
                        className="text-3xl sm:text-5xl font-semibold hover:cursor-pointer"
                        onClick={() => router.push("/dashboard")}
                    >
                        {monthLabel}
                    </h1>
                    <div className="sm:h-12 h-8">
                        <Button variant="outline" className="h-full !px-1 sm:!px-3" onClick={canvasLink} disabled={linkLoading}>
                            <CalendarSync className="!h-5 !w-5 sm:!h-6 sm:!w-6" />
                        </Button>
                        <Button variant="outline" className="h-full !px-1 sm:!px-3 ml-3" onClick={() => test()} disabled={false}>
                            <Plus className="!h-5 !w-5 sm:!h-6 sm:!w-6" />
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 w-full [grid-template-columns:auto_1fr_auto]">
                    <Button variant="outline" onClick={() => changeWeek(-1)} className="h-20 !px-4 md:!px-6">
                        <ChevronLeft className="!w-5 !h-5" />
                    </Button>

                    <div
                        ref={scrollerRef}
                        className="w-full h-20 overflow-x-auto overflow-y-hidden scroll-smooth"
                        style={{ overscrollBehaviorX: "contain" }}
                    >
                        <div className="grid grid-cols-[repeat(7,minmax(5rem,1fr))] gap-3 w-full">
                            {weekDates.map((date, idx) => {
                                const isToday = isSameDay(date, today);
                                const isSelected = isSameDay(date, selectedDate);
                                const variant = isSelected || isToday ? "default" : "outline";

                                return (
                                    <Button
                                        key={idx}
                                        onClick={() => setSelectedDate(date)}
                                        variant={variant}
                                        className={`h-20 flex flex-col items-center justify-center ${isSelected && !isToday ? "text-white !bg-slate-600" : ""
                                            }`}
                                    >
                                        <span className="text-md font-medium uppercase">
                                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx]}
                                        </span>
                                        <span className="text-xl">{date.getDate()}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <Button variant="outline" onClick={() => changeWeek(1)} className="h-20 !px-4 md:!px-6">
                        <ChevronRight className="!w-5 !h-5" />
                    </Button>
                </div>

                <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
                    {!loading ? (
                        !showForm && tasks.length > 0 ? (
                            tasks.map((task, i) => (
                                <div className="bg-white border border-gray-200 px-6 py-4 w-full" key={i}>
                                    <div className="mb-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <Badge className="border-gray-200 py-1 rounded-none text-xs px-3 hover:text-white hover:bg-gray-900" variant="outline">
                                                {task.subjectName || "No Subject"}
                                            </Badge>
                                            <Checkbox checked={task.done} />
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 break-words flex-1">
                                            {task.title || "Untitled Task"}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {task.description || "No description for this task."}
                                    </p>
                                </div>
                            ))
                        ) : !showForm ? (
                            <div className="bg-white border border-gray-200 px-6 py-4 w-full">No assignments or assessments for this date.</div>
                        ) : null
                    ) : (
                        <div className="flex items-center justify-center min-h-[30vh]">
                            <Loader2 className="!h-8 !w-8 animate-spin" />
                        </div>
                    )}

                    {showForm && <TaskForm loading={loading} setShowForm={setShowForm} onSubmit={onSubmit} />}
                </div>
            </Container>
        </Section>
    );
}