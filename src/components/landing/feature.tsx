import { JSX } from "react";
import { Section, Container } from "@/components/ds";
import Balancer from "react-wrap-balancer";
import Link from "next/link";
import { CalendarDays, ListChecks, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type FeatureText = {
    icon: JSX.Element;
    title: string;
    description: string;
    href?: string;
    cta?: string;
};

const featureText: FeatureText[] = [
    {
        icon: <CalendarDays className="h-6 w-6 text-primary" />,
        title: "Smart Calendar Sync",
        href: "/features/sync",
        description:
            "Connect your Notion workspace once, and Bunni automatically pulls in your assignments and assessments—no manual updates needed.",
        cta: "Learn More",
    },
    {
        icon: <ListChecks className="h-6 w-6 text-primary" />,
        title: "Flexible Weekly & Monthly Views",
        href: "/features/views",
        description:
            "Switch effortlessly between weekly and monthly layouts so you can plan ahead or zoom in on the details of your week.",
        cta: "Learn More",
    },
];

const singleFeatureText: FeatureText[] = [
    {
        icon: <Clock className="h-6 w-6 text-primary" />,
        title: "Today’s Highlights",
        href: "/features/today",
        description:
            "Bunni highlights everything due today right in the calendar, so you always know exactly what’s on your plate.",
        cta: "Learn More",
    },
];

const Feature = () => (
    <Section>
        <Container className="flex flex-col gap-6">
            <Badge className="rounded-none w-fit text-sm sm:text-md p-1 px-2 sm:p-2 sm:px-4" variant="outline">
                Features
            </Badge>
            <div className="flex flex-col gap-6">
                <h3 className="!mt-0 text-3xl sm:text-4xl font-bold">
                    <Balancer>
                        Plan smarter — never miss another deadline.
                    </Balancer>
                </h3>
                <h4 className="text-xl sm:text-2xl font-light opacity-70">
                    <Balancer>
                        Bunni turns your Notion pages into an organized, interactive calendar—so you can focus on getting things done.
                    </Balancer>
                </h4>
                <div className="mt-4 grid gap-6 md:mt-6 md:grid-cols-2">
                    {featureText.map(({ icon, title, description, href, cta }, i) => (
                        <Link
                            href={href!}
                            key={i}
                            className="flex flex-col justify-between gap-6 rounded-none border p-6 transition-all hover:-mt-1 hover:mb-1"
                        >
                            <div className="grid gap-4">
                                {icon}
                                <h4 className="text-xl sm:text-2xl font-semibold">{title}</h4>
                                <p className="text-md sm:text-lg opacity-75">{description}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                <div>
                    {singleFeatureText.map(({ icon, title, description, href, cta }, i) => (
                        <Link
                            href={href!}
                            key={i}
                            className="flex flex-col justify-between gap-6 border p-6 transition-all hover:-mt-1 hover:mb-1"
                        >
                            <div className="grid gap-4">
                                {icon}
                                <h4 className="text-xl sm:text-2xl font-semibold">{title}</h4>
                                <p className="text-md sm:text-l opacity-75">{description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </Container>
    </Section>
);

export default Feature;
