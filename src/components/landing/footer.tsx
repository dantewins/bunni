import Link from "next/link";
import { Section, Container } from "@/components/ds";

export default function Footer() {
    return (
        <footer className="border-t mt-30">
            <Section>
                <Container className="grid gap-6">
                    <div className="grid gap-6">
                        <p className="text-lg">
                                Bunni syncs your Notion workspace into one clear, interactive
                                calendar — automatically pulling in assignments, assessments, and
                                due dates so you never miss a deadline.
                        </p>
                        <div className="mb-6 flex flex-col gap-4 text-sm text-muted-foreground underline underline-offset-4 md:mb-0 md:flex-row">
                            <Link href="#">Privacy Policy</Link>
                            <Link href="#">Terms of Service</Link>
                            <Link href="#">Cookie Policy</Link>
                        </div>

                        <p className="text-muted-foreground">
                            © {new Date().getFullYear()}{" "}
                            <Link href="/" className="font-semibold hover:underline">
                                Bunni
                            </Link>
                            . All rights reserved.
                        </p>
                    </div>
                </Container>
            </Section>
        </footer>
    );
}
