'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Section, Container } from '@/components/ds';

export default function CalendarPage() {
    const router = useRouter();

    const [startDate, setStartDate] = useState(() => {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay());
    });

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

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

    const isToday = (d: Date) => {
        const t = new Date();
        return (
            d.getDate() === t.getDate() &&
            d.getMonth() === t.getMonth() &&
            d.getFullYear() === t.getFullYear()
        );
    };

    return (
        <Section className="flex items-center justify-center h-[100vh] w-full backdrop-blur-sm">
            <Container className="flex flex-col gap-6">
                <div className="grid gap-3 w-full [grid-template-columns:auto_1fr_auto]">
                    <div className="col-span-full flex items-center justify-between mb-3">
                        <h1 className="text-4xl sm:text-5xl font-semibold">{monthLabel}</h1>
                        <Button variant="outline" onClick={() => router.push('/dashboard')} className="h-full !px-4 md:!px-6">
                            Home
                        </Button>
                    </div>
                    <Button variant="outline" onClick={() => changeWeek(-1)} className="h-20 !px-4 md:!px-6">
                        <ChevronLeft className="!w-5 !h-5" />
                    </Button>
                    <div ref={scrollerRef} className="w-full h-20 overflow-x-auto overflow-y-hidden" style={{ overscrollBehaviorX: 'contain' }}>
                        <div className="inline-grid grid-flow-col auto-cols-[5rem] gap-3 w-max">
                            {weekDates.map((date, idx) => (
                                <Button key={idx} variant={isToday(date) ? 'default' : 'outline'} className="h-20 flex flex-col items-center justify-center">
                                    <span className="text-md font-medium uppercase">
                                        {weekdays[idx]}
                                    </span>
                                    <span className="text-xl">{date.getDate()}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => changeWeek(1)} className="h-20 !px-4 md:!px-6">
                        <ChevronRight className="!w-5 !h-5" />
                    </Button>
                </div>
                <div className="border w-full h-30">dsfsd</div>
            </Container>
        </Section>
    );
}
