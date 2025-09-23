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
        include: { notion: true, canvas: true },
    });

    if (!user) throw new Error(`User not found: ${userId}`);
    if (!user.notion) throw new Error(`Notion not connected for user ${userId}`);
    // if (!user.canvas) throw new Error(`Canvas not connected for user ${userId}`);

    const assignmentsDbId = user.notion.calendarDatabaseId;
    if (!assignmentsDbId) {
        throw new Error(`Missing Notion Assignments DB id (calendarDatabaseId) for user ${userId}`);
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let amountSynced = 0;

    await withValidNotionToken(userId, async (token) => {
        const courses = await getAllCanvas(userId, "/courses", "enrollment_state=active");
        const courseMap = new Map(courses.map((c: any) => [c.id, c.name]));
        const plannerItems = await getAllCanvas(userId, "/planner/items");

        const unfinished = plannerItems
            .filter((it: any) => (!it.planner_override || it.planner_override.marked_complete === false))
            .filter((it: any) => it.submissions?.submitted === false && it.plannable_type === "assignment");

        const unfinishedIds = new Set<number>(unfinished.map((it: any) => it.plannable_id));

        const subjectsDb = await fetchNotionDb(token, "Subjects");
        if (!subjectsDb) throw new Error("Invalid Notion setup: 'Subjects' database not found");

        const baseURL = await fetchCanvasFromPrisma();

        const upsertAssignment = async (item: any) => {
            const ass = { ...item.plannable, id: item.plannable_id, html_url: item.html_url };
            const courseName = courseMap.get(item.course_id) || "Unknown";

            const full = await canvasFetch(
                userId,
                `/courses/${item.course_id}/assignments/${item.plannable_id}`
            );

            const descText = full.description ? full.description.replace(/<[^>]*>?/gm, "") : "";
            const prompt = `
                Analyze the following assignment and return ONLY JSON:
                Course: ${courseName}
                Name: ${full.name || full.title || ass.name || ass.title}
                Description: ${descText}
                Due at: ${ass.due_at || "no due date"}
                {
                    "type": "strictly return either 'assignment' or 'assessment' (Progress checks are assignments)",
                    "name": "Nicely formatted name (e.g., 'Point of View Notes', 'HW #7', 'Unit 2 Progress Check MCQ')"
                }
            `;
            const ai = await model.generateContent(prompt);
            const aiText = ai.response.text().trim();
            const jsonStr = aiText.replace(/^```json\s*|\s*```$/g, "");
            const { type, name } = JSON.parse(jsonStr);

            const dueDateProp = ass.due_at ? { date: { start: ass.due_at } } : { date: null };
            const newURL = baseURL + ass.html_url;
            const descriptionContent = [
                { type: "text", text: { content: "Canvas link", link: { url: newURL } } },
            ];

            const subjectPages = await getAllNotionPages(token, subjectsDb.id, {
                property: "Canvas ID",
                number: { equals: item.course_id },
            });
            const subjectRelation = subjectPages[0]?.id ? { relation: [{ id: subjectPages[0].id }] } : undefined;

            const existing = await getAllNotionPages(token, assignmentsDbId, {
                property: "Id",
                number: { equals: full.id },
            });

            if (existing.length === 0) {
                await createNotionObject(token, assignmentsDbId, name, {
                    "Due Date": dueDateProp,
                    Done: { checkbox: false },
                    Description: { rich_text: descriptionContent },
                    Subject: subjectRelation,
                    Id: { number: full.id },
                    Type: { select: { name: type } },
                });
                amountSynced++;
                return;
            }

            const page = existing[0];
            const updates: Record<string, any> = {};
            let needUpdate = false;

            const currentName = page.properties.Name?.title?.[0]?.text?.content || "";
            if (currentName !== name) {
                updates.Name = { title: [{ type: "text", text: { content: name } }] };
                needUpdate = true;
            }

            const currentDue = page.properties["Due Date"]?.date?.start || null;
            const newDue = ass.due_at || null;
            if (currentDue !== newDue) {
                updates["Due Date"] = dueDateProp;
                needUpdate = true;
            }

            const currentType = page.properties.Type?.select?.name || "";
            if (currentType !== type) {
                updates.Type = { select: { name: type } };
                needUpdate = true;
            }

            const currentSubjectId = page.properties.Subject?.relation?.[0]?.id || null;
            const newSubjectId = subjectPages[0]?.id || null;
            if (currentSubjectId !== newSubjectId) {
                updates.Subject = subjectRelation;
                needUpdate = true;
            }

            const currentDescFirst = page.properties.Description?.rich_text?.[0]?.text?.content || "";
            const currentDescLink = page.properties.Description?.rich_text?.[0]?.text?.link?.url || "";
            if (currentDescFirst !== "Canvas link" || currentDescLink !== newURL) {
                updates.Description = { rich_text: descriptionContent };
                needUpdate = true;
            }

            const currentDone = page.properties.Done?.checkbox ?? false;
            if (currentDone !== false) {
                updates.Done = { checkbox: false };
                needUpdate = true;
            }

            if (needUpdate) {
                await notionFetch(token, `/pages/${page.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ properties: updates }),
                });
            }
        };

        for (const item of unfinished) {
            await upsertAssignment(item);
        }

        const openPages = await getAllNotionPages(token, assignmentsDbId, {
            property: "Done",
            checkbox: { equals: false },
        });

        for (const page of openPages) {
            const id = page.properties.Id?.number;
            if (!id) continue;
            if (!unfinishedIds.has(id)) {
                await notionFetch(token, `/pages/${page.id}`, {
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