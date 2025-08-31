import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { withValidNotionToken, getAllNotionPages, createNotionPage } from "@/lib/notion"
import { prisma } from "@/lib/prisma"
import { getAllCanvas } from "@/lib/canvas"
import { GoogleGenerativeAI } from "@google/generative-ai"

function stripHtml(html: string) {
    return html.replace(/<[^>]*>?/gm, '');
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);

        const notionConn = await prisma.notionConnection.findUnique({
            where: { userId },
            select: { parentPageId: true, calendarDatabaseId: true },
        });
        if (!notionConn) {
            return NextResponse.json({ error: 'Missing Notion connection' }, { status: 401 });
        }

        const { calendarDatabaseId } = notionConn;

        if (!calendarDatabaseId) {
            return NextResponse.json({ error: 'Notion database not configured' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        await withValidNotionToken(userId!, async (token) => {
            const courses = await getAllCanvas(userId!, '/courses', 'enrollment_state=active');

            for (const course of courses) {
                if (!course.id || !course.name) continue;

                const assignments = await getAllCanvas(userId!, `/courses/${course.id}/assignments`);

                for (const ass of assignments) {
                    if (!ass.id || !ass.name) continue;

                    const existing = await getAllNotionPages(token, calendarDatabaseId, {
                        property: 'Source ID',
                        rich_text: { equals: `canvas:${ass.id}` },
                    });

                    if (existing.length > 0) continue;

                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const descText = ass.description ? stripHtml(ass.description) : '';
                    const prompt = `
                        Analyze the following assignment:

                        Course: ${course.name}

                        Name: ${ass.name}

                        Description: ${descText}

                        Submission types: ${ass.submission_types?.join(', ') || 'none'}

                        Due at: ${ass.due_at || 'no due date'}

                        Provide the following in JSON format only:

                        {
                            "name": "A concise title for the task, incorporating course if needed",
                            "description": "A short summary of the assignment, max 100 characters",
                            "subject": "The subject or category of the assignment",
                            "type": "The type of assignment, e.g., Quiz, Essay, Project, Homework, Exam"
                        }
                    `;
                    const result = await model.generateContent(prompt);
                    const aiText = result.response.text().trim();
                    let aiData;
                    try {
                        const jsonStr = aiText.replace(/^```json\n|\n```$/g, '');
                        aiData = JSON.parse(jsonStr);
                    } catch (e) {
                        console.error('Failed to parse AI response:', aiText);
                        // Fallback to basic values
                        aiData = {
                            name: `${course.name}: ${ass.name}`,
                            description: descText.slice(0, 200) + (descText.length > 200 ? '...' : ''),
                            subject: course.name,
                            type: ass.submission_types?.includes('online_quiz') ? 'Assessment' : 'Assignment'
                        };
                    }

                    const { name, description, subject, type } = aiData;

                    const dueDateProp = ass.due_at ? { date: { start: ass.due_at } } : { date: null };

                    const descriptionContent = [
                        { type: 'text', text: { content: description + '\n\n' } },
                        { type: 'text', text: { content: ass.html_url, link: { url: ass.html_url } } }
                    ];

                    await createNotionPage(token, calendarDatabaseId, {
                        Name: { title: [{ type: 'text', text: { content: name } }] },
                        'Due Date': dueDateProp,
                        Done: { checkbox: false },
                        Description: { rich_text: descriptionContent },
                        Subject: { select: { name: subject } },
                        'Source ID': { rich_text: [{ type: 'text', text: { content: `canvas:${ass.id}` } }] },
                        Type: { select: { name: type } },
                    });
                }
            }
        });

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}