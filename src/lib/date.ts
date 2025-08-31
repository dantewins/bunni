export const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone
const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function dayKeyInTZ(d: Date, tz = TZ) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(d)
    const get = (t: string) => parts.find((p) => p.type === t)?.value!
    return `${get("year")}-${get("month")}-${get("day")}`
}

export function getCurrentDay(tz = TZ) {
    return dayKeyInTZ(new Date(), tz)
}

export function isYYYYMMDD(s: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function nextDay(yyyyMmDd: string) {
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    const y2 = dt.getUTCFullYear();
    const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d2 = String(dt.getUTCDate()).padStart(2, "0");
    return `${y2}-${m2}-${d2}`;
}

function getTimezoneOffsetString(yyyyMmDd: string, tz: string): string {
    const [year, month, day] = yyyyMmDd.split("-").map(Number);
    const utcTime = Date.UTC(year, month - 1, day, 12, 0, 0, 0); // Noon to avoid DST edge cases in offset calc
    const date = new Date(utcTime);

    const fmt = (timeZone: string) =>
        new Intl.DateTimeFormat("en", {
            timeZone,
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: false,
        }).formatToParts(date);

    const partsToUTC = (parts: Intl.DateTimeFormatPart[]) => {
        const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
        const y = get("year");
        const mo = get("month") - 1;
        const d = get("day");
        const h = get("hour");
        const m = get("minute");
        const s = get("second");
        return Date.UTC(y, mo, d, h, m, s);
    };

    const utcMs = partsToUTC(fmt("UTC"));
    const tzMs = partsToUTC(fmt(tz));

    const offsetMin = Math.round((tzMs - utcMs) / 60000);
    const absOffsetMin = Math.abs(offsetMin);
    const hours = Math.floor(absOffsetMin / 60);
    const minutes = absOffsetMin % 60;
    const sign = offsetMin >= 0 ? "+" : "-";
    return `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function buildDueDateDayFilter(target: string, tz = "America/New_York") {
    const day = isYYYYMMDD(target) ? target : dayKeyInTZ(new Date(target), tz);
    const next = nextDay(day);

    const offsetStr = getTimezoneOffsetString(day, tz);
    const nextOffsetStr = getTimezoneOffsetString(next, tz);

    const localStart = `${day}T00:00:00${offsetStr}`;
    const localEnd = `${next}T00:00:00${nextOffsetStr}`;
    const utcStart = `${day}T00:00:00+00:00`;
    const utcEnd = `${next}T00:00:00+00:00`;

    const filterStartStr =
        new Date(localStart).getTime() <= new Date(utcStart).getTime() ? localStart : utcStart;
    const filterEndStr =
        new Date(localEnd).getTime() >= new Date(utcEnd).getTime() ? localEnd : utcEnd;

    return {
        and: [
            { property: "Due Date", date: { on_or_after: filterStartStr } },
            { property: "Due Date", date: { before: filterEndStr } },
        ],
    };
}

function parseFloatingAsLocal(start: string, tz: string): Date {
    const datePart = start.split('T')[0];
    const offsetStr = getTimezoneOffsetString(datePart, tz);
    const sign = offsetStr.startsWith('-') ? -1 : 1;
    const hours = parseInt(offsetStr.slice(1, 3), 10);
    const minutes = parseInt(offsetStr.slice(4, 6), 10);
    const offsetMs = sign * (hours * 3600000 + minutes * 60000);
    const naiveDate = new Date(start); // Parsed as UTC
    return new Date(naiveDate.getTime() - offsetMs); // Adjust to treat as local timestamp
}

export function getLocalDay(dateObj: any, tz: string, targetDay: string) {
    if (!dateObj || !dateObj.start) return false;
    const start = dateObj.start;
    if (isYYYYMMDD(start)) {
        return start === targetDay;
    } else {
        let d: Date;
        const hasOffset = /[+-]\d{2}:\d{2}$/.test(start) || /Z$/.test(start);
        if (!hasOffset) {
            d = parseFloatingAsLocal(start, tz);
        } else {
            d = new Date(start);
        }
        if (isNaN(d.getTime())) return false;
        const itemDay = dayKeyInTZ(d, tz);
        return itemDay === targetDay;
    }
}

export function buildDueDateProp(dueDate?: string, time?: string) {
    if (!dueDate && !time) return { date: null }

    const dateStr = dueDate || getCurrentDay()

    if (time && HHMM.test(time)) {
        return { date: { start: `${dateStr}T${time}:00`, time_zone: TZ } }
    }
    return { date: { start: dateStr } }
}