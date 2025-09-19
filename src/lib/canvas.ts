import { prisma } from "@/lib/prisma";
import { withValidNotionToken, getAllNotionPages, createNotionObject, fetchNotionDb, dash, notionFetch } from "@/lib/notion";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function fetchCanvasFromPrisma() {
    // const connection = await prisma.canvasConnection.findUnique({ where: { userId } });
    // if (!connection) throw new Error('No Canvas connection found');

    // return connection

    return 'https://pinescharter.instructure.com'
}

async function canvasFetch(userId: string, path: string, init?: RequestInit) {
    // const connection = await prisma.canvasConnection.findUnique({ where: { userId } });
    // if (!connection) throw new Error('No Canvas connection found');

    // const { baseUrl, accessToken } = connection;
    const url = `https://pinescharter.instructure.com/api/v1${path.startsWith('/') ? '' : '/'}${path}`;
    // const url = `${baseUrl}/api/v1${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer 11793~7t4G2YHQ4nFrQP8V4ZXVrMUMwamYQrBrG98BaT9CwHQBLN8XAPCC9GLXwBu9Ex62`,
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });
    // const res = await fetch(url, {
    //     ...init,
    //     headers: {
    //         Authorization: `Bearer ${accessToken}`,
    //         'Content-Type': 'application/json',
    //         ...(init?.headers || {}),
    //     },
    // });
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || res.statusText);
    }
    return res.json();
}

async function getAllCanvas(userId: string, path: string, params: string = '') {
    // const connection = await prisma.canvasConnection.findUnique({ where: { userId } });
    // if (!connection) throw new Error('No Canvas connection found');

    // const { baseUrl, accessToken } = connection;
    let url = `https://pinescharter.instructure.com/api/v1${path.startsWith('/') ? '' : '/'}${path}${params ? `?${params}` : ''}`;
    // let url = `${baseUrl}/api/v1${path.startsWith('/') ? '' : '/'}${path}${params ? `?${params}` : ''}`;
    const results: any[] = [];
    while (url) {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer 11793~7t4G2YHQ4nFrQP8V4ZXVrMUMwamYQrBrG98BaT9CwHQBLN8XAPCC9GLXwBu9Ex62` },
        });
        // const res = await fetch(url, {
        //     headers: { Authorization: `Bearer ${accessToken}` },
        // });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || res.statusText);
        }
        const data = await res.json();
        results.push(...(Array.isArray(data) ? data : [data]));
        const link = res.headers.get('link');
        if (!link) break;
        const nextMatch = link.split(',').find((l: string) => l.includes('rel="next"'));
        if (!nextMatch) break;
        url = nextMatch.match(/<([^>]+)>/)?.[1] || '';
    }
    return results;
}

async function linkCanvas(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            notion: true,
            canvas: true,
        },
    });

    if (!user) throw new Error(`User not found: ${userId}`);
    if (!user.notion) throw new Error(`Notion not connected for user ${userId}`);
    if (!user.canvas) throw new Error(`Canvas not connected for user ${userId}`);

    const assignmentsDbId = user.notion.calendarDatabaseId;
    if (!assignmentsDbId) {
        throw new Error(`Missing Notion Assignments DB id (calendarDatabaseId) for user ${userId}`);
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    let amountSynced = 0;

    await withValidNotionToken(userId, async (token) => {
        const courses = await getAllCanvas(userId, "/courses", "enrollment_state=active");
        const courseMap = new Map(courses.map((c: any) => [c.id, c.name]));

        const plannerItems = await getAllCanvas(userId, "/planner/items");

        const filteredByPlannerOverride = plannerItems.filter((item: any) =>
            !item.planner_override || item.planner_override.marked_complete === false
        );

        const finalFilteredItems = filteredByPlannerOverride.filter(
            (item: any) => item.submissions && item.submissions.submitted === false && item.plannable_type === "assignment"
        );

        const unfinishedIds = new Set(finalFilteredItems.map((item: any) => item.plannable_id));

        const subjectsDb = await fetchNotionDb(token, "Subjects");
        if (!subjectsDb) throw new Error("Invalid Notion setup: 'Subjects' database not found");

        for (const item of finalFilteredItems) {
            const ass = item.plannable;
            const courseName = courseMap.get(item.course_id) || "Unknown";

            ass.id = item.plannable_id;
            ass.html_url = item.html_url;

            const fullPlannable = await canvasFetch(userId, `/courses/${item.course_id}/assignments/${item.plannable_id}`);

            const existing = await getAllNotionPages(token, assignmentsDbId, {
                property: "Id",
                number: { equals: fullPlannable.id },
            });
            if (existing.length > 0) continue;

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const descText = fullPlannable.description ? fullPlannable.description.replace(/<[^>]*>?/gm, "") : "";

            const prompt = `
                Analyze the following assignment and return ONLY JSON:

                Course: ${courseName}
                Name: ${fullPlannable.name || fullPlannable.title || ass.name || ass.title}
                Description: ${descText}
                Due at: ${ass.due_at || "no due date"}

                {
                "type": "assignment or assessment (Progress checks are assignments)",
                "name": "Nicely formatted name (e.g., 'Point of View Notes', 'HW #7')"
                }
            `;

            const result = await model.generateContent(prompt);
            const aiText = result.response.text().trim();

            let aiData: any;
            try {
                const jsonStr = aiText.replace(/^```json\s*|\s*```$/g, "");
                aiData = JSON.parse(jsonStr);
            } catch {
                throw new Error("Failed to parse AI response from Gemini");
            }

            const { type, name } = aiData;
            const dueDateProp = ass.due_at ? { date: { start: ass.due_at } } : { date: null };

            const baseURL = await fetchCanvasFromPrisma();
            const newURL = baseURL + ass.html_url;

            const descriptionContent = [
                { type: "text", text: { content: "Canvas link", link: { url: newURL } } },
            ];

            const subjectPages = await getAllNotionPages(token, subjectsDb.id, {
                property: "Canvas ID",
                number: { equals: item.course_id },
            });

            await createNotionObject(token, assignmentsDbId, name, {
                "Due Date": dueDateProp,
                Done: { checkbox: false },
                Description: { rich_text: descriptionContent },
                Subject: subjectPages[0]?.id ? { relation: [{ id: subjectPages[0].id }] } : undefined,
                Id: { number: fullPlannable.id },
                Type: { select: { name: type } },
            });

            amountSynced++;
        }

        const uncheckedAssignments = await getAllNotionPages(token, assignmentsDbId, {
            property: "Done",
            checkbox: { equals: false },
        });

        for (const page of uncheckedAssignments) {
            const assignmentId = page.properties.Id?.number;
            if (assignmentId && !unfinishedIds.has(assignmentId)) {
                await notionFetch(token, `/pages/${dash(page.id)}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        properties: { Done: { checkbox: true } },
                    }),
                });
                amountSynced++;
            }
        }
    });

    return amountSynced;
}

export { fetchCanvasFromPrisma, canvasFetch, getAllCanvas, linkCanvas };