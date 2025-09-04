import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { withValidNotionToken, getAllNotionPages, createNotionObject, fetchNotionDb, dash, notionFetch } from "@/lib/notion"
import { getAllCanvas, canvasFetch, fetchCanvasFromPrisma } from "@/lib/canvas"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);

        if (!userId) throw new Error('Unauthorized');

        const url = new URL(request.url)
        const parentPageId = url.searchParams.get("parentPageId")
        const rawPageId = url.searchParams.get("pageId")

        if (!parentPageId || !rawPageId) {
            return NextResponse.json(
                { error: "parentPageId and pageId are required" },
                { status: 400 }
            )
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        let amountSynced = 0;

        await withValidNotionToken(userId, async (token) => {
            const courses = await getAllCanvas(userId, '/courses', 'enrollment_state=active');
            const courseMap = new Map(courses.map((c: any) => [c.id, c.name]));

            const plannerItems = await getAllCanvas(userId, '/planner/items');

            const filteredByPlannerOverride = plannerItems.filter(item =>
                !item.planner_override || item.planner_override.marked_complete === false
            );

            const finalFilteredItems = filteredByPlannerOverride.filter(item =>
                item.submissions && item.submissions.submitted === false && item.plannable_type === 'assignment'
            );

            const unfinishedIds = new Set(finalFilteredItems.map(item => item.plannable_id));

            let subjectsDb = await fetchNotionDb(token, "Subjects");
            if (!subjectsDb) return NextResponse.json({ error: 'Invalid setup' }, { status: 400 })

            for (const item of finalFilteredItems) {
                const ass = item.plannable;
                const courseName = courseMap.get(item.course_id) || 'Unknown';

                ass.id = item.plannable_id;
                ass.html_url = item.html_url;

                const fullPlannable = await canvasFetch(userId!, `/courses/${item.course_id}/assignments/${item.plannable_id}`);

                const existing = await getAllNotionPages(token, rawPageId, {
                    property: 'Id',
                    number: { equals: fullPlannable.id },
                });

                if (existing.length > 0) {
                    continue;
                }

                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const descText = fullPlannable.description ? fullPlannable.description.replace(/<[^>]*>?/gm, '') : '';

                const prompt = `
                    Analyze the following assignment:

                    Course: ${courseName}
                    Name: ${fullPlannable.name || fullPlannable.title || ass.name || ass.title}
                    Description: ${descText}
                    Due at: ${ass.due_at || 'no due date'}

                    Provide the following in JSON format only. Do not add any extra text, explanations, or content outside the JSON object.

                    {
                        "type": "The type of task, strictly either 'assignment' or 'assessment' (Progress checks are assignments)",
                        "name": "A nicely formatted version of the assignment name with proper capitalization (e.g., 'Point of View Notes' instead of 'point of view notes') and added spaces where appropriate (e.g., 'HW #7' instead of 'HW#7')"
                    }
                `;

                const result = await model.generateContent(prompt)
                const aiText = result.response.text().trim()

                let aiData;

                try {
                    const jsonStr = aiText.replace(/^```json\n|\n```$/g, '');
                    aiData = JSON.parse(jsonStr);
                } catch (e) {
                    console.error('Failed to parse AI response:', aiText);

                    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
                }

                const { type, name } = aiData;

                const dueDateProp = ass.due_at ? { date: { start: ass.due_at } } : { date: null };

                const baseURL = await fetchCanvasFromPrisma();
                const newURL = baseURL + ass.html_url

                const descriptionContent = [
                    { type: 'text', text: { content: "Canvas link", link: { url: newURL } } }
                ];

                const subjectPages = await getAllNotionPages(token, subjectsDb.id, {
                    property: 'Canvas ID',
                    number: { equals: item.course_id },
                });

                await createNotionObject(token, rawPageId, name, {
                    'Due Date': dueDateProp,
                    Done: { checkbox: false },
                    Description: { rich_text: descriptionContent },
                    Subject: { relation: [{ id: subjectPages[0].id }] },
                    Id: { number: fullPlannable.id },
                    Type: { select: { name: type } },
                });

                amountSynced++;
            }

            const uncheckedAssignments = await getAllNotionPages(token, rawPageId, {
                filter: {
                    property: 'Done',
                    checkbox: { equals: false }
                }
            });

            for (const page of uncheckedAssignments) {
                const assignmentId = page.properties.Id?.number;
                if (assignmentId && !unfinishedIds.has(assignmentId)) {
                    await notionFetch(token, `/pages/${dash(page.id)}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            properties: {
                                Done: { checkbox: true }
                            }
                        })
                    });

                    amountSynced++;
                }
            }
        });

        return NextResponse.json({ ok: true, amountSynced }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}