import Balancer from "react-wrap-balancer";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Section, Container } from "@/components/ds";

export default function CTA() {
    return (
        <Section className="mt-40" id="cta">
            <Container className="flex flex-col gap-6">
                <Badge className="rounded-none w-fit text-sm sm:text-md p-1 px-2 sm:p-2 sm:px-4" variant="outline">
                    Explore
                </Badge>
                <div className="flex flex-col md:flex-row items-center gap-6 border bg-accent/50 py-8 px-5 sm:py-10 md:p-12">
                    <div className="w-full md:w-2/3 max-w-xl text-center md:text-left">
                        <h2 className="!mt-0 text-3xl sm:text-4xl font-bold">
                            Stay on top of every deadline
                        </h2>
                        <h3 className="mt-5 text-lg sm:text-xl font-light opacity-70">
                            <Balancer>
                                Link your Notion workspace and watch Bunni pull in all your
                                assignments, assessments, and due dates into one clear,
                                interactive calendar.
                            </Balancer>
                        </h3>
                    </div>
                    <div className="w-full md:w-1/3 flex justify-center lg:justify-end">
                        <Image
                            src="/logo.svg"
                            alt="Interactive calendar preview"
                            width={200}
                            height={200}
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>
            </Container>
        </Section>
    );
}