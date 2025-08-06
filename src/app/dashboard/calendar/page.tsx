'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { Section, Container } from '@/components/ds';
import { toast } from "sonner";

export default function CalendarPage() {
    const router = useRouter();
    const today = useMemo(() => {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate());
    }, []);

    const [startDate, setStartDate] = useState(() => {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay());
    });
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(today);

    const monthLabel = useMemo(() => {
        const mid = new Date(startDate);
        mid.setDate(startDate.getDate() + 3);
        return new Intl.DateTimeFormat(undefined, {
            month: 'long',
            year: 'numeric'
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
        setStartDate(prev => {
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

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    function formatYMD(date: Date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    useEffect(() => {
        async function fetchTasks() {
            try {
                setLoading(true);
                const res = await fetch(`/api/notion/calendar?pageId=de1e92db43ca4b32932c2588a43e95b2&dueDate=${formatYMD(selectedDate)}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to fetch daily tasks");

                setTasks(data.results);
            } catch (error: any) {
                toast.error(error.message || "An unexpected error occurred while fetch your daily tasks");
            } finally {
                setLoading(false);
            }
        }
        fetchTasks();
    }, [selectedDate]);

    return (
        <Section className="flex items-center justify-center h-[100vh] w-full backdrop-blur-sm">
            <Container className="flex flex-col gap-6">
                <div className="flex items-center justify-between mb-3 h-12">
                    <h1 className="text-4xl sm:text-5xl font-semibold">{monthLabel}</h1>
                    <Button variant="outline" onClick={() => router.push('/dashboard')} className="h-full !px-4 md:!px-6">
                        Home
                    </Button>
                </div>
                <div className="grid gap-3 w-full [grid-template-columns:auto_1fr_auto]">

                    <Button variant="outline" onClick={() => changeWeek(-1)} className="h-20 !px-4 md:!px-6">
                        <ChevronLeft className="!w-5 !h-5" />
                    </Button>
                    <div ref={scrollerRef} className="w-full h-20 overflow-x-auto overflow-y-hidden scroll-smooth" style={{ overscrollBehaviorX: 'contain' }}>
                        <div className="grid grid-cols-[repeat(7,minmax(5rem,1fr))] gap-3 w-full">
                            {weekDates.map((date, idx) => {
                                const isToday = isSameDay(date, today);
                                const isSelected = isSameDay(date, selectedDate);
                                const variant = isSelected || isToday ? 'default' : 'outline';

                                return (
                                    <Button key={idx} onClick={() => setSelectedDate(date)} variant={variant} className={`h-20 flex flex-col items-center justify-center ${isSelected && !isToday ? 'text-white !bg-slate-600' : ''}`}>
                                        <span className={`text-md font-medium uppercase`}>
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}
                                        </span>
                                        <span className="text-xl">{date.getDate()}</span>
                                    </Button>
                                )
                            })}
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => changeWeek(1)} className="h-20 !px-4 md:!px-6">
                        <ChevronRight className="!w-5 !h-5" />
                    </Button>
                </div>
                <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
                    {
                        !loading ?
                            tasks.length > 0 ? tasks.map((task, i) => (
                                <div className="bg-white border border-gray-200 px-6 py-4 w-full" key={i}>
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-xl font-semibold text-gray-900">{task.properties.Name.title[0].text.content}</h3>
                                        {<Checkbox checked={task.properties.Done.checkbox} />}
                                    </div>
                                    <p className="text-sm text-gray-500">{task.properties.Description?.rich_text[0]?.text?.content || "No description for this task."}</p>
                                </div>
                            )) : <div className="bg-white border border-gray-200 px-6 py-4 w-full">
                                    No tasks for this date.
                                </div>
                            : <div className="flex items-center justify-center min-h-[30vh]">
                                <Loader2 className="!h-8 !w-8 animate-spin" />
                            </div>
                    }
                </div>
            </Container>
        </Section>
    );
}
