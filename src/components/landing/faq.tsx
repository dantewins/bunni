import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Section, Container } from "@/components/ds";
import { Badge } from "@/components/ui/badge";

type FAQItem = {
    question: string;
    answer: string;
    link?: string;
    linkText?: string;
};

const faqs: FAQItem[] = [
    {
        question: "How do I connect my Notion workspace to Bunni?",
        answer:
            "Click “Connect Your Notion” in the header and authorize the Bunni integration. Once connected, we’ll automatically sync your assignments, assessments, and pages.",
        link: "/docs/integration",
        linkText: "View integration guide",
    },
    {
        question: "Which Notion databases does Bunni support?",
        answer:
            "Bunni supports any Notion database containing date‑based properties (e.g. due dates, start dates). Map one or more databases in Settings to include them in your calendar.",
        link: "/docs/databases",
        linkText: "See supported databases",
    },
    {
        question: "Can I switch between weekly and monthly views?",
        answer:
            "Yes! Use the view toggle in the top toolbar to seamlessly flip between a detailed weekly layout and a high‑level month overview.",
    },
    {
        question: "What happens when I add or update an assignment in Notion?",
        answer:
            "Bunni automatically detects changes and refreshes your calendar in near real‑time—no manual steps required.",
    },
    {
        question: "How is my data secured?",
        answer:
            "All communication is encrypted over HTTPS. We store your data encrypted at rest, request only read access to the pages you authorize, and never share your data with third parties.",
        link: "/docs/security",
        linkText: "Read about our security",
    },
    {
        question: "Which browsers are supported?",
        answer:
            "Bunni works flawlessly on all modern browsers, including Chrome, Firefox, Edge, and Safari (desktop and mobile).",
    },
];

const FAQ = () => (
    <Section className="mt-20 sm:mt-40" id="faq">
        <Container className="flex flex-col gap-6">
            <Badge className="rounded-none w-fit text-sm sm:text-md p-1 px-2 sm:p-2 sm:px-4" variant="outline">
                Frequently asked questions
            </Badge>
            <h3 className="!mt-0 text-3xl sm:text-4xl font-bold">
                Got questions? We’ve got answers.
            </h3>
            <h4 className="text-xl sm:text-2xl font-light opacity-70">
                Can’t find the answer you’re looking for? Reach out to our support team.
            </h4>
            <div className="mt-4 flex flex-col gap-4 sm:mt-6 divide-y divide-border border-b border-border">
                {faqs.map((item, idx) => (
                    <Accordion key={idx} type="single" collapsible>
                        <AccordionItem
                            value={item.question}
                            className="border bg-muted/20 px-4 transition-all hover:bg-muted/50"
                        >
                            <AccordionTrigger className="flex w-full items-center justify-between text-lg sm:text-xl font-medium">
                                {item.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-base text-md sm:text-lg">
                                <p>{item.answer}</p>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                ))}
            </div>
        </Container>
    </Section>
);

export default FAQ;
