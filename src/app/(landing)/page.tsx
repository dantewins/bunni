import Hero from "@/components/landing/hero";
import Feature from "@/components/landing/feature";
import FAQ from "@/components/landing/faq";
import CTA from "@/components/landing/cta";
import Footer from "@/components/landing/footer";

export default function LandingPage() {
    return (
        <>
            <Hero />
            <Feature />
            <FAQ />
            <CTA />
            <Footer />
        </>
    );
}